import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DIAGRAM_FORMATS } from "../renderers/diagram-renderer.js";
import type { DiagramService } from "../services/diagram-service.js";
import { toToolResult } from "./tool-result.js";

const source = z.string().describe("Mermaid diagram source");

export function registerDiagramTools(server: McpServer, diagrams: DiagramService): void {
  server.registerTool(
    "validate_diagram",
    {
      title: "Validate diagram",
      description:
        "Checks Mermaid source. Returns ok, or a structured error {code, message, line, hint} to repair and retry.",
      inputSchema: { source },
      annotations: { readOnlyHint: true },
    },
    async (input) => toToolResult(await diagrams.validate(input.source)),
  );

  server.registerTool(
    "render_diagram",
    {
      title: "Render diagram",
      description:
        "Validates and renders Mermaid source to svg or png inside the project. Returns the written file path.",
      inputSchema: {
        source,
        format: z.enum(DIAGRAM_FORMATS).default("svg"),
        outputPath: z
          .string()
          .optional()
          .describe("Project-relative path. Defaults to docs/architecture/diagram.<format>"),
      },
    },
    async (input) =>
      toToolResult(
        await diagrams.render({
          source: input.source,
          format: input.format,
          outputPath: input.outputPath ?? `docs/architecture/diagram.${input.format}`,
        }),
      ),
  );
}
