import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { DiagramRenderer } from "../../src/renderers/diagram-renderer.js";
import { loadPatterns } from "../../src/patterns/pattern-loader.js";
import { createRetriever } from "../../src/services/retrieval/create-retriever.js";
import { createServer } from "../../src/server.js";

const created: string[] = [];

afterEach(async () => {
  await Promise.all(created.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

/** Fresh temp project directory, removed after each test. */
export async function makeProject(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "archpilot-test-project-"));
  created.push(dir);
  return dir;
}

export async function connectClient(
  renderer: DiagramRenderer,
  projectRoot: string,
): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const patterns = await loadPatterns();
  const retriever = createRetriever("bm25", patterns);
  await createServer({ renderer, projectRoot, patterns, retriever }).connect(serverTransport);
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await client.connect(clientTransport);
  return client;
}

/** Calls a tool and parses the JSON body every archpilot tool returns. */
export async function callJson(
  client: Client,
  name: string,
  args: Record<string, unknown>,
): Promise<{ isError: boolean; body: Record<string, unknown> }> {
  const result = (await client.callTool({ name, arguments: args })) as CallToolResult;
  const first = result.content[0];
  const text = first?.type === "text" ? first.text : "{}";
  return { isError: result.isError === true, body: JSON.parse(text) as Record<string, unknown> };
}
