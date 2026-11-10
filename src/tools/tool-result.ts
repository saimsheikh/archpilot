import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Result, ToolError } from "../shared/result.js";

/**
 * Converts a service result to an MCP tool result. Both outcomes are JSON so the model can
 * read `error.code`, `line` and `hint` and repair its input.
 */
function toToolResult<T>(result: Result<T>): CallToolResult {
  const body = result.ok ? { ok: true, ...toObject(result.value) } : result;
  return {
    content: [{ type: "text", text: JSON.stringify(body, null, 2) }],
    ...(result.ok ? {} : { isError: true }),
  };
}

const INTERNAL_ERROR: ToolError = {
  code: "INTERNAL_ERROR",
  message: "The tool failed unexpectedly.",
  hint: "Retry once; if it fails again, report the server log (stderr) to the maintainer.",
};

/**
 * Runs a tool body and turns unexpected exceptions into a generic structured error. Raw
 * exception messages can contain absolute paths, so they go to stderr, never to the model.
 */
export async function runTool<T>(
  tool: string,
  work: () => Promise<Result<T>>,
): Promise<CallToolResult> {
  try {
    return toToolResult(await work());
  } catch (error: unknown) {
    console.error(`[archpilot] ${tool} failed:`, error);
    return toToolResult({ ok: false, error: INTERNAL_ERROR });
  }
}

function toObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? { ...value } : { value };
}
