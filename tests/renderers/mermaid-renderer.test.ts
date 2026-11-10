import { mkdtemp, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { createTestRenderer } from "../helpers/renderer.js";
import { INVALID_DIAGRAMS, VALID_DIAGRAMS } from "./mermaid-cases.js";

// These tests launch headless Chromium through mermaid-cli, so they are slow by nature.
const BROWSER_TIMEOUT_MS = 90_000;
const renderer = createTestRenderer({ maxConcurrentRenders: 4 });

const TEMP_VARS = ["TMPDIR", "TMP", "TEMP"] as const;

/** Runs `work` with os.tmpdir() pointed at a fresh private dir; returns what is left in it. */
async function leftoversAfter(work: () => Promise<unknown>): Promise<string[]> {
  const privateTmp = await mkdtemp(join(tmpdir(), "archpilot-cleanup-test-"));
  const saved = TEMP_VARS.map((name) => process.env[name]);
  for (const name of TEMP_VARS) process.env[name] = privateTmp;
  try {
    await work();
    return await readdir(privateTmp);
  } finally {
    TEMP_VARS.forEach((name, index) => {
      const value = saved[index];
      if (value === undefined) Reflect.deleteProperty(process.env, name);
      else process.env[name] = value;
    });
    await rm(privateTmp, { recursive: true, force: true });
  }
}

describe.concurrent("MermaidRenderer: valid diagrams", () => {
  for (const [name, source] of Object.entries(VALID_DIAGRAMS)) {
    it(`validates ${name}`, { timeout: BROWSER_TIMEOUT_MS }, async () => {
      const result = await renderer.validate(source);
      expect(result.ok).toBe(true);
    });
  }
});

describe.concurrent("MermaidRenderer: invalid diagrams", () => {
  for (const [name, { source, code, line }] of Object.entries(INVALID_DIAGRAMS)) {
    it(`rejects ${name} with ${code}`, { timeout: BROWSER_TIMEOUT_MS }, async () => {
      const result = await renderer.validate(source);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe(code);
      if (line !== undefined) expect(result.error.line).toBe(line);
      expect(result.error.hint).toBeTruthy();
      expect(result.error.message).not.toMatch(/[A-Z]:\\|node_modules|https?:\/\//);
    });
  }
});

describe("MermaidRenderer: rendering and limits", () => {
  const source = VALID_DIAGRAMS.flowchart ?? "";

  it("renders svg", { timeout: BROWSER_TIMEOUT_MS }, async () => {
    const result = await renderer.render(source, "svg");
    expect(result.ok && result.value.data.toString("utf8")).toContain("<svg");
  });

  it("renders png", { timeout: BROWSER_TIMEOUT_MS }, async () => {
    const result = await renderer.render(source, "png");
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    expect(result.ok && result.value.data.subarray(0, 4)).toEqual(pngSignature);
  });

  it("rejects oversized source without launching a browser", async () => {
    const small = createTestRenderer({ maxSourceBytes: 10 });
    const result = await small.render(source, "svg");
    expect(!result.ok && result.error.code).toBe("SOURCE_TOO_LARGE");
  });

  it("rejects oversized output", { timeout: BROWSER_TIMEOUT_MS }, async () => {
    const tiny = createTestRenderer({ maxOutputBytes: 100 });
    const result = await tiny.render(source, "svg");
    expect(!result.ok && result.error.code).toBe("OUTPUT_TOO_LARGE");
  });

  it("times out slow renders", { timeout: BROWSER_TIMEOUT_MS }, async () => {
    const impatient = createTestRenderer({ timeoutMs: 1 });
    const result = await impatient.render(source, "svg");
    expect(!result.ok && result.error.code).toBe("RENDER_TIMEOUT");
  });

  it("treats shell metacharacters as plain text", { timeout: BROWSER_TIMEOUT_MS }, async () => {
    const source = 'flowchart TD\n  A["$(touch pwned) ; rm -rf / `x`"] --> B';
    const result = await renderer.validate(source);
    expect(result.ok).toBe(true);
  });

  it("cleans up temp files on success and failure", { timeout: BROWSER_TIMEOUT_MS }, async () => {
    const leftovers = await leftoversAfter(async () => {
      await renderer.render(source, "svg");
      await renderer.render("flowchart TD\n  A -> B", "svg");
    });
    expect(leftovers).toEqual([]);
  });
});
