#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { installSkill, skillTarget } from "./cli/install-skill.js";
import { loadConfig } from "./config.js";
import { loadPatterns } from "./patterns/pattern-loader.js";
import { MermaidRenderer } from "./renderers/mermaid/mermaid-renderer.js";
import { createRetriever } from "./services/retrieval/create-retriever.js";
import { createServer } from "./server.js";
import { VERSION } from "./version.js";

const USAGE = `archpilot-mcp ${VERSION}

Usage:
  archpilot-mcp                          Start the MCP server on stdio (what MCP clients run)
  archpilot-mcp install-skill            Install the planning skill for all projects (~/.claude/skills)
  archpilot-mcp install-skill --project  Install it for this project only (./.claude/skills)
  archpilot-mcp --version | --help`;

async function startServer(): Promise<void> {
  const config = loadConfig();
  const patterns = await loadPatterns();
  const server = createServer({
    renderer: new MermaidRenderer(config.renderer),
    projectRoot: config.projectRoot,
    patterns,
    retriever: createRetriever(config.retriever, patterns),
  });
  await server.connect(new StdioServerTransport());
}

async function main(args: readonly string[]): Promise<void> {
  const [command, ...rest] = args;
  if (command === undefined) {
    await startServer();
  } else if (command === "--version") {
    console.log(VERSION);
  } else if (command === "--help" || command === "-h") {
    console.log(USAGE);
  } else if (command === "install-skill") {
    const target = skillTarget(rest.includes("--project") ? "project" : "user", process.cwd());
    await installSkill(target);
    console.log(`Installed the archpilot skill to ${target}`);
  } else {
    console.error(`Unknown command '${command}'.\n\n${USAGE}`);
    process.exitCode = 2;
  }
}

main(process.argv.slice(2)).catch((error: unknown) => {
  // In server mode stdout carries the MCP protocol, so diagnostics must go to stderr.
  console.error("archpilot-mcp failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
