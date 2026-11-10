import type { Pattern } from "../patterns/pattern.js";
import { fail, ok, type Result } from "../shared/result.js";
import type { PatternRetriever } from "./retrieval/pattern-retriever.js";

export interface PatternSummary {
  id: string;
  name: string;
  whenToUse: string[];
  scaleRange: string;
  tags: string[];
  score?: number;
}

export interface PatternDetail extends PatternSummary {
  components: string[];
  failureModes: string[];
  costDrivers: string[];
  mermaid: string;
  markdown: string;
}

function summarize(pattern: Pattern): PatternSummary {
  const { meta } = pattern;
  return {
    id: meta.id,
    name: meta.name,
    whenToUse: meta.when_to_use,
    scaleRange: meta.scale_range,
    tags: meta.tags,
  };
}

export class PatternService {
  private readonly byId: ReadonlyMap<string, Pattern>;

  constructor(
    private readonly patterns: readonly Pattern[],
    private readonly retriever: PatternRetriever,
  ) {
    this.byId = new Map(patterns.map((pattern) => [pattern.meta.id, pattern]));
  }

  /** All patterns, or the best matches for `query` ranked by the retriever. */
  list(query: string | undefined, limit: number): Result<{ patterns: PatternSummary[] }> {
    if (!query?.trim()) return ok({ patterns: this.patterns.map(summarize).slice(0, limit) });
    const ranked = this.retriever.search(query, limit);
    return ok({
      patterns: ranked.map(({ pattern, score }) => ({
        ...summarize(pattern),
        score: Number(score.toFixed(3)),
      })),
    });
  }

  get(id: string): Result<PatternDetail> {
    const pattern = this.byId.get(id);
    if (!pattern) {
      return fail({
        code: "PATTERN_NOT_FOUND",
        message: `No pattern with id '${id}'.`,
        hint: `Known ids: ${[...this.byId.keys()].join(", ")}`,
      });
    }
    const { meta } = pattern;
    return ok({
      ...summarize(pattern),
      components: meta.components,
      failureModes: meta.failure_modes,
      costDrivers: meta.cost_drivers,
      mermaid: pattern.mermaid,
      markdown: pattern.body,
    });
  }
}
