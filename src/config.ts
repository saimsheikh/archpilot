import { resolve } from "node:path";
import { DEFAULT_MERMAID_OPTIONS, type MermaidRendererOptions } from "./renderers/mermaid/mermaid-renderer.js";

export interface AppConfig {
  projectRoot: string;
  renderer: MermaidRendererOptions;
}

function positiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

/**
 * Reads configuration from the environment. MCP clients start the server in the user's
 * project directory, so the working directory is the default project root.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    projectRoot: resolve(env.ARCHPILOT_PROJECT_ROOT ?? process.cwd()),
    renderer: {
      timeoutMs: positiveInt(env.ARCHPILOT_RENDER_TIMEOUT_MS, DEFAULT_MERMAID_OPTIONS.timeoutMs),
      maxSourceBytes: positiveInt(env.ARCHPILOT_MAX_SOURCE_BYTES, DEFAULT_MERMAID_OPTIONS.maxSourceBytes),
      maxOutputBytes: positiveInt(env.ARCHPILOT_MAX_OUTPUT_BYTES, DEFAULT_MERMAID_OPTIONS.maxOutputBytes),
      puppeteerConfigPath: env.ARCHPILOT_PUPPETEER_CONFIG,
    },
  };
}
