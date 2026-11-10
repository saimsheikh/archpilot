import {
  MermaidRenderer,
  type MermaidRendererOptions,
} from "../../src/renderers/mermaid/mermaid-renderer.js";

/** Real renderer that honors ARCHPILOT_PUPPETEER_CONFIG, so CI can pass --no-sandbox. */
export function createTestRenderer(options: Partial<MermaidRendererOptions> = {}): MermaidRenderer {
  return new MermaidRenderer({
    puppeteerConfigPath: process.env.ARCHPILOT_PUPPETEER_CONFIG,
    ...options,
  });
}
