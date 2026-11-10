#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { MermaidRenderer } from "./renderers/mermaid/mermaid-renderer.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const server = createServer({
    renderer: new MermaidRenderer(config.renderer),
    projectRoot: config.projectRoot,
  });
  await server.connect(new StdioServerTransport());
}

main().catch((error: unknown) => {
  // stdout carries the MCP protocol, so diagnostics must go to stderr.
  console.error("archpilot-mcp failed to start:", error instanceof Error ? error.message : error);
  process.exit(1);
});
