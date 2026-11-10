import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { authoredText, EvalConditions } from "../../evals/harness/conditions.js";
import { extractJson, extractMermaid } from "../../evals/harness/extract.js";
import type { ModelClient } from "../../evals/harness/model-client.js";
import type { Idea, PlanningContext } from "../../evals/harness/prompts.js";
import { summarize, toMarkdown } from "../../evals/harness/report.js";
import { rubricTotal, scoreRubric } from "../../evals/harness/rubric.js";
import type { DiagramError, DiagramRenderer } from "../../src/renderers/diagram-renderer.js";
import { fail, ok } from "../../src/shared/result.js";
import { makeProject } from "../helpers/project.js";
import { SAMPLE_ARCHITECTURE } from "../helpers/sample-architecture.js";

const IDEA: Idea = { id: "demo", kind: "SaaS", description: "A recipe app" };
const CONTEXT: PlanningContext = {
  patternMarkdown: undefined,
  forgottenConcerns: "",
  premortemGuide: "",
};
const BAD: DiagramError = { code: "BAD_ARROW", message: "bad", line: 2, hint: "use -->" };

/** Answers by key prefix and records which keys were called. */
class ScriptedModel implements ModelClient {
  readonly keys: string[] = [];
  constructor(private readonly answers: Record<string, string>) {}
  complete(key: string): Promise<string> {
    this.keys.push(key);
    const match = Object.keys(this.answers).find((prefix) => key.endsWith(prefix));
    return Promise.resolve(match ? (this.answers[match] ?? "") : "");
  }
}

/** Only diagrams containing "GOOD" validate. */
const renderer: DiagramRenderer = {
  validate: (source) =>
    Promise.resolve(source.includes("GOOD") ? ok({ diagramType: "flowchart" }) : fail(BAD)),
  render: (source, format) =>
    Promise.resolve(
      source.includes("GOOD") ? ok({ format, data: Buffer.from("<svg/>") }) : fail(BAD),
    ),
};

const mermaid = (body: string): string => `\`\`\`mermaid\nflowchart TD\n  ${body}\n\`\`\``;
const planJson = (diagram: string): string =>
  `\`\`\`json\n${JSON.stringify({ mermaid: diagram, architecture: SAMPLE_ARCHITECTURE })}\n\`\`\``;

describe("extract", () => {
  it("finds mermaid and JSON in model responses", () => {
    expect(extractMermaid(`Here:\n${mermaid("a --> b")}`)).toBe("flowchart TD\n  a --> b");
    expect(extractJson('Sure! {"a": 1} hope it helps')).toEqual({ a: 1 });
    expect(extractJson("no json here")).toBeUndefined();
  });
});

describe("rubric", () => {
  it("scores each concern 0/1 from keyword evidence", () => {
    const scores = scoreRubric(
      "Users log in with SSO; data lives in Postgres; retries with backoff.",
    );
    expect(scores).toMatchObject({ auth: 1, dataStore: 1, failureHandling: 1, observability: 0 });
    expect(rubricTotal(scoreRubric("A box and an arrow."))).toBe(0);
  });

  it("ignores risk category labels when scoring archpilot output", () => {
    const plan = {
      mermaid: "x",
      architecture: {
        ...SAMPLE_ARCHITECTURE,
        dataFlow: [],
        openQuestions: [],
        risks: [
          {
            risk: "slow",
            category: "cost" as const,
            likelihood: "low" as const,
            mitigation: "index",
          },
        ],
        decisions: [{ decision: "d", rationale: "r", tradeoffs: "t", alternativesRejected: [] }],
      },
    };
    expect(scoreRubric(authoredText(plan)).cost).toBe(0);
  });
});

describe("baseline condition", () => {
  it("renders once with no repair", async () => {
    const model = new ScriptedModel({ baseline: mermaid("a -> b") });
    const result = await new EvalConditions(model, renderer).baseline(IDEA);
    expect(result.diagram).toMatchObject({ firstPassOk: false, finalOk: false, repairAttempts: 0 });
    expect(model.keys).toEqual(["demo/baseline"]);
  });

  it("records a missing diagram", async () => {
    const result = await new EvalConditions(
      new ScriptedModel({ baseline: "prose only" }),
      renderer,
    ).baseline(IDEA);
    expect(result.diagram.errorCodes).toEqual(["NO_DIAGRAM"]);
  });
});

