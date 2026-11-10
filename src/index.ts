#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { installBrowser } from "./cli/install-browser.js";
import { installSkill, skillTarget, type SkillScope } from "./cli/install-skill.js";
import { loadConfig } from "./config.js";
import { loadPatterns } from "./patterns/pattern-loader.js";
import { MermaidRenderer } from "./renderers/mermaid/mermaid-renderer.js";
import { createRetriever } from "./services/retrieval/create-retriever.js";
import { createServer } from "./server.js";
import { VERSION } from "./version.js";

const USAGE = `archpilot-mcp ${VERSION}

Usage:
  archpilot-mcp                          Start the MCP server on stdio (what MCP clients run)
  archpilot-mcp setup [--project]        Install headless Chromium and the planning skill
  archpilot-mcp install-browser          Install only headless Chromium for diagram rendering
  archpilot-mcp install-skill [--project]
                                         Install only the skill: ~/.claude/skills (default)
                                         or ./.claude/skills with --project
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

async function runBrowserInstall(): Promise<boolean> {
  console.log("Installing headless Chromium for diagram rendering...");
  const code = await installBrowser();
  if (code !== 0) {
    console.error(`Browser install failed (exit ${String(code)}).`);
    process.exitCode = code;
  }
  return code === 0;
}

async function runSkillInstall(scope: SkillScope): Promise<void> {
  const target = skillTarget(scope, process.cwd());
  await installSkill(target);
  console.log(`Installed the archpilot skill to ${target}`);
}

async function main(args: readonly string[]): Promise<void> {
  const [command, ...rest] = args;
  const scope: SkillScope = rest.includes("--project") ? "project" : "user";
  if (command === undefined) {
    await startServer();
  } else if (command === "--version") {
    console.log(VERSION);
  } else if (command === "--help" || command === "-h") {
    console.log(USAGE);
  } else if (command === "setup") {
    if (await runBrowserInstall()) {
      await runSkillInstall(scope);
      console.log("Done. Add the server to Claude Code if you have not yet (see the README).");
    }
  } else if (command === "install-browser") {
    await runBrowserInstall();
  } else if (command === "install-skill") {
    await runSkillInstall(scope);
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
