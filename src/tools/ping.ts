import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export const PING_TOOL = "ping";

// Placeholder health check so clients can confirm the server is wired up; replaced by real tools in Phase 2.
export function registerPingTool(server: McpServer): void {
  server.registerTool(
    PING_TOOL,
    { title: "Ping", description: "Health check. Returns 'pong'." },
    () => ({ content: [{ type: "text", text: "pong" }] }),
  );
}
