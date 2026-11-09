import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const serverEntry = fileURLToPath(new URL("../../dist/index.js", import.meta.url));

describe("stdio server (built)", () => {
  let client: Client | undefined;

  afterEach(async () => {
    await client?.close();
  });

  it("answers ping over stdio", async () => {
    client = new Client({ name: "e2e-client", version: "0.0.0" });
    await client.connect(
      new StdioClientTransport({ command: process.execPath, args: [serverEntry] }),
    );
    const result = await client.callTool({ name: "ping", arguments: {} });
    expect(result.content).toEqual([{ type: "text", text: "pong" }]);
  });
});
