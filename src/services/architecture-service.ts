import { writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { ok, type Result } from "../shared/result.js";
import { renderArchitectureDoc, type ArchitectureDoc } from "./architecture-doc.js";
import { toProjectRelative } from "./diagram-service.js";
import { resolveOutputPath, type OutputPathError } from "./output-path.js";

export interface ExportedDoc {
  path: string;
  bytes: number;
}

export class ArchitectureService {
  constructor(private readonly projectRoot: string) {}

  async export(
    doc: ArchitectureDoc,
    outputPath: string,
  ): Promise<Result<ExportedDoc, OutputPathError>> {
    const target = await resolveOutputPath(this.projectRoot, outputPath, [".md"]);
    if (!target.ok) return target;

    const markdown = renderArchitectureDoc(doc, this.diagramLink(doc, target.value));
    await writeFile(target.value, markdown, "utf8");
    return ok({
      path: toProjectRelative(this.projectRoot, target.value),
      bytes: Buffer.byteLength(markdown, "utf8"),
    });
  }

  private diagramLink(doc: ArchitectureDoc, docPath: string): string | undefined {
    if (!doc.diagramPath) return undefined;
    const diagram = resolve(this.projectRoot, doc.diagramPath);
    return relative(dirname(docPath), diagram).split(sep).join("/");
  }
}
