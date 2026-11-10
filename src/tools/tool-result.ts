import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Result, ToolError } from "../shared/result.js";

/**
 * Converts a service result to an MCP tool result. Both outcomes are JSON so the model can
 * read `error.code`, `line` and `hint` and repair its input.
 */
export function toToolResult<T>(result: Result<T, ToolError>): CallToolResult {
  const body = result.ok ? { ok: true, ...toObject(result.value) } : result;
  return {
    content: [{ type: "text", text: JSON.stringify(body, null, 2) }],
    ...(result.ok ? {} : { isError: true }),
  };
}

function toObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? { ...value } : { value };
}