describe("archpilot condition", () => {
  it("passes first time and writes ARCHITECTURE.md plus the diagram", async () => {
    const dir = await makeProject();
    const model = new ScriptedModel({ "archpilot-plan": planJson("flowchart TD\n GOOD") });
    const result = await new EvalConditions(model, renderer).archpilot(IDEA, CONTEXT, dir);
    expect(result.diagram).toMatchObject({ firstPassOk: true, finalOk: true, repairAttempts: 0 });
    expect(await readFile(join(dir, "ARCHITECTURE.md"), "utf8")).toContain("# Recipe Box");
    expect(await readFile(join(dir, "docs/architecture/diagram.svg"), "utf8")).toBe("<svg/>");
  });

  it("repairs from the structured error", async () => {
    const model = new ScriptedModel({
      "archpilot-plan": planJson("flowchart TD\n a -> b"),
      "archpilot-repair-1": mermaid("GOOD"),
    });
    const result = await new EvalConditions(model, renderer).archpilot(
      IDEA,
      CONTEXT,
      await makeProject(),
    );
    expect(result.diagram).toMatchObject({
      firstPassOk: false,
      finalOk: true,
      repairAttempts: 1,
      simplified: false,
    });
    expect(result.diagram.errorCodes).toEqual(["BAD_ARROW"]);
  });

  it("simplifies after 3 failed repairs, and gives up after that", async () => {
    const simplifies = new ScriptedModel({
      "archpilot-plan": planJson("bad"),
      "archpilot-simplify": mermaid("GOOD"),
    });
    const saved = await new EvalConditions(simplifies, renderer).archpilot(
      IDEA,
      CONTEXT,
      await makeProject(),
    );
    expect(saved.diagram).toMatchObject({ finalOk: true, repairAttempts: 3, simplified: true });
    expect(simplifies.keys.filter((key) => key.includes("repair"))).toHaveLength(3);

    const hopeless = new ScriptedModel({ "archpilot-plan": planJson("bad") });
    const lost = await new EvalConditions(hopeless, renderer).archpilot(
      IDEA,
      CONTEXT,
      await makeProject(),
    );
    expect(lost.diagram).toMatchObject({ finalOk: false, repairAttempts: 3, simplified: true });
    expect(lost.diagram.errorCodes).toHaveLength(5);
  });

  it("allows one JSON fix-up, then reports the failure honestly", async () => {
    const fixed = new ScriptedModel({
      "archpilot-plan": "not json",
      "archpilot-plan-fix": planJson("GOOD"),
    });
    const ok1 = await new EvalConditions(fixed, renderer).archpilot(
      IDEA,
      CONTEXT,
      await makeProject(),
    );
    expect(ok1.failure).toBeUndefined();

    const broken = new ScriptedModel({ "archpilot-plan": "not json" });
    const failed = await new EvalConditions(broken, renderer).archpilot(
      IDEA,
      CONTEXT,
      await makeProject(),
    );
    expect(failed.failure).toMatch(/invalid plan JSON/);
    expect(failed.rubricTotal).toBe(0);
  });
});

describe("report", () => {
  it("summarizes rates and renders a markdown table", async () => {
    const model = new ScriptedModel({ baseline: mermaid("GOOD auth postgres") });
    const result = await new EvalConditions(model, renderer).baseline(IDEA);
    const summary = summarize("baseline", [result]);
    expect(summary).toMatchObject({ ideas: 1, firstPassRenderRate: 1, finalRenderRate: 1 });
    const markdown = toMarkdown({ model: "test", runId: "r1" }, [summary], [result]);
    expect(markdown).toContain("| First-pass render success | 100% |");
    expect(markdown).toContain("## How to read this");
  });
});
