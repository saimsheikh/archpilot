import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPingTool } from "./tools/ping.js";

export const SERVER_NAME = "planfirst";
export const SERVER_VERSION = "0.0.0";

/** Builds the server with all tools registered, independent of transport so tests can reuse it. */
export function createServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  registerPingTool(server);
  return server;
}
