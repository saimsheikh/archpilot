import type { ConditionResult } from "./conditions.js";
import { RUBRIC_CRITERIA } from "./rubric.js";

export interface ConditionSummary {
  condition: string;
  ideas: number;
  failures: number;
  firstPassRenderRate: number;
  finalRenderRate: number;
  averageRepairAttempts: number;
  averageRenderMs: number;
  /** Mean rubric score out of RUBRIC_CRITERIA.length. */
  averageRubric: number;
  criterionRates: Record<string, number>;
}

const round = (value: number, digits = 2): number => Number(value.toFixed(digits));
const mean = (values: readonly number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
const rate = (results: readonly ConditionResult[], test: (r: ConditionResult) => boolean): number =>
  round(mean(results.map((r) => (test(r) ? 1 : 0))));

export function summarize(
  condition: string,
  results: readonly ConditionResult[],
): ConditionSummary {
  const criterionRates = Object.fromEntries(
    RUBRIC_CRITERIA.map((criterion) => [
      criterion,
      rate(results, (r) => r.rubric[criterion] === 1),
    ]),
  );
  return {
    condition,
    ideas: results.length,
    failures: results.filter((r) => r.failure).length,
    firstPassRenderRate: rate(results, (r) => r.diagram.firstPassOk),
    finalRenderRate: rate(results, (r) => r.diagram.finalOk),
    averageRepairAttempts: round(mean(results.map((r) => r.diagram.repairAttempts))),
    averageRenderMs: Math.round(mean(results.map((r) => r.diagram.renderMs))),
    averageRubric: round(mean(results.map((r) => r.rubricTotal))),
    criterionRates,
  };
}

const pct = (value: number): string => `${String(Math.round(value * 100))}%`;

export function toMarkdown(
  meta: { model: string; runId: string },
  summaries: readonly ConditionSummary[],
  results: readonly ConditionResult[],
): string {
  const header = `| Metric | ${summaries.map((s) => s.condition).join(" | ")} |`;
  const divider = `| --- | ${summaries.map(() => "---").join(" | ")} |`;
  const row = (label: string, value: (s: ConditionSummary) => string): string =>
    `| ${label} | ${summaries.map(value).join(" | ")} |`;

  const perIdea = results.map((r) => {
    const d = r.diagram;
    const codes = d.errorCodes.length > 0 ? d.errorCodes.join(", ") : "none";
    const status = r.failure
      ? `failed: ${r.failure.slice(0, 80)}`
      : d.finalOk
        ? "rendered"
        : "not rendered";
    return `| ${r.ideaId} | ${r.condition} | ${d.firstPassOk ? "yes" : "no"} | ${status} | ${String(d.repairAttempts)} | ${codes} | ${String(r.rubricTotal)}/${String(RUBRIC_CRITERIA.length)} |`;
  });

  return [
    "# Eval results",
    "",
    `Model: \`${meta.model}\` · run: \`${meta.runId}\``,
    "",
    header,
    divider,
    row("Ideas", (s) => String(s.ideas)),
    row("Model/harness failures", (s) => String(s.failures)),
    row("First-pass render success", (s) => pct(s.firstPassRenderRate)),
    row("Render success after repair loop", (s) => pct(s.finalRenderRate)),
    row("Avg repair attempts", (s) => String(s.averageRepairAttempts)),
    row("Avg render time (ms)", (s) => String(s.averageRenderMs)),
    row(`Avg rubric score (/${String(RUBRIC_CRITERIA.length)})`, (s) => String(s.averageRubric)),
    ...RUBRIC_CRITERIA.map((criterion) =>
      row(`Mentions ${criterion}`, (s) => pct(s.criterionRates[criterion] ?? 0)),
    ),
    "",
    "## Per idea",
    "",
    "| Idea | Condition | First pass | Final | Repairs | Error codes | Rubric |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...perIdea,
    "",
    "## How to read this",
    "",
    '- **baseline**: one plain prompt ("Draw me an architecture diagram ... Use Mermaid"), rendered',
    "  once, no repair. **archpilot**: the skill's flow run non-interactively (pattern retrieval,",
    "  concern checklist, pre-mortem, structured output, validate + up to 3 repairs, then simplify).",
    "- The baseline has no repair loop by design, so its two render rates are equal.",
    "- The rubric is keyword evidence that a topic is *mentioned* in model-written text (risk",
    "  category labels excluded). It does not judge whether the design is good.",
    "- The archpilot prompt includes a checklist naming these topics, so a higher rubric score",
    "  partly reflects that the method asks for them. That is the point of the method, but it",
    "  is not an independent quality judgment.",
    "- No interview happens in the eval: the model is told to assume defaults.",
    "- 10 ideas and one run per idea: small sample, expect run-to-run variance.",
    "",
  ].join("\n");
}
