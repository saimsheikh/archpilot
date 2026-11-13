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
  /** Best match first; empty when even the best match is below the retriever's relevance floor. */
  search(query: string, limit: number): RankedPattern[];
}

/**
 * Sorts patterns by score. `minBestScore` applies to the top match only: if even the best
 * match is weak, nothing is returned; otherwise weaker runners-up stay in, because the
 * correct pattern is sometimes a low-scoring #2 or #3 that the model can still pick.
 */
export function rankByScore(
  patterns: readonly Pattern[],
  scores: readonly number[],
  limit: number,
  minBestScore = 0,
): RankedPattern[] {
  const ranked = patterns
    .map((pattern, index) => ({ pattern, score: scores[index] ?? 0 }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.pattern.meta.id.localeCompare(b.pattern.meta.id));
  const best = ranked[0];
  if (!best || best.score < minBestScore) return [];
  return ranked.slice(0, limit);
}
