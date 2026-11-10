import type { Pattern } from "../../patterns/pattern.js";
import { Bm25Retriever } from "./bm25-retriever.js";
import { KeywordTagRetriever } from "./keyword-retriever.js";
import type { PatternRetriever } from "./pattern-retriever.js";

export const RETRIEVER_KINDS = ["bm25", "keyword"] as const;
export type RetrieverKind = (typeof RETRIEVER_KINDS)[number];

export function isRetrieverKind(value: string | undefined): value is RetrieverKind {
  return RETRIEVER_KINDS.some((kind) => kind === value);
}

export function createRetriever(
  kind: RetrieverKind,
  patterns: readonly Pattern[],
): PatternRetriever {
  return kind === "bm25" ? new Bm25Retriever(patterns) : new KeywordTagRetriever(patterns);
}
