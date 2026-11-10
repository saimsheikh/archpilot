import { cp, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** The skill ships inside the npm package, next to src/ and dist/. */
export const BUNDLED_SKILL_DIR = fileURLToPath(new URL("../../skills/archpilot", import.meta.url));

export type SkillScope = "user" | "project";

/** Where Claude Code looks for skills: ~/.claude/skills (all projects) or ./.claude/skills. */
export function skillTarget(scope: SkillScope, cwd: string, home: string = homedir()): string {
  const base = scope === "user" ? home : cwd;
  return join(base, ".claude", "skills", "archpilot");
}

/** Copies the bundled skill into place, replacing an older copy so upgrades stay in sync. */
export async function installSkill(
  target: string,
  source: string = BUNDLED_SKILL_DIR,
): Promise<void> {
  await rm(target, { recursive: true, force: true });
  await cp(source, target, { recursive: true });
}
