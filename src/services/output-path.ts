import { lstat, mkdir, realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fail, ok, type Result } from "../shared/result.js";

export type OutputPathErrorCode = "INVALID_OUTPUT_PATH" | "PATH_OUTSIDE_PROJECT";

export interface OutputPathError {
  code: OutputPathErrorCode;
  message: string;
  hint: string;
}

export interface OutputTarget {
  absolute: string;
  /** Relative to the project root, with forward slashes. */
  relative: string;
}

const OUTSIDE_HINT = "Use a relative path inside the project, e.g. docs/architecture/diagram.svg.";

function isInside(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel !== "" && !rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel);
}

function outside(requested: string): Result<never, OutputPathError> {
  return fail({
    code: "PATH_OUTSIDE_PROJECT",
    message: `Output path '${requested}' resolves outside the project directory.`,
    hint: OUTSIDE_HINT,
  });
}

async function nearestExistingAncestor(path: string): Promise<string> {
  let current = path;
  for (;;) {
    try {
      await lstat(current);
      return current;
    } catch {
      const parent = dirname(current);
      if (parent === current) return current;
      current = parent;
    }
  }
}

async function isSymlink(path: string): Promise<boolean> {
  try {
    return (await lstat(path)).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Resolves a user-supplied output path to an absolute path inside `projectRoot`, creating
 * parent directories. Rejects traversal (`..`), absolute paths elsewhere, symlinked parents
 * that escape the project, and writing through an existing symlink.
 */
export async function resolveOutputPath(
  projectRoot: string,
  requested: string,
  allowedExtensions: readonly string[],
): Promise<Result<OutputTarget, OutputPathError>> {
  if (requested.trim() === "" || requested.includes("\0")) {
    return fail({
      code: "INVALID_OUTPUT_PATH",
      message: "Output path is empty or contains invalid characters.",
      hint: OUTSIDE_HINT,
    });
  }
  const lower = requested.toLowerCase();
  if (!allowedExtensions.some((extension) => lower.endsWith(extension))) {
    return fail({
      code: "INVALID_OUTPUT_PATH",
      message: `Output path must end with ${allowedExtensions.join(" or ")}.`,
      hint: `Example: docs/architecture/diagram${allowedExtensions[0] ?? ""}`,
    });
  }

  const realRoot = await realpath(projectRoot);
  // Models often send Windows-style paths; treat "\" as a separator on every OS so
  // "..\x" is rejected as traversal on Linux too, not written as a file named "..\x".
  const target = resolve(realRoot, requested.replace(/\\/g, "/"));
  if (!isInside(realRoot, target)) return outside(requested);

  // Symlinks are resolved on the deepest existing ancestor, so a link pointing out of the
  // project is caught before any directory is created through it.
  const realAncestor = await realpath(await nearestExistingAncestor(dirname(target)));
  if (realAncestor !== realRoot && !isInside(realRoot, realAncestor)) return outside(requested);
  if (await isSymlink(target)) return outside(requested);

  await mkdir(dirname(target), { recursive: true });
  return ok({ absolute: target, relative: relative(realRoot, target).split(sep).join("/") });
}
