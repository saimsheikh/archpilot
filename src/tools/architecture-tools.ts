import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { architectureDocSchema } from "../services/architecture-doc.js";
import type { ArchitectureService } from "../services/architecture-service.js";
import { toToolResult } from "./tool-result.js";

export function registerArchitectureTools(
  server: McpServer,
  architecture: ArchitectureService,
): void {
  server.registerTool(
    "export_architecture_md",
    {
      title: "Export ARCHITECTURE.md",
      description:
        "Writes the architecture contract (summary, components, data flow, decisions, pre-mortem, diagram, open questions, rules for the coding agent) as markdown inside the project.",
      inputSchema: {
        ...architectureDocSchema.shape,
        outputPath: z.string().default("ARCHITECTURE.md").describe("Project-relative .md path"),
      },
    },
    async ({ outputPath, ...doc }) => toToolResult(await architecture.export(doc, outputPath)),
  );
}
