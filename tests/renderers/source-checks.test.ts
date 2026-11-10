import { describe, expect, it } from "vitest";
import { checkSource, findHeader } from "../../src/renderers/mermaid/source-checks.js";

describe("findHeader", () => {
  it("skips frontmatter, comments and blank lines", () => {
    const source = "---\ntitle: t\n---\n\n%% note\n%%{init: {}}%%\nsequenceDiagram\n  A->>B: hi";
    expect(findHeader(source)).toEqual({ keyword: "sequenceDiagram", line: 7 });
  });

  it("returns undefined for empty input", () => {
    expect(findHeader("\n  \n")).toBeUndefined();
  });
});

describe("checkSource", () => {
  it("accepts known diagram types", () => {
    expect(checkSource("flowchart LR\n a-->b", 1000)).toEqual({
      ok: true,
      value: { diagramType: "flowchart" },
    });
  });

  it("suggests the closest diagram type for typos", () => {
    const result = checkSource("sequenceDiagramm\n A->>B: x", 1000);
    expect(!result.ok && result.error.hint).toContain("sequenceDiagram");
  });

  it("measures size in bytes, not characters", () => {
    const source = "flowchart LR\n a[ü]";
    const result = checkSource(source, source.length);
    expect(!result.ok && result.error.code).toBe("SOURCE_TOO_LARGE");
  });
});
