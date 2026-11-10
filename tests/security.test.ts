import { describe, expect, it, vi } from "vitest";
import { loadConfig } from "../src/config.js";
import type { DiagramRenderer } from "../src/renderers/diagram-renderer.js";
import { Semaphore } from "../src/shared/semaphore.js";
import { callJson, connectClient, makeProject } from "./helpers/project.js";

const throwingRenderer: DiagramRenderer = {
  validate: () => Promise.reject(new Error("EACCES: permission denied, open 'C:\\secret\\x'")),
  render: () => Promise.reject(new Error("boom /home/user/private")),
};

describe("unexpected failures", () => {
  it("are returned as INTERNAL_ERROR without leaking the exception", async () => {
    const stderr = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const client = await connectClient(throwingRenderer, await makeProject());
    const result = await callJson(client, "validate_diagram", { source: "flowchart TD" });
    expect(result.body).toMatchObject({ ok: false, error: { code: "INTERNAL_ERROR" } });
    expect(JSON.stringify(result.body)).not.toMatch(/secret|EACCES/);
    expect(stderr).toHaveBeenCalled();
    stderr.mockRestore();
  });
});

describe("input limits", () => {
  it("rejects oversized tool input at the schema", async () => {
    const client = await connectClient(throwingRenderer, await makeProject());
    const result = await client.callTool({
      name: "validate_diagram",
      arguments: { source: "x".repeat(500_001) },
    });
    expect(result.isError).toBe(true);
  });
});

describe("Semaphore", () => {
  it("never runs more than the limit at once", async () => {
    const semaphore = new Semaphore(2);
    let running = 0;
    let peak = 0;
    const task = async (): Promise<void> => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running--;
    };
    await Promise.all(Array.from({ length: 6 }, () => semaphore.run(task)));
    expect(peak).toBe(2);
  });

  it("releases the slot when a task throws", async () => {
    const semaphore = new Semaphore(1);
    await expect(semaphore.run(() => Promise.reject(new Error("x")))).rejects.toThrow("x");
    await expect(semaphore.run(() => Promise.resolve("ok"))).resolves.toBe("ok");
  });
});

describe("loadConfig", () => {
  it("reads overrides and ignores invalid numbers", () => {
    const config = loadConfig({
      ARCHPILOT_PROJECT_ROOT: "/tmp/project",
      ARCHPILOT_RENDER_TIMEOUT_MS: "5000",
      ARCHPILOT_MAX_SOURCE_BYTES: "-1",
    });
    expect(config.renderer.timeoutMs).toBe(5000);
    expect(config.renderer.maxSourceBytes).toBe(50_000);
    expect(config.projectRoot).toMatch(/project$/);
  });
});
