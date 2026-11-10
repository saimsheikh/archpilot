import { writeFile } from "node:fs/promises";
import type {
  DiagramError,
  DiagramFormat,
  DiagramRenderer,
  ValidDiagram,
} from "../renderers/diagram-renderer.js";
import { fail, ok, type Result } from "../shared/result.js";
import { resolveOutputPath, type OutputPathError } from "./output-path.js";

export interface RenderRequest {
  source: string;
  format: DiagramFormat;
  outputPath: string;
}

export interface RenderedFile {
  /** Project-relative path with forward slashes. */
  path: string;
  format: DiagramFormat;
  bytes: number;
}

export class DiagramService {
  constructor(
    private readonly renderer: DiagramRenderer,
    private readonly projectRoot: string,
  ) {}

  validate(source: string): Promise<Result<ValidDiagram, DiagramError>> {
    return this.renderer.validate(source);
  }

  /**
   * Validates and renders in one pass: the renderer runs the same checks as `validate`
   * before drawing, so the browser launches once instead of twice.
   */
  async render(
    request: RenderRequest,
  ): Promise<Result<RenderedFile, DiagramError | OutputPathError>> {
    const target = await resolveOutputPath(this.projectRoot, request.outputPath, [
      `.${request.format}`,
    ]);
    if (!target.ok) return target;

    const rendered = await this.renderer.render(request.source, request.format);
    if (!rendered.ok) return fail(rendered.error);

    await writeFile(target.value.absolute, rendered.value.data);
    return ok({
      path: target.value.relative,
      format: request.format,
      bytes: rendered.value.data.length,
    });
  }
}
