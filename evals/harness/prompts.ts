import { z } from "zod";
import { architectureDocSchema } from "../../src/services/architecture-doc.js";
import type { DiagramError } from "../../src/renderers/diagram-renderer.js";

export interface Idea {
  id: string;
  kind: string;
  description: string;
}

export const planSchema = z.object({
  mermaid: z.string().min(1),
  architecture: architectureDocSchema,
});
export type Plan = z.infer<typeof planSchema>;

export interface PlanningContext {
  /** Full markdown of the top retrieved patterns, best keyword match first. */
  candidatePatterns: string[];
  forgottenConcerns: string;
  premortemGuide: string;
}

// Mirrors the skill: candidates are ranked by keyword overlap, so the model judges fit.
function candidatesSection(candidates: readonly string[]): string {
  if (candidates.length === 0) {
    return "No reference architecture matched; design from first principles.";
  }
  return [
    "Candidate reference architectures, ranked by keyword overlap (not by fit). Pick the one",
    "that genuinely fits this project and adapt it, or use none. State your choice and the",
    "deviations in architecture.decisions.",
    "",
    candidates.join("\n\n---\n\n"),
  ].join("\n");
}

/** Plain prompt with no interview, checklist or validation: the comparison baseline. */
export function baselinePrompt(idea: Idea): string {
  return `Draw me an architecture diagram for this project. Use Mermaid.\n\nProject: ${idea.description}`;
}

/**
 * Non-interactive version of the archpilot skill: the eval cannot answer interview
 * questions, so the model is told to assume defaults and record them as open questions.
 */
export function archpilotPrompt(idea: Idea, context: PlanningContext): string {
  const schema = JSON.stringify(z.toJSONSchema(planSchema), null, 2);
  return [
    "You are planning a software architecture before any code is written.",
    "The user is not available for an interview: assume sensible defaults for anything",
    "unspecified and list each assumption in architecture.openQuestions.",
    "",
    `Project: ${idea.description}`,
    "",
    candidatesSection(context.candidatePatterns),
    "",
    "Check every concern below. Each must be handled by a component or decision, or noted",
    "as not needed with a reason:",
    "",
    context.forgottenConcerns,
    "",
    "Run a pre-mortem and put the top 5 risks in architecture.risks:",
    "",
    context.premortemGuide,
    "",
    "Size the design to the stated scale; avoid over-engineering.",
    "The Mermaid diagram must be a flowchart with one node per component. Quote labels",
    'that contain special characters (A["Auth (SSO)"]) and never use reserved ids like end.',
    "",
    "Respond with only one JSON object in a ```json block, matching this JSON Schema:",
    "",
    schema,
  ].join("\n");
}

export function repairPrompt(source: string, error: DiagramError): string {
  return [
    "This Mermaid diagram failed validation.",
    "",
    `Error: ${JSON.stringify(error)}`,
    "",
    "```mermaid",
    source,
    "```",
    "",
    "Fix only the problem the error points at. Respond with only the corrected diagram in a",
    "```mermaid block.",
  ].join("\n");
}

export function simplifyPrompt(source: string): string {
  return [
    "This Mermaid diagram keeps failing validation. Rewrite it as the simplest valid",
    "flowchart: plain `id[Label]` nodes with alphanumeric ids, `-->` links, no subgraphs,",
    "no styling, no edge labels, no special characters in labels.",
    "",
    "```mermaid",
    source,
    "```",
    "",
    "Respond with only the diagram in a ```mermaid block.",
  ].join("\n");
}

export function fixJsonPrompt(response: string, problem: string): string {
  return [
    "Your previous response was not valid JSON for the required schema.",
    `Problem: ${problem}`,
    "",
    "Previous response:",
    response,
    "",
    "Respond again with only the corrected JSON object in a ```json block.",
  ].join("\n");
}
