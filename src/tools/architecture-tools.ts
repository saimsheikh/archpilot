import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { architectureDocSchema } from "../services/architecture-doc.js";
import type { ArchitectureService } from "../services/architecture-service.js";
import { runTool } from "./tool-result.js";

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
        outputPath: z
          .string()
          .max(500)
          .default("ARCHITECTURE.md")
          .describe("Project-relative .md path"),
      },
    },
    ({ outputPath, ...doc }) =>
      runTool("export_architecture_md", () => architecture.export(doc, outputPath)),
  );
}
