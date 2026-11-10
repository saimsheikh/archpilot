import { mkdir, realpath, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveOutputPath } from "../../src/services/output-path.js";
import { makeProject } from "../helpers/project.js";

const SVG = [".svg"];

describe("resolveOutputPath", () => {
  it("resolves nested relative paths and creates parents", async () => {
    const root = await makeProject();
    const result = await resolveOutputPath(root, "docs/arch/d.svg", SVG);
    expect(result.ok && result.value.relative).toBe("docs/arch/d.svg");
    expect(result.ok && result.value.absolute).toBe(
      join(await realpath(root), "docs", "arch", "d.svg"),
    );
  });

  it.each(["../escape.svg", "docs/../../escape.svg", "..\\escape.svg"])(
    "rejects traversal %s",
    async (requested) => {
      const result = await resolveOutputPath(await makeProject(), requested, SVG);
      expect(!result.ok && result.error.code).toBe("PATH_OUTSIDE_PROJECT");
    },
  );

  it("rejects absolute paths outside the project", async () => {
    const other = await makeProject();
    const result = await resolveOutputPath(await makeProject(), join(other, "x.svg"), SVG);
    expect(!result.ok && result.error.code).toBe("PATH_OUTSIDE_PROJECT");
  });

  it("rejects the wrong extension and empty paths", async () => {
    const root = await makeProject();
    const wrong = await resolveOutputPath(root, "diagram.exe", SVG);
    const empty = await resolveOutputPath(root, "  ", SVG);
    expect(!wrong.ok && wrong.error.code).toBe("INVALID_OUTPUT_PATH");
    expect(!empty.ok && empty.error.code).toBe("INVALID_OUTPUT_PATH");
  });

  it("rejects a symlinked directory that escapes the project", async () => {
    const root = await makeProject();
    const outside = await makeProject();
    // Junctions need no admin rights on Windows; the type is ignored elsewhere.
    await symlink(outside, join(root, "link"), "junction");
    const result = await resolveOutputPath(root, "link/d.svg", SVG);
    expect(!result.ok && result.error.code).toBe("PATH_OUTSIDE_PROJECT");
  });

  it("rejects writing through an existing file symlink", async () => {
    const root = await makeProject();
    const outside = await makeProject();
    await writeFile(join(outside, "target.svg"), "x");
    await mkdir(join(root, "docs"));
    try {
      await symlink(join(outside, "target.svg"), join(root, "docs", "d.svg"), "file");
    } catch {
      return; // File symlinks need privileges on some Windows setups; covered on CI (Linux).
    }
    const result = await resolveOutputPath(root, "docs/d.svg", SVG);
    expect(!result.ok && result.error.code).toBe("PATH_OUTSIDE_PROJECT");
  });
});
