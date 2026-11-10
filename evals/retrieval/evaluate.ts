import type { PatternRetriever } from "../../src/services/retrieval/pattern-retriever.js";

export interface RetrievalCase {
  query: string;
  expected: string;
}

export interface RetrievalMiss {
  query: string;
  expected: string;
  got: string[];
}

export interface RetrievalReport {
  retriever: string;
  cases: number;
  top1: number;
  top3: number;
  misses: RetrievalMiss[];
}

/** Top-1 / top-3 accuracy of a retriever over labeled cases; misses are kept for inspection. */
export function evaluateRetriever(
  retriever: PatternRetriever,
  cases: readonly RetrievalCase[],
): RetrievalReport {
  let top1 = 0;
  let top3 = 0;
  const misses: RetrievalMiss[] = [];
  for (const { query, expected } of cases) {
    const ids = retriever.search(query, 3).map((ranked) => ranked.pattern.meta.id);
    if (ids[0] === expected) top1++;
    if (ids.includes(expected)) top3++;
    if (ids[0] !== expected) misses.push({ query, expected, got: ids });
  }
  const ratio = (hits: number): number => Number((hits / Math.max(1, cases.length)).toFixed(3));
  return {
    retriever: retriever.name,
    cases: cases.length,
    top1: ratio(top1),
    top3: ratio(top3),
    misses,
  };
}

export function toMarkdown(reports: readonly RetrievalReport[]): string {
  const percent = (value: number): string => `${(value * 100).toFixed(0)}%`;
  const rows = reports.map(
    (r) => `| ${r.retriever} | ${String(r.cases)} | ${percent(r.top1)} | ${percent(r.top3)} |`,
  );
  const misses = reports.flatMap((r) =>
    r.misses.map(
      (m) =>
        `- **${r.retriever}**: "${m.query}" expected \`${m.expected}\`, got ${m.got.map((id) => `\`${id}\``).join(", ") || "nothing"}`,
    ),
  );
  return [
    "# Retrieval eval results",
    "",
    "| Retriever | Cases | Top-1 | Top-3 |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
    "## Top-1 misses (with the top 3 returned)",
    "",
    misses.length > 0 ? misses.join("\n") : "_None._",
    "",
  ].join("\n");
}
