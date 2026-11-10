import { readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fail, ok, type Result } from "../../shared/result.js";
import { withTempDir } from "../../shared/temp-dir.js";
import type {
  DiagramError,
  DiagramFormat,
  DiagramRenderer,
  RenderedDiagram,
  ValidDiagram,
} from "../diagram-renderer.js";
import { parseMermaidError } from "./error-parser.js";
import { runMmdc, type MmdcOutcome } from "./mmdc-runner.js";
import { checkSource } from "./source-checks.js";

export interface MermaidRendererOptions {
  timeoutMs: number;
  maxSourceBytes: number;
  maxOutputBytes: number;
  /** Optional puppeteer launch config, e.g. `--no-sandbox` inside CI containers. */
  puppeteerConfigPath?: string | undefined;
}

export const DEFAULT_MERMAID_OPTIONS: MermaidRendererOptions = {
  timeoutMs: 60_000,
  maxSourceBytes: 50_000,
  maxOutputBytes: 10 * 1024 * 1024,
};

// Strict mode disables click callbacks and raw HTML in labels; diagram directives cannot lower it.
const MERMAID_CONFIG = JSON.stringify({ securityLevel: "strict" });

export class MermaidRenderer implements DiagramRenderer {
  private readonly options: MermaidRendererOptions;

  constructor(options: Partial<MermaidRendererOptions> = {}) {
    this.options = { ...DEFAULT_MERMAID_OPTIONS, ...options };
  }

  async validate(source: string): Promise<Result<ValidDiagram, DiagramError>> {
    const checked = checkSource(source, this.options.maxSourceBytes);
    if (!checked.ok) return checked;
    // Mermaid has no browser-free parser, so validation is an SVG render that is discarded.
    const rendered = await this.renderChecked(source, "svg");
    return rendered.ok ? checked : rendered;
  }

  async render(
    source: string,
    format: DiagramFormat,
  ): Promise<Result<RenderedDiagram, DiagramError>> {
    const checked = checkSource(source, this.options.maxSourceBytes);
    if (!checked.ok) return checked;
    return this.renderChecked(source, format);
  }

  private renderChecked(
    source: string,
    format: DiagramFormat,
  ): Promise<Result<RenderedDiagram, DiagramError>> {
    return withTempDir((dir) => this.renderInDir(dir, source, format));
  }

  private async renderInDir(
    dir: string,
    source: string,
    format: DiagramFormat,
  ): Promise<Result<RenderedDiagram, DiagramError>> {
    const paths = {
      input: join(dir, "diagram.mmd"),
      output: join(dir, `diagram.${format}`),
      config: join(dir, "mermaid.json"),
    };
    await writeFile(paths.input, source, "utf8");
    await writeFile(paths.config, MERMAID_CONFIG, "utf8");

    const outcome = await runMmdc(this.buildArgs(paths, format), this.options.timeoutMs);
    const failure = this.toError(outcome, source);
    if (failure) return fail(failure);

    const { size } = await stat(paths.output);
    if (size > this.options.maxOutputBytes) {
      return fail({
        code: "OUTPUT_TOO_LARGE",
        message: `Rendered ${format} is ${String(size)} bytes; the limit is ${String(this.options.maxOutputBytes)}.`,
        hint: "Reduce the number of nodes, or render as svg instead of png.",
      });
    }
    return ok({ format, data: await readFile(paths.output) });
  }

  private buildArgs(
    paths: { input: string; output: string; config: string },
    format: DiagramFormat,
  ): string[] {
    const args = ["--quiet", "--input", paths.input, "--output", paths.output];
    args.push("--outputFormat", format, "--configFile", paths.config);
    if (this.options.puppeteerConfigPath) {
      args.push("--puppeteerConfigFile", this.options.puppeteerConfigPath);
    }
    return args;
  }

  private toError(outcome: MmdcOutcome, source: string): DiagramError | undefined {
    switch (outcome.kind) {
      case "success":
        return undefined;
      case "timeout":
        return {
          code: "RENDER_TIMEOUT",
          message: `Rendering exceeded ${String(this.options.timeoutMs)} ms.`,
          hint: "Simplify the diagram (fewer nodes and edges) and retry.",
        };
      case "failed":
        return parseMermaidError(outcome.stderr, source);
    }
  }
}
