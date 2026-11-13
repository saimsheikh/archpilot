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

export interface PatternListing {
  patterns: PatternSummary[];
  /** Present for queries: how to use the ranking. */
  note?: string;
}

export const NO_MATCH_NOTE =
  "No reference architecture matches this project strongly. Design from first principles.";
export const JUDGE_FIT_NOTE =
  "Ranked by keyword overlap, not by fit. Compare whenToUse with the project, pick the one that genuinely fits, or none if they do not.";

export class PatternService {
  private readonly byId: ReadonlyMap<string, Pattern>;

  constructor(
    private readonly patterns: readonly Pattern[],
    private readonly retriever: PatternRetriever,
  ) {
    this.byId = new Map(patterns.map((pattern) => [pattern.meta.id, pattern]));
  }

  /**
   * All patterns, or the best matches for `query` ranked by the retriever. Ranking is a
   * keyword heuristic, so the note tells the model to judge fit itself rather than trust #1.
   */
  list(query: string | undefined, limit: number): Result<PatternListing> {
    if (!query?.trim()) return ok({ patterns: this.patterns.map(summarize).slice(0, limit) });
    const ranked = this.retriever.search(query, limit);
    return ok({
      patterns: ranked.map(({ pattern, score }) => ({
        ...summarize(pattern),
        score: Number(score.toFixed(3)),
      })),
      note: ranked.length === 0 ? NO_MATCH_NOTE : JUDGE_FIT_NOTE,
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
