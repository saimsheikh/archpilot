import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Pattern } from "./patterns/pattern.js";
import type { DiagramRenderer } from "./renderers/diagram-renderer.js";
import { ArchitectureService } from "./services/architecture-service.js";
import { DiagramService } from "./services/diagram-service.js";
import { PatternService } from "./services/pattern-service.js";
import type { PatternRetriever } from "./services/retrieval/pattern-retriever.js";
import { registerArchitectureTools } from "./tools/architecture-tools.js";
import { registerDiagramTools } from "./tools/diagram-tools.js";
import { registerPatternTools } from "./tools/pattern-tools.js";
import { VERSION } from "./version.js";

export const SERVER_NAME = "archpilot";

export interface ServerDependencies {
  renderer: DiagramRenderer;
  /** Every file the server writes must stay inside this directory. */
  projectRoot: string;
  patterns: readonly Pattern[];
  retriever: PatternRetriever;
}

/** Builds the server with all tools registered, independent of transport so tests can reuse it. */
export function createServer(deps: ServerDependencies): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: VERSION });
  registerDiagramTools(server, new DiagramService(deps.renderer, deps.projectRoot));
  registerArchitectureTools(server, new ArchitectureService(deps.projectRoot));
  registerPatternTools(server, new PatternService(deps.patterns, deps.retriever));
  return server;
}
