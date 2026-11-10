import { describe, expect, it } from "vitest";
import {
  findUnclosedBracketLine,
  parseMermaidError,
} from "../../src/renderers/mermaid/error-parser.js";

// Real stderr captured from mermaid-cli 12.2, trimmed to the parts the parser reads.
const stderrFor = (line: number, expecting: string, got: string): string =>
  `Error: Parse error on line ${String(line)}:\n...\n---^\nExpecting ${expecting}, got '${got}'\n` +
  "Parser.parseError (https://mermaid-cli-intercept.invalid/E:/x/node_modules/mermaid/chunk.mjs:1:1)";

describe("parseMermaidError", () => {
  it("maps a missing browser to RENDERER_UNAVAILABLE", () => {
    const error = parseMermaidError("Error: Could not find Chrome (ver. 156)", "flowchart TD");
    expect(error.code).toBe("RENDERER_UNAVAILABLE");
  });

  it("maps mermaid's unknown-diagram error", () => {
    const error = parseMermaidError("UnknownDiagramError: No diagram type detected", "x");
    expect(error.code).toBe("UNKNOWN_DIAGRAM_TYPE");
  });

  it("clamps end-of-input line numbers to the source", () => {
    const source = "flowchart TD\n  A[Start --> B\n";
    const error = parseMermaidError(stderrFor(4, "'SQE', 'PE', 'TEXT'", "1"), source);
    expect(error).toMatchObject({ code: "UNBALANCED_BRACKET", line: 2 });
  });

  it("never leaks paths or stack frames", () => {
    const error = parseMermaidError(stderrFor(2, "'NODE_STRING'", "weird"), "flowchart TD\n x");
    expect(JSON.stringify(error)).not.toMatch(/node_modules|https?:|Parser\./);
  });

  it("falls back to RENDER_FAILED for unrecognized output", () => {
    expect(parseMermaidError("something else broke", "flowchart TD").code).toBe("RENDER_FAILED");
  });
});

describe("findUnclosedBracketLine", () => {
  it("ignores brackets inside quotes", () => {
    expect(findUnclosedBracketLine('flowchart TD\n  A["(unclosed"] --> B')).toBeUndefined();
  });

  it("reports the earliest unmatched opener", () => {
    expect(findUnclosedBracketLine("flowchart TD\n  A --> B\n  C{Choice --> D")).toBe(3);
  });
});
