import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { FakeRenderer } from "../helpers/fake-renderer.js";
import { connectClient, makeProject } from "../helpers/project.js";

const SKILL_PATH = fileURLToPath(new URL("../../skills/archpilot/SKILL.md", import.meta.url));
const skillText = await readFile(SKILL_PATH, "utf8");
const [, frontmatterText = "", body = ""] =
  /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(skillText) ?? [];

// Limits from the Agent Skills format: lowercase-hyphen name, description up to 1024 chars.
const frontmatterSchema = z.object({
  name: z
    .string()
    .max(64)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().min(1).max(1024),
});

function localLinks(markdown: string): string[] {
  return [...markdown.matchAll(/\]\(([^)]+)\)/g)]
    .map((match) => match[1] ?? "")
    .filter((target) => !/^[a-z]+:/i.test(target) && !target.startsWith("#"));
}

describe("SKILL.md", () => {
  it("has valid frontmatter named after its folder", () => {
    const frontmatter = frontmatterSchema.parse(parseYaml(frontmatterText));
    expect(frontmatter.name).toBe("archpilot");
  });

  it("says when to trigger", () => {
    const { description } = frontmatterSchema.parse(parseYaml(frontmatterText));
    expect(description).toMatch(/plan/i);
    expect(description).toMatch(/before any code/i);
  });

  it("stays under the ~300 line budget", () => {
    expect(skillText.split("\n").length).toBeLessThanOrEqual(300);
  });

  it("links only to files that exist", async () => {
    const links = localLinks(body);
    expect(links.length).toBeGreaterThan(0);
    await Promise.all(links.map((link) => access(join(dirname(SKILL_PATH), link))));
  });

  it("names only tools the server provides, and all of them", async () => {
    const client = await connectClient(new FakeRenderer(), await makeProject());
    const serverTools = (await client.listTools()).tools.map((tool) => tool.name);
    const mentioned = new Set([...body.matchAll(/`([a-z]+(?:_[a-z]+)+)`/g)].map((m) => m[1]));
    expect([...mentioned].sort()).toEqual([...serverTools].sort());
  });

  it("caps the diagram repair loop at 3 retries", () => {
    expect(body).toMatch(/at most \*\*3 times\*\*/);
  });
});

describe("skill reference files", () => {
  it.each(["interview-guide.md", "forgotten-concerns.md", "premortem.md"])(
    "%s exists",
    async (file) => {
      const text = await readFile(join(dirname(SKILL_PATH), "references", file), "utf8");
      expect(text.length).toBeGreaterThan(500);
    },
  );

  it("covers every commonly forgotten concern", async () => {
    const text = (
      await readFile(join(dirname(SKILL_PATH), "references", "forgotten-concerns.md"), "utf8")
    ).toLowerCase();
    for (const concern of [
      "auth",
      "rate limits",
      "queues",
      "idempotency",
      "observability",
      "backups",
      "secrets",
      "cost per request",
      "failure modes",
      "data deletion",
    ]) {
      expect(text).toContain(concern);
    }
  });
});
