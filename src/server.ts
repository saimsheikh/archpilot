import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DiagramRenderer } from "./renderers/diagram-renderer.js";
import { ArchitectureService } from "./services/architecture-service.js";
import { DiagramService } from "./services/diagram-service.js";
import { registerArchitectureTools } from "./tools/architecture-tools.js";
import { registerDiagramTools } from "./tools/diagram-tools.js";

export const SERVER_NAME = "archpilot";
export const SERVER_VERSION = "0.1.0";

export interface ServerDependencies {
  renderer: DiagramRenderer;
  /** Every file the server writes must stay inside this directory. */
  projectRoot: string;
}

/** Builds the server with all tools registered, independent of transport so tests can reuse it. */
export function createServer({ renderer, projectRoot }: ServerDependencies): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  registerDiagramTools(server, new DiagramService(renderer, projectRoot));
  registerArchitectureTools(server, new ArchitectureService(projectRoot));
  return server;
}
