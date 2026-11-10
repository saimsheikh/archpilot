import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FAKE_ERROR, FakeRenderer } from "../helpers/fake-renderer.js";
import { callJson, connectClient, makeProject } from "../helpers/project.js";
import { SAMPLE_ARCHITECTURE } from "../helpers/sample-architecture.js";

async function setup() {
  const root = await makeProject();
  const renderer = new FakeRenderer();
  return { root, renderer, client: await connectClient(renderer, root) };
}

describe("tool registry", () => {
  it("lists the v1 tools", async () => {
    const { client } = await setup();
    const names = (await client.listTools()).tools.map((tool) => tool.name).sort();
    expect(names).toEqual([
      "export_architecture_md",
      "get_pattern",
      "list_patterns",
      "render_diagram",
      "validate_diagram",
    ]);
  });
});

describe("validate_diagram", () => {
  it("returns ok for valid source", async () => {
    const { client } = await setup();
    const result = await callJson(client, "validate_diagram", { source: "flowchart TD" });
    expect(result).toEqual({ isError: false, body: { ok: true, diagramType: "flowchart" } });
  });

  it("returns the structured error for invalid source", async () => {
    const { client } = await setup();
    const result = await callJson(client, "validate_diagram", { source: "INVALID" });
    expect(result).toEqual({ isError: true, body: { ok: false, error: FAKE_ERROR } });
  });

  it("rejects missing input via the schema", async () => {
    const { client } = await setup();
    const result = await client.callTool({ name: "validate_diagram", arguments: {} });
    expect(result.isError).toBe(true);
  });
});

describe("render_diagram", () => {
  it("writes to the default path and returns it", async () => {
    const { client, root } = await setup();
    const result = await callJson(client, "render_diagram", { source: "flowchart TD" });
    expect(result.body).toMatchObject({ ok: true, path: "docs/architecture/diagram.svg" });
    expect(await readFile(join(root, "docs/architecture/diagram.svg"), "utf8")).toBe("<fake svg>");
  });

  it("checks the path before rendering", async () => {
    const { client, renderer } = await setup();
    const result = await callJson(client, "render_diagram", {
      source: "flowchart TD",
      outputPath: "../../etc/evil.svg",
    });
    expect(result.body).toMatchObject({ ok: false, error: { code: "PATH_OUTSIDE_PROJECT" } });
    expect(renderer.calls).toEqual([]);
  });

  it("requires the extension to match the format", async () => {
    const { client } = await setup();
    const result = await callJson(client, "render_diagram", {
      source: "flowchart TD",
      format: "png",
      outputPath: "d.svg",
    });
    expect(result.body).toMatchObject({ error: { code: "INVALID_OUTPUT_PATH" } });
  });

  it("returns render errors unchanged", async () => {
    const { client } = await setup();
    const result = await callJson(client, "render_diagram", { source: "INVALID" });
    expect(result.body).toEqual({ ok: false, error: FAKE_ERROR });
  });
});

describe("export_architecture_md", () => {
  it("writes ARCHITECTURE.md with a diagram link relative to the doc", async () => {
    const { client, root } = await setup();
    const result = await callJson(client, "export_architecture_md", {
      ...SAMPLE_ARCHITECTURE,
      diagramPath: "docs/architecture/diagram.svg",
      outputPath: "docs/ARCHITECTURE.md",
    });
    expect(result.body).toMatchObject({ ok: true, path: "docs/ARCHITECTURE.md" });
    const markdown = await readFile(join(root, "docs/ARCHITECTURE.md"), "utf8");
    expect(markdown).toContain("](architecture/diagram.svg)");
  });

  it("defaults to ARCHITECTURE.md in the project root", async () => {
    const { client, root } = await setup();
    await callJson(client, "export_architecture_md", SAMPLE_ARCHITECTURE);
    expect(await readFile(join(root, "ARCHITECTURE.md"), "utf8")).toContain("# Recipe Box");
  });

  it("rejects a path outside the project", async () => {
    const { client } = await setup();
    const result = await callJson(client, "export_architecture_md", {
      ...SAMPLE_ARCHITECTURE,
      outputPath: "../ARCHITECTURE.md",
    });
    expect(result.body).toMatchObject({ error: { code: "PATH_OUTSIDE_PROJECT" } });
  });

  it("rejects incomplete input via the schema", async () => {
    const { client } = await setup();
    const result = await client.callTool({
      name: "export_architecture_md",
      arguments: { ...SAMPLE_ARCHITECTURE, decisions: [] },
    });
    expect(result.isError).toBe(true);
  });
});
