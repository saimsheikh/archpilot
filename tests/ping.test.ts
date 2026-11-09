import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";
import { PING_TOOL } from "../src/tools/ping.js";

async function connectClient(): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await createServer().connect(serverTransport);
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await client.connect(clientTransport);
  return client;
}

describe("ping tool", () => {
  it("is listed", async () => {
    const client = await connectClient();
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name)).toContain(PING_TOOL);
  });

  it("returns pong", async () => {
    const client = await connectClient();
    const result = await client.callTool({ name: PING_TOOL, arguments: {} });
    expect(result.content).toEqual([{ type: "text", text: "pong" }]);
  });
});
