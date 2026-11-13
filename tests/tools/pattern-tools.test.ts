import { describe, expect, it } from "vitest";
import { FakeRenderer } from "../helpers/fake-renderer.js";
import { callJson, connectClient, makeProject } from "../helpers/project.js";

async function client() {
  return connectClient(new FakeRenderer(), await makeProject());
}

describe("list_patterns", () => {
  it("lists every pattern without a query", async () => {
    const result = await callJson(await client(), "list_patterns", { limit: 20 });
    expect((result.body.patterns as unknown[]).length).toBe(9);
  });

  it("ranks by relevance with a query", async () => {
    const result = await callJson(await client(), "list_patterns", {
      query: "shared whiteboard where people draw together live",
      limit: 3,
    });
    const [best] = result.body.patterns as { id: string; score: number }[];
    expect(best).toMatchObject({ id: "realtime-collaboration" });
    expect(best?.score).toBeGreaterThan(0);
  });
});

describe("get_pattern", () => {
  it("returns the full pattern", async () => {
    const result = await callJson(await client(), "get_pattern", { id: "rag-app" });
    expect(result.body).toMatchObject({ ok: true, id: "rag-app", name: "RAG application" });
    expect(result.body.mermaid).toMatch(/^flowchart/);
    expect(result.body.markdown).toContain("## Do not use it for");
  });

  it("returns PATTERN_NOT_FOUND with the known ids as a hint", async () => {
    const result = await callJson(await client(), "get_pattern", { id: "nope" });
    expect(result.isError).toBe(true);
    expect(result.body).toMatchObject({ error: { code: "PATTERN_NOT_FOUND" } });
    expect(JSON.stringify(result.body)).toContain("rag-app");
  });
});
