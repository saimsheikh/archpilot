import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { MermaidRenderer } from "../../src/renderers/mermaid/mermaid-renderer.js";
import { INVALID_DIAGRAMS, VALID_DIAGRAMS } from "./mermaid-cases.js";

// These tests launch headless Chromium through mermaid-cli, so they are slow by nature.
const BROWSER_TIMEOUT_MS = 90_000;
const renderer = new MermaidRenderer({ maxConcurrentRenders: 4 });

async function leftoverTempDirs(): Promise<string[]> {
  return (await readdir(tmpdir())).filter((name) => name.startsWith("archpilot-render-"));
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
    const small = new MermaidRenderer({ maxSourceBytes: 10 });
    const result = await small.render(source, "svg");
    expect(!result.ok && result.error.code).toBe("SOURCE_TOO_LARGE");
  });

  it("rejects oversized output", { timeout: BROWSER_TIMEOUT_MS }, async () => {
    const tiny = new MermaidRenderer({ maxOutputBytes: 100 });
    const result = await tiny.render(source, "svg");
    expect(!result.ok && result.error.code).toBe("OUTPUT_TOO_LARGE");
  });

  it("times out slow renders", { timeout: BROWSER_TIMEOUT_MS }, async () => {
    const impatient = new MermaidRenderer({ timeoutMs: 1 });
    const result = await impatient.render(source, "svg");
    expect(!result.ok && result.error.code).toBe("RENDER_TIMEOUT");
  });

  it("treats shell metacharacters as plain text", { timeout: BROWSER_TIMEOUT_MS }, async () => {
    const source = 'flowchart TD\n  A["$(touch pwned) ; rm -rf / `x`"] --> B';
    const result = await renderer.validate(source);
    expect(result.ok).toBe(true);
  });

  it("cleans up temp files on success and failure", { timeout: BROWSER_TIMEOUT_MS }, async () => {
    const before = await leftoverTempDirs();
    await renderer.render(source, "svg");
    await renderer.render("flowchart TD\n  A -> B", "svg");
    const after = await leftoverTempDirs();
    expect(after.filter((dir) => !before.includes(dir))).toEqual([]);
  });
});
