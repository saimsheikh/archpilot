import { writeFile } from "node:fs/promises";
import { posix } from "node:path";
import { ok, type Result } from "../shared/result.js";
import { renderArchitectureDoc, type ArchitectureDoc } from "./architecture-doc.js";
import { resolveOutputPath, type OutputPathError } from "./output-path.js";

export interface ExportedDoc {
  /** Project-relative path with forward slashes. */
  path: string;
  bytes: number;
}

/** Diagram path as seen from the document's folder, so the image link resolves on GitHub. */
function linkFromDoc(docPath: string, diagramPath: string): string {
  const diagram = posix.normalize(diagramPath.replace(/\\/g, "/"));
  return posix.relative(posix.dirname(docPath), diagram);
}

export class ArchitectureService {
  constructor(private readonly projectRoot: string) {}

  async export(
    doc: ArchitectureDoc,
    outputPath: string,
  ): Promise<Result<ExportedDoc, OutputPathError>> {
    const target = await resolveOutputPath(this.projectRoot, outputPath, [".md"]);
    if (!target.ok) return target;

    const link = doc.diagramPath ? linkFromDoc(target.value.relative, doc.diagramPath) : undefined;
    const markdown = renderArchitectureDoc(doc, link);
    await writeFile(target.value.absolute, markdown, "utf8");
    return ok({ path: target.value.relative, bytes: Buffer.byteLength(markdown, "utf8") });
  }
}
