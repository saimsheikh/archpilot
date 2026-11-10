const MERMAID_BLOCK = /```mermaid\s*\r?\n([\s\S]*?)```/;
const JSON_BLOCK = /```(?:json)?\s*\r?\n(\{[\s\S]*\})\s*```/;

/** First ```mermaid block in a model response, or undefined. */
export function extractMermaid(text: string): string | undefined {
  return MERMAID_BLOCK.exec(text)?.[1]?.trim();
}

/** Parses the JSON object in a response: a fenced block if present, else the outermost braces. */
export function extractJson(text: string): unknown {
  const fenced = JSON_BLOCK.exec(text)?.[1];
  const candidate = fenced ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  if (!candidate) return undefined;
  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    return undefined;
  }
}
