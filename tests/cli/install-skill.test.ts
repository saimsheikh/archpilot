import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { installSkill, skillTarget } from "../../src/cli/install-skill.js";
import { makeProject } from "../helpers/project.js";

describe("skillTarget", () => {
  it("uses ~/.claude/skills for user scope and ./.claude/skills for project scope", () => {
    expect(skillTarget("user", "/work/app", "/home/me")).toBe(
      join("/home/me", ".claude", "skills", "archpilot"),
    );
    expect(skillTarget("project", "/work/app", "/home/me")).toBe(
      join("/work/app", ".claude", "skills", "archpilot"),
    );
  });
});

describe("installSkill", () => {
  it("copies SKILL.md and its references", async () => {
    const target = join(await makeProject(), ".claude", "skills", "archpilot");
    await installSkill(target);
    expect(await readFile(join(target, "SKILL.md"), "utf8")).toMatch(/^---\nname: archpilot/);
    expect(await readFile(join(target, "references", "premortem.md"), "utf8")).toContain(
      "Pre-mortem",
    );
  });

  it("replaces an older copy instead of merging into it", async () => {
    const target = join(await makeProject(), "skill");
    await mkdir(target, { recursive: true });
    await writeFile(join(target, "stale.md"), "old");
    await installSkill(target);
    await expect(readFile(join(target, "stale.md"), "utf8")).rejects.toThrow();
  });
});
