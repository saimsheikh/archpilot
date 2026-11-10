import { closestMatch } from "../../shared/edit-distance.js";
import { fail, ok, type Result } from "../../shared/result.js";
import type { DiagramError, ValidDiagram } from "../diagram-renderer.js";
import { MERMAID_DIAGRAM_TYPES } from "./diagram-types.js";

interface HeaderLine {
  keyword: string;
  line: number;
}

/** First meaningful line, skipping blank lines, %% comments/directives and YAML frontmatter. */
export function findHeader(source: string): HeaderLine | undefined {
  const lines = source.split(/\r?\n/);
  let inFrontmatter = false;
  for (const [index, raw] of lines.entries()) {
    const text = raw.trim();
    if (index === 0 && text === "---") {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter) {
      if (text === "---") inFrontmatter = false;
      continue;
    }
    if (text === "" || text.startsWith("%%")) continue;
    const keyword = text.split(/[\s;]+/)[0] ?? "";
    return { keyword, line: index + 1 };
  }
  return undefined;
}

/** Cheap checks that need no browser: emptiness, size and a known diagram type. */
export function checkSource(
  source: string,
  maxSourceBytes: number,
): Result<ValidDiagram, DiagramError> {
  const size = Buffer.byteLength(source, "utf8");
  if (size > maxSourceBytes) {
    return fail({
      code: "SOURCE_TOO_LARGE",
      message: `Diagram source is ${String(size)} bytes; the limit is ${String(maxSourceBytes)}.`,
      hint: "Split the system into several smaller diagrams (e.g. context + one per subsystem).",
    });
  }
  const header = findHeader(source);
  if (!header) {
    return fail({
      code: "EMPTY_SOURCE",
      message: "Diagram source is empty.",
      hint: "Start with a diagram type, e.g. 'flowchart TD'.",
    });
  }
  if (!MERMAID_DIAGRAM_TYPES.has(header.keyword)) {
    const suggestion = closestMatch(header.keyword, MERMAID_DIAGRAM_TYPES);
    return fail({
      code: "UNKNOWN_DIAGRAM_TYPE",
      message: `Unknown diagram type '${header.keyword}'.`,
      line: header.line,
      hint: suggestion
        ? `The first line must name a diagram type. Did you mean '${suggestion}'?`
        : "The first line must name a diagram type, e.g. 'flowchart TD'.",
    });
  }
  return ok({ diagramType: header.keyword });
}
