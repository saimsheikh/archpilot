import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadPatterns } from "../../src/patterns/pattern-loader.js";
import { createRetriever, RETRIEVER_KINDS } from "../../src/services/retrieval/create-retriever.js";
import { evaluateRetriever, toMarkdown, type RetrievalCase } from "./evaluate.js";

const here = (file: string): string => fileURLToPath(new URL(file, import.meta.url));

const patterns = await loadPatterns();
const cases = JSON.parse(await readFile(here("./queries.json"), "utf8")) as RetrievalCase[];
const reports = RETRIEVER_KINDS.map((kind) =>
  evaluateRetriever(createRetriever(kind, patterns), cases),
);

await writeFile(here("./results.json"), `${JSON.stringify(reports, null, 2)}\n`);
await writeFile(here("./results.md"), toMarkdown(reports));
for (const r of reports) {
  console.log(
    `${r.retriever}: top-1 ${String(r.top1)}, top-3 ${String(r.top3)} (${String(r.cases)} cases)`,
  );
}
