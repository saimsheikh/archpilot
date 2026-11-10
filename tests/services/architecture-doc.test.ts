import { describe, expect, it } from "vitest";
import {
  architectureDocSchema,
  renderArchitectureDoc,
} from "../../src/services/architecture-doc.js";
import { SAMPLE_ARCHITECTURE } from "../helpers/sample-architecture.js";

const doc = architectureDocSchema.parse({
  ...SAMPLE_ARCHITECTURE,
  mermaidSource: "flowchart LR\n  web --> api",
});

describe("renderArchitectureDoc", () => {
  const markdown = renderArchitectureDoc(doc, "docs/diagram.svg");

  it("contains every section in order, ending with the agent rules", () => {
    const headings = [...markdown.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
    expect(headings).toEqual([
      "Diagram",
      "Components",
      "Data flow",
      "Key decisions",
      "Risks and pre-mortem",
      "Open questions",
      "Rules for the coding agent",
    ]);
    expect(markdown).toMatch(/flag the deviation/);
  });

  it("escapes pipes inside table cells", () => {
    expect(markdown).toContain("UI \\| search");
  });

  it("embeds the diagram image and mermaid source", () => {
    expect(markdown).toContain("![Architecture diagram](docs/diagram.svg)");
    expect(markdown).toContain("```mermaid\nflowchart LR");
  });

  it("marks missing technology and optional sections", () => {
    const bare = renderArchitectureDoc(
      architectureDocSchema.parse({ ...SAMPLE_ARCHITECTURE, openQuestions: [], dataFlow: [] }),
    );
    expect(bare).toContain("| API | CRUD and search | TBD |");
    expect(bare).toContain("_No diagram attached._");
    expect(bare).toContain("## Open questions\n\n_None._");
  });

  it("rejects input without risks", () => {
    expect(architectureDocSchema.safeParse({ ...SAMPLE_ARCHITECTURE, risks: [] }).success).toBe(
      false,
    );
  });
});
