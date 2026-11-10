import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PatternService } from "../services/pattern-service.js";
import { runTool } from "./tool-result.js";

export function registerPatternTools(server: McpServer, patterns: PatternService): void {
  server.registerTool(
    "list_patterns",
    {
      title: "List reference architectures",
      description:
        "Lists reference architecture patterns. Pass a project description as `query` to get the closest matches ranked first.",
      inputSchema: {
        query: z.string().max(5000).optional().describe("Free-text description of the project"),
        limit: z.number().int().min(1).max(20).default(5),
      },
      annotations: { readOnlyHint: true },
    },
    (input) =>
      runTool("list_patterns", () => Promise.resolve(patterns.list(input.query, input.limit))),
  );

  server.registerTool(
    "get_pattern",
    {
      title: "Get reference architecture",
      description:
        "Returns one pattern: components, trade-offs, failure modes, cost drivers, what not to use it for, and a Mermaid diagram.",
      inputSchema: { id: z.string().max(100).describe("Pattern id from list_patterns") },
      annotations: { readOnlyHint: true },
    },
    (input) => runTool("get_pattern", () => Promise.resolve(patterns.get(input.id))),
  );
}
