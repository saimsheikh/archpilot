import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { callJson, makeProject } from "../helpers/project.js";
import { SAMPLE_ARCHITECTURE } from "../helpers/sample-architecture.js";

const serverEntry = fileURLToPath(new URL("../../dist/index.js", import.meta.url));
const BROWSER_TIMEOUT_MS = 90_000;

describe("built server over stdio", () => {
  let client: Client;
  let root: string;

  beforeEach(async () => {
    root = await makeProject();
    client = new Client({ name: "e2e-client", version: "0.0.0" });
    await client.connect(
      new StdioClientTransport({
        command: process.execPath,
        args: [serverEntry],
        env: { ...(process.env as Record<string, string>), ARCHPILOT_PROJECT_ROOT: root },
      }),
    );
  });

  afterEach(async () => {
    await client.close();
  });

  it("validates good and bad diagrams", { timeout: BROWSER_TIMEOUT_MS }, async () => {
    const good = await callJson(client, "validate_diagram", { source: "flowchart TD\n  a --> b" });
    const bad = await callJson(client, "validate_diagram", { source: "flowchart TD\n  a -> b" });
    expect(good.body).toMatchObject({ ok: true });
    expect(bad.body).toMatchObject({ ok: false, error: { code: "BAD_ARROW", line: 2 } });
  });

  it("renders a diagram and exports the doc", { timeout: BROWSER_TIMEOUT_MS }, async () => {
    const rendered = await callJson(client, "render_diagram", {
      source: "flowchart LR\n  a --> b",
    });
    expect(rendered.body).toMatchObject({ ok: true, path: "docs/architecture/diagram.svg" });
    expect(await readFile(join(root, "docs/architecture/diagram.svg"), "utf8")).toContain("<svg");

    const exported = await callJson(client, "export_architecture_md", {
      ...SAMPLE_ARCHITECTURE,
      diagramPath: "docs/architecture/diagram.svg",
    });
    expect(exported.body).toMatchObject({ ok: true, path: "ARCHITECTURE.md" });
  });

  it("finds and returns reference patterns", async () => {
    const listed = await callJson(client, "list_patterns", {
      query: "ask questions over our docs",
    });
    const [best] = listed.body.patterns as { id: string }[];
    expect(best?.id).toBe("rag-app");
    const pattern = await callJson(client, "get_pattern", { id: "rag-app" });
    expect(pattern.body).toMatchObject({ ok: true, id: "rag-app" });
  });
});
