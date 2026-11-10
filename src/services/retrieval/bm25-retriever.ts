import type { Pattern } from "../../patterns/pattern.js";
import { rankByScore, type PatternRetriever, type RankedPattern } from "./pattern-retriever.js";
import { tokenize } from "./tokenize.js";

// Standard Okapi BM25 parameters.
const K1 = 1.2;
const B = 0.75;

interface Document {
  termCounts: Map<string, number>;
  length: number;
}

function fullText(pattern: Pattern): string {
  const { meta } = pattern;
  return [
    meta.name,
    meta.tags.join(" "),
    meta.when_to_use.join(" "),
    meta.components.join(" "),
    meta.failure_modes.join(" "),
    pattern.body,
  ].join("\n");
}

function toDocument(text: string): Document {
  const termCounts = new Map<string, number>();
  const tokens = tokenize(text);
  for (const token of tokens) termCounts.set(token, (termCounts.get(token) ?? 0) + 1);
  return { termCounts, length: tokens.length };
}

/** BM25 over each pattern's full text (metadata + body). */
export class Bm25Retriever implements PatternRetriever {
  readonly name = "bm25";
  private readonly documents: Document[];
  private readonly averageLength: number;
  private readonly idf = new Map<string, number>();

  constructor(private readonly patterns: readonly Pattern[]) {
    this.documents = patterns.map((pattern) => toDocument(fullText(pattern)));
    const total = this.documents.reduce((sum, doc) => sum + doc.length, 0);
    this.averageLength = total / Math.max(1, this.documents.length);
    this.computeIdf();
  }

  search(query: string, limit: number): RankedPattern[] {
    const queryTokens = new Set(tokenize(query));
    const scores = this.documents.map((doc) => this.score(doc, queryTokens));
    return rankByScore(this.patterns, scores, limit);
  }

  private computeIdf(): void {
    const documentFrequency = new Map<string, number>();
    for (const doc of this.documents) {
      for (const term of doc.termCounts.keys()) {
        documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
      }
    }
    const n = this.documents.length;
    for (const [term, df] of documentFrequency) {
      this.idf.set(term, Math.log(1 + (n - df + 0.5) / (df + 0.5)));
    }
  }

  private score(doc: Document, queryTokens: Set<string>): number {
    let score = 0;
    for (const token of queryTokens) {
      const frequency = doc.termCounts.get(token);
      if (!frequency) continue;
      const lengthNorm = 1 - B + (B * doc.length) / this.averageLength;
      score += ((this.idf.get(token) ?? 0) * frequency * (K1 + 1)) / (frequency + K1 * lengthNorm);
    }
    return score;
  }
}
