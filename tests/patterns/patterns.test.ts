import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  loadPatterns,
  parsePattern,
  PatternFormatError,
} from "../../src/patterns/pattern-loader.js";
import { createTestRenderer } from "../helpers/renderer.js";

const patterns = await loadPatterns();
const EXPECTED_IDS = [
  "agent-system",
  "data-ml-pipeline",
  "event-driven-pipeline",
  "internal-admin-tool",
  "mobile-api-backend",
  "multi-tenant-saas",
  "rag-app",
  "realtime-collaboration",
];

describe("bundled patterns", () => {
  it("contains the 8 v1 reference architectures", () => {
    expect(patterns.map((p) => p.meta.id)).toEqual(EXPECTED_IDS);
  });

  for (const pattern of patterns) {
    describe(pattern.meta.id, () => {
      it("has opinionated content: trade-offs, 3+ failure modes, what not to use it for", () => {
        expect(pattern.meta.failure_modes.length).toBeGreaterThanOrEqual(3);
        expect(pattern.body).toMatch(/^## Trade-offs$/m);
        expect(pattern.body).toMatch(/^## Failure modes and mitigations$/m);
        expect(pattern.body).toMatch(/^## Do not use it for$/m);
      });

      it("has a diagram that renders", { timeout: 90_000 }, async () => {
        const result = await createTestRenderer().validate(pattern.mermaid);
        expect(result).toMatchObject({ ok: true });
      });
    });
  }
});

const ragText = await readFile(new URL("../../patterns/rag-app.md", import.meta.url), "utf8");

describe("parsePattern", () => {
  it("rejects files without frontmatter", () => {
    expect(() => parsePattern("x.md", "# no frontmatter")).toThrow(PatternFormatError);
  });

  it("rejects an id that does not match the file name", () => {
    expect(() => parsePattern("other-name.md", ragText)).toThrow(/must match the file name/);
  });

  it("rejects fewer than 3 failure modes", () => {
    const text = ragText.replace(
      /failure_modes:\n(?: {2}- .+\n)+/,
      "failure_modes:\n  - only one\n",
    );
    expect(() => parsePattern("rag-app.md", text)).toThrow(PatternFormatError);
  });

  it("rejects a pattern without a mermaid diagram", () => {
    const text = ragText.replace("```mermaid", "```text");
    expect(() => parsePattern("rag-app.md", text)).toThrow(/missing mermaid/);
  });
});
