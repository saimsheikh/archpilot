import { mkdir } from "node:fs/promises";
import type { DiagramRenderer } from "../../src/renderers/diagram-renderer.js";
import { ArchitectureService } from "../../src/services/architecture-service.js";
import { DiagramService } from "../../src/services/diagram-service.js";
import { extractJson, extractMermaid } from "./extract.js";
import type { ModelClient } from "./model-client.js";
import {
  archpilotPrompt,
  baselinePrompt,
  fixJsonPrompt,
  planSchema,
  repairPrompt,
  simplifyPrompt,
  type Idea,
  type Plan,
  type PlanningContext,
} from "./prompts.js";
import { rubricTotal, scoreRubric, type RubricScores } from "./rubric.js";

export const MAX_REPAIRS = 3;

export interface DiagramOutcome {
  firstPassOk: boolean;
  finalOk: boolean;
  repairAttempts: number;
  simplified: boolean;
  errorCodes: string[];
  /** Total time spent validating/rendering this idea's diagram. */
  renderMs: number;
}

export interface ConditionResult {
  ideaId: string;
  condition: "archpilot" | "baseline";
  diagram: DiagramOutcome;
  rubric: RubricScores;
  rubricTotal: number;
  /** Set when the model or harness failed before producing a usable answer. */
  failure?: string;
}

const NO_DIAGRAM: DiagramOutcome = {
  firstPassOk: false,
  finalOk: false,
  repairAttempts: 0,
  simplified: false,
  errorCodes: ["NO_DIAGRAM"],
  renderMs: 0,
};

async function timed<T>(work: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const start = performance.now();
  const value = await work();
  return { value, ms: Math.round(performance.now() - start) };
}

/** Text the model wrote, excluding enum values (risk categories) that would inflate the rubric. */
export function authoredText(plan: Plan): string {
  const { risks, ...rest } = plan.architecture;
  const riskText = risks.map((risk) => `${risk.risk} ${risk.mitigation}`);
  return [JSON.stringify(rest), ...riskText].join("\n");
}

export class EvalConditions {
  constructor(
    private readonly model: ModelClient,
    private readonly renderer: DiagramRenderer,
  ) {}

  /** Plain prompt, one render attempt, no repair. */
  async baseline(idea: Idea): Promise<ConditionResult> {
    const response = await this.model.complete(`${idea.id}/baseline`, baselinePrompt(idea));
    const rubric = scoreRubric(response);
    const source = extractMermaid(response);
    const diagram = source ? await this.singleAttempt(source) : NO_DIAGRAM;
    return {
      ideaId: idea.id,
      condition: "baseline",
      diagram,
      rubric,
      rubricTotal: rubricTotal(rubric),
    };
  }

  /** Skill-style flow: structured plan, validate + repair loop, then render and export. */
  async archpilot(idea: Idea, context: PlanningContext, outDir: string): Promise<ConditionResult> {
    const plan = await this.requestPlan(idea, context);
    if (typeof plan === "string") {
      const rubric = scoreRubric("");
      return {
        ideaId: idea.id,
        condition: "archpilot",
        diagram: NO_DIAGRAM,
        rubric,
        rubricTotal: 0,
        failure: plan,
      };
    }
    const { source, outcome } = await this.repairLoop(idea, plan.mermaid);
    await this.writeArtifacts(plan, source, outcome.finalOk, outDir);
    const rubric = scoreRubric(authoredText(plan));
    return {
      ideaId: idea.id,
      condition: "archpilot",
      diagram: outcome,
      rubric,
      rubricTotal: rubricTotal(rubric),
    };
  }

  private async singleAttempt(source: string): Promise<DiagramOutcome> {
    const { value, ms } = await timed(() => this.renderer.validate(source));
    return {
      firstPassOk: value.ok,
      finalOk: value.ok,
      repairAttempts: 0,
      simplified: false,
      errorCodes: value.ok ? [] : [value.error.code],
      renderMs: ms,
    };
  }

  /** Returns the plan, or a failure description. One JSON fix-up is allowed, like a tool schema retry. */
  private async requestPlan(idea: Idea, context: PlanningContext): Promise<Plan | string> {
    let response = await this.model.complete(
      `${idea.id}/archpilot-plan`,
      archpilotPrompt(idea, context),
    );
    for (let attempt = 0; ; attempt++) {
      const parsed = planSchema.safeParse(extractJson(response));
      if (parsed.success) return parsed.data;
      const problem = parsed.error.issues
        .slice(0, 5)
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      if (attempt >= 1) return `invalid plan JSON: ${problem}`;
      response = await this.model.complete(
        `${idea.id}/archpilot-plan-fix`,
        fixJsonPrompt(response, problem),
      );
    }
  }

  private async repairLoop(
    idea: Idea,
    initial: string,
  ): Promise<{ source: string; outcome: DiagramOutcome }> {
    let source = initial;
    let renderMs = 0;
    const errorCodes: string[] = [];
    let firstPassOk = false;

    for (let attempt = 0; attempt <= MAX_REPAIRS + 1; attempt++) {
      const { value, ms } = await timed(() => this.renderer.validate(source));
      renderMs += ms;
      if (attempt === 0) firstPassOk = value.ok;
      if (value.ok) {
        const repairs = Math.min(attempt, MAX_REPAIRS);
        return {
          source,
          outcome: {
            firstPassOk,
            finalOk: true,
            repairAttempts: repairs,
            simplified: attempt > MAX_REPAIRS,
            errorCodes,
            renderMs,
          },
        };
      }
      errorCodes.push(value.error.code);
      if (attempt > MAX_REPAIRS) break;
      // After MAX_REPAIRS targeted fixes, ask once for the simplest possible diagram.
      const prompt =
        attempt < MAX_REPAIRS ? repairPrompt(source, value.error) : simplifyPrompt(source);
      const key =
        attempt < MAX_REPAIRS ? `archpilot-repair-${String(attempt + 1)}` : "archpilot-simplify";
      source = extractMermaid(await this.model.complete(`${idea.id}/${key}`, prompt)) ?? source;
    }
    return {
      source,
      outcome: {
        firstPassOk,
        finalOk: false,
        repairAttempts: MAX_REPAIRS,
        simplified: true,
        errorCodes,
        renderMs,
      },
    };
  }

  private async writeArtifacts(
    plan: Plan,
    source: string,
    renderable: boolean,
    outDir: string,
  ): Promise<void> {
    await mkdir(outDir, { recursive: true });
    const diagramPath = "docs/architecture/diagram.svg";
    if (renderable) {
      await new DiagramService(this.renderer, outDir).render({
        source,
        format: "svg",
        outputPath: diagramPath,
      });
    }
    const doc = {
      ...plan.architecture,
      mermaidSource: source,
      ...(renderable ? { diagramPath } : {}),
    };
    await new ArchitectureService(outDir).export(doc, "ARCHITECTURE.md");
  }
}
