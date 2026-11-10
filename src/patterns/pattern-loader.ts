import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { patternMetaSchema, type Pattern } from "./pattern.js";

/** Bundled patterns ship next to src/ and dist/, so this path works from either. */
export const BUNDLED_PATTERNS_DIR = fileURLToPath(new URL("../../patterns", import.meta.url));

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
const MERMAID_BLOCK = /```mermaid\r?\n([\s\S]*?)```/;

export class PatternFormatError extends Error {
  constructor(file: string, reason: string) {
    super(`Invalid pattern ${file}: ${reason}`);
    this.name = "PatternFormatError";
  }
}

/** Parses one pattern file. Throws PatternFormatError: a broken bundled pattern is a build bug. */
export function parsePattern(file: string, text: string): Pattern {
  const match = FRONTMATTER.exec(text);
  if (!match?.[1] || match[2] === undefined)
    throw new PatternFormatError(file, "missing frontmatter");
  const meta = patternMetaSchema.safeParse(parseYaml(match[1]));
  if (!meta.success) throw new PatternFormatError(file, meta.error.message);
  if (meta.data.id !== basename(file, ".md")) {
    throw new PatternFormatError(file, `id '${meta.data.id}' must match the file name`);
  }
  const mermaid = MERMAID_BLOCK.exec(match[2])?.[1];
  if (!mermaid) throw new PatternFormatError(file, "missing mermaid diagram");
  return { meta: meta.data, body: match[2].trim(), mermaid: mermaid.trim() };
}

export async function loadPatterns(dir: string = BUNDLED_PATTERNS_DIR): Promise<Pattern[]> {
  const files = (await readdir(dir)).filter((file) => file.endsWith(".md")).sort();
  return Promise.all(
    files.map(async (file) => parsePattern(file, await readFile(join(dir, file), "utf8"))),
  );
}
