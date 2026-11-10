import type { Pattern } from "../../patterns/pattern.js";

export interface RankedPattern {
  pattern: Pattern;
  score: number;
}

/**
 * Ranks patterns for a free-text project description. Implementations are swappable
 * (keyword, BM25, embeddings later) and compared by the retrieval eval.
 */
export interface PatternRetriever {
  readonly name: string;
  /** Best match first; patterns with no relevance are omitted. */
  search(query: string, limit: number): RankedPattern[];
}

export function rankByScore(
  patterns: readonly Pattern[],
  scores: readonly number[],
  limit: number,
): RankedPattern[] {
  return patterns
    .map((pattern, index) => ({ pattern, score: scores[index] ?? 0 }))
    .filter((ranked) => ranked.score > 0)
    .sort((a, b) => b.score - a.score || a.pattern.meta.id.localeCompare(b.pattern.meta.id))
    .slice(0, limit);
}
