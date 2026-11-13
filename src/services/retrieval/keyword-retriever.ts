import type { Pattern } from "../../patterns/pattern.js";
import { rankByScore, type PatternRetriever, type RankedPattern } from "./pattern-retriever.js";
import { tokenize } from "./tokenize.js";

interface WeightedField {
  weight: number;
  tokens: Set<string>;
}

// Tags and names are curated, so a hit there is stronger evidence than a word in a list.
function fieldsOf(pattern: Pattern): WeightedField[] {
  const { meta } = pattern;
  const field = (weight: number, values: readonly string[]): WeightedField => ({
    weight,
    tokens: new Set(tokenize(values.join(" "))),
  });
  return [
    field(3, meta.tags),
    field(3, [meta.name]),
    field(2, meta.when_to_use),
    field(1, meta.components),
  ];
}

// If the best match scores below this, it rests on one or two incidental words (e.g. a single tag hit). Calibrated
// on the retrieval queries and eval ideas: every correct top match scored 6 or more, while
// the weakest poor fit scored 4. It applies to the best match only and does not catch every
// poor fit, so the skill and harness show several candidates and let the model reject them.
export const KEYWORD_MIN_SCORE = 5;

/** Sums field weights for each distinct query token found in a pattern's metadata. */
export class KeywordTagRetriever implements PatternRetriever {
  readonly name = "keyword+tags";
  private readonly indexed: { pattern: Pattern; fields: WeightedField[] }[];

  constructor(private readonly patterns: readonly Pattern[]) {
    this.indexed = patterns.map((pattern) => ({ pattern, fields: fieldsOf(pattern) }));
  }

  search(query: string, limit: number): RankedPattern[] {
    const queryTokens = new Set(tokenize(query));
    const scores = this.indexed.map(({ fields }) => {
      let score = 0;
      for (const token of queryTokens) {
        for (const field of fields) if (field.tokens.has(token)) score += field.weight;
      }
      return score;
    });
    return rankByScore(this.patterns, scores, limit, KEYWORD_MIN_SCORE);
  }
}
