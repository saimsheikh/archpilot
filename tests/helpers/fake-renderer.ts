import type {
  DiagramError,
  DiagramFormat,
  DiagramRenderer,
  RenderedDiagram,
  ValidDiagram,
} from "../../src/renderers/diagram-renderer.js";
import { fail, ok, type Result } from "../../src/shared/result.js";

/** Browser-free renderer: any source containing "INVALID" fails with BAD_ARROW on line 2. */
export class FakeRenderer implements DiagramRenderer {
  readonly calls: string[] = [];

  validate(source: string): Promise<Result<ValidDiagram, DiagramError>> {
    this.calls.push(`validate:${source}`);
    return Promise.resolve(
      source.includes("INVALID") ? fail(FAKE_ERROR) : ok({ diagramType: "flowchart" }),
    );
  }

  render(source: string, format: DiagramFormat): Promise<Result<RenderedDiagram, DiagramError>> {
    this.calls.push(`render:${format}`);
    if (source.includes("INVALID")) return Promise.resolve(fail(FAKE_ERROR));
    return Promise.resolve(ok({ format, data: Buffer.from(`<fake ${format}>`) }));
  }
}

export const FAKE_ERROR: DiagramError = {
  code: "BAD_ARROW",
  message: "Invalid link/arrow syntax.",
  line: 2,
  hint: "Use -->",
};
