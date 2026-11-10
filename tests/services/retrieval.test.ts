import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { evaluateRetriever, type RetrievalCase } from "../../evals/retrieval/evaluate.js";
import { loadPatterns } from "../../src/patterns/pattern-loader.js";
import { createRetriever, RETRIEVER_KINDS } from "../../src/services/retrieval/create-retriever.js";
import { tokenize } from "../../src/services/retrieval/tokenize.js";

const patterns = await loadPatterns();
const cases = JSON.parse(
  await readFile(new URL("../../evals/retrieval/queries.json", import.meta.url), "utf8"),
) as RetrievalCase[];

describe("tokenize", () => {
  it("lowercases, drops stopwords and folds simple plurals", () => {
    expect(tokenize("The Tenants and their Queries")).toEqual(["tenant", "query"]);
  });

  it("splits hyphenated terms", () => {
    expect(tokenize("multi-tenant")).toEqual(["multi", "tenant"]);
  });
});

describe.each(RETRIEVER_KINDS)("%s retriever", (kind) => {
  const retriever = createRetriever(kind, patterns);

  it("ranks the obvious match first", () => {
    const [best] = retriever.search("chatbot answering questions over our documents", 3);
    expect(best?.pattern.meta.id).toBe("rag-app");
  });

  it("respects the limit and orders by score", () => {
    const results = retriever.search("events queue mobile app admin dashboard", 2);
    expect(results).toHaveLength(2);
    expect(results[0]?.score ?? 0).toBeGreaterThanOrEqual(results[1]?.score ?? 0);
  });

  it("returns nothing for irrelevant input", () => {
    expect(retriever.search("zzz qqq", 5)).toEqual([]);
  });

  // Regression guard set below current results (100% top-3), not a quality claim.
  it("keeps top-3 accuracy on the eval set at or above 90%", () => {
    expect(evaluateRetriever(retriever, cases).top3).toBeGreaterThanOrEqual(0.9);
  });
});
