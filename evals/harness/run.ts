import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { loadPatterns } from "../../src/patterns/pattern-loader.js";
import { MermaidRenderer } from "../../src/renderers/mermaid/mermaid-renderer.js";
import { KeywordTagRetriever } from "../../src/services/retrieval/keyword-retriever.js";
import { Semaphore } from "../../src/shared/semaphore.js";
import { EvalConditions, type ConditionResult } from "./conditions.js";
import {
  ClaudeCliClient,
  RecordingClient,
  ReplayClient,
  type ModelClient,
} from "./model-client.js";
import type { Idea, PlanningContext } from "./prompts.js";
import { summarize, toMarkdown } from "./report.js";
import { scoreRubric } from "./rubric.js";

const root = (path: string): string => fileURLToPath(new URL(`../../${path}`, import.meta.url));

const { values } = parseArgs({
  options: {
    model: { type: "string", default: "sonnet" },
    replay: { type: "string" },
    only: { type: "string" },
    limit: { type: "string" },
    concurrency: { type: "string", default: "3" },
  },
});

const runId = values.replay
  ? `replay-${new Date().toISOString().replace(/[:.]/g, "-")}`
  : new Date().toISOString().replace(/[:.]/g, "-");
const recordingsDir = values.replay ?? join(root("evals/runs"), runId, "recordings");
const outputsDir = join(root("evals/runs"), runId, "outputs");

const model: ModelClient = values.replay
  ? new ReplayClient(values.replay)
  : new RecordingClient(new ClaudeCliClient(values.model), recordingsDir);

const allIdeas = JSON.parse(await readFile(root("evals/ideas.json"), "utf8")) as Idea[];
const ideas = allIdeas
  .filter((idea) => !values.only || idea.id === values.only)
  // A replay only covers the ideas that were recorded.
  .filter((idea) => !values.replay || existsSync(join(values.replay, idea.id)))
  .slice(0, values.limit ? Number(values.limit) : undefined);

const patterns = await loadPatterns();
const retriever = new KeywordTagRetriever(patterns);
const references = (file: string): Promise<string> =>
  readFile(root(`skills/archpilot/references/${file}`), "utf8");
const forgottenConcerns = await references("forgotten-concerns.md");
const premortemGuide = await references("premortem.md");

function contextFor(idea: Idea): PlanningContext {
  const candidates = retriever.search(idea.description, 3).map((ranked) => ranked.pattern.body);
  return { candidatePatterns: candidates, forgottenConcerns, premortemGuide };
}

const conditions = new EvalConditions(
  model,
  new MermaidRenderer({
    maxConcurrentRenders: 2,
    puppeteerConfigPath: process.env.ARCHPILOT_PUPPETEER_CONFIG,
  }),
);
const slots = new Semaphore(Number(values.concurrency));

async function guarded(
  idea: Idea,
  condition: "archpilot" | "baseline",
  work: () => Promise<ConditionResult>,
): Promise<ConditionResult> {
  try {
    return await work();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${idea.id}/${condition}] failed: ${message}`);
    return {
      ideaId: idea.id,
      condition,
      diagram: {
        firstPassOk: false,
        finalOk: false,
        repairAttempts: 0,
        simplified: false,
        errorCodes: [],
        renderMs: 0,
      },
      rubric: scoreRubric(""),
      rubricTotal: 0,
      failure: message,
    };
  }
}

const perIdea = await Promise.all(
  ideas.map((idea) =>
    slots.run(async () => {
      console.error(`running ${idea.id}`);
      const [archpilot, baseline] = await Promise.all([
        guarded(idea, "archpilot", () =>
          conditions.archpilot(idea, contextFor(idea), join(outputsDir, idea.id)),
        ),
        guarded(idea, "baseline", () => conditions.baseline(idea)),
      ]);
      return [archpilot, baseline];
    }),
  ),
);
const results = perIdea.flat();
const summaries = ["archpilot", "baseline"].map((condition) =>
  summarize(
    condition,
    results.filter((r) => r.condition === condition),
  ),
);

const report = {
  runId,
  model: values.replay ? `replay of ${values.replay}` : values.model,
  summaries,
  results,
};
const markdown = toMarkdown({ model: report.model, runId }, summaries, results);
await mkdir(root("evals/results"), { recursive: true });
await mkdir(join(root("evals/runs"), runId), { recursive: true });
for (const dir of [root("evals/results"), join(root("evals/runs"), runId)]) {
  await writeFile(join(dir, "results.json"), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(join(dir, "results.md"), markdown);
}
console.log(markdown);
