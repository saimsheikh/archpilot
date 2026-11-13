import { describe, expect, it } from "vitest";
import { loadPatterns } from "../../src/patterns/pattern-loader.js";
import {
  JUDGE_FIT_NOTE,
  NO_MATCH_NOTE,
  PatternService,
} from "../../src/services/pattern-service.js";
import {
  KEYWORD_MIN_SCORE,
  KeywordTagRetriever,
} from "../../src/services/retrieval/keyword-retriever.js";

const patterns = await loadPatterns();
const service = new PatternService(patterns, new KeywordTagRetriever(patterns));

describe("keyword relevance floor", () => {
  const retriever = new KeywordTagRetriever(patterns);

  it("returns nothing when even the best match is weak", () => {
    // "crud" only hits one tag on internal-admin-tool (3 points), which is below the floor.
    expect(retriever.search("a crud screen", 3)).toEqual([]);
  });

  it("keeps weak runners-up when the best match is strong", () => {
    // The correct pattern here is a low-scoring #2; the model must still get to see it.
    const query =
      "Ingest IoT sensor readings from devices and fan them out to alerting, storage and billing consumers";
    const kept = retriever
      .search(query, 3)
      .find((r) => r.pattern.meta.id === "event-driven-pipeline");
    expect(kept?.score).toBeLessThan(KEYWORD_MIN_SCORE);
  });
});

describe("PatternService.list", () => {
  it("tells the model to judge fit when there are candidates", () => {
    const result = service.list("two-sided marketplace for tutors with payouts", 3);
    expect(result.ok && result.value.note).toBe(JUDGE_FIT_NOTE);
    expect(result.ok && result.value.patterns[0]?.id).toBe("marketplace");
  });

  it("says to design from first principles when nothing matches", () => {
    const result = service.list("zzz qqq", 3);
    expect(result.ok && result.value).toEqual({ patterns: [], note: NO_MATCH_NOTE });
  });

  it("has no note when listing everything", () => {
    const result = service.list(undefined, 20);
    expect(result.ok && result.value.note).toBeUndefined();
  });
});
