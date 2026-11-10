import type { Result, ToolError } from "../shared/result.js";

export const DIAGRAM_FORMATS = ["svg", "png"] as const;
export type DiagramFormat = (typeof DIAGRAM_FORMATS)[number];

export type DiagramErrorCode =
  | "EMPTY_SOURCE"
  | "SOURCE_TOO_LARGE"
  | "UNKNOWN_DIAGRAM_TYPE"
  | "UNBALANCED_BRACKET"
  | "RESERVED_WORD"
  | "BAD_ARROW"
  | "UNQUOTED_SPECIAL_CHAR"
  | "PARSE_ERROR"
  | "RENDER_TIMEOUT"
  | "OUTPUT_TOO_LARGE"
  | "RENDERER_UNAVAILABLE"
  | "RENDER_FAILED";

export type DiagramError = ToolError<DiagramErrorCode>;

export interface ValidDiagram {
  diagramType: string;
}

export interface RenderedDiagram {
  format: DiagramFormat;
  data: Buffer;
}

/**
 * Renders diagram source in some text-to-diagram language. Tools depend on this
 * interface only, so other languages (D2, Excalidraw) can be added without touching them.
 */
export interface DiagramRenderer {
  validate(source: string): Promise<Result<ValidDiagram, DiagramError>>;
  render(source: string, format: DiagramFormat): Promise<Result<RenderedDiagram, DiagramError>>;
}
