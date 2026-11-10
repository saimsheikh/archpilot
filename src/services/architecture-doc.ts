import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);

export const architectureDocSchema = z.object({
  title: text(120).describe("Project name"),
  summary: text(4000).describe("What the system does, for whom, and the core job-to-be-done"),
  components: z
    .array(
      z.object({
        name: text(120),
        responsibility: text(1000),
        technology: text(200).optional(),
      }),
    )
    .min(1)
    .max(50),
  dataFlow: z
    .array(z.object({ from: text(120), to: text(120), description: text(1000) }))
    .max(100)
    .default([]),
  decisions: z
    .array(
      z.object({
        decision: text(300),
        rationale: text(2000),
        tradeoffs: text(2000),
        alternativesRejected: z.array(text(500)).max(10).default([]),
      }),
    )
    .min(1)
    .max(30),
  risks: z
    .array(
      z.object({
        risk: text(500),
        category: z
          .enum(["scaling", "cost", "vendor", "data", "security", "reliability", "other"])
          .default("other"),
        likelihood: z.enum(["low", "medium", "high"]).default("medium"),
        mitigation: text(1000),
      }),
    )
    .min(1)
    .max(30)
    .describe("Pre-mortem: how this design fails, with a mitigation each"),
  diagramPath: text(500).optional().describe("Project-relative path of the rendered diagram"),
  mermaidSource: z.string().max(50_000).optional().describe("Mermaid source of the diagram"),
  openQuestions: z.array(text(500)).max(30).default([]),
});

export type ArchitectureDoc = z.infer<typeof architectureDocSchema>;

const AGENT_RULES = [
  "Follow this architecture. Components, boundaries and data flow above are the contract.",
  "If a change requires deviating from it, stop and flag the deviation with the reason instead of silently changing the design.",
  "Do not add components, services or dependencies that are not listed here without flagging them first.",
  "Address the mitigations in the pre-mortem as you build the affected components.",
  "Resolve open questions with the user before building the parts they affect.",
];

// Table cells cannot contain raw pipes or newlines.
function cell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function bullets(items: readonly string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function componentsSection(doc: ArchitectureDoc): string {
  const rows = doc.components.map(
    (c) => `| ${cell(c.name)} | ${cell(c.responsibility)} | ${cell(c.technology ?? "TBD")} |`,
  );
  return ["| Component | Responsibility | Technology |", "| --- | --- | --- |", ...rows].join(
    "\n",
  );
}

function dataFlowSection(doc: ArchitectureDoc): string {
  if (doc.dataFlow.length === 0) return "_Not specified._";
  return doc.dataFlow
    .map((step, index) => `${String(index + 1)}. **${step.from} → ${step.to}**: ${step.description}`)
    .join("\n");
}

function decisionsSection(doc: ArchitectureDoc): string {
  return doc.decisions
    .map((d) => {
      const lines = [
        `### ${d.decision}`,
        "",
        `- **Why:** ${d.rationale}`,
        `- **Trade-offs:** ${d.tradeoffs}`,
      ];
      if (d.alternativesRejected.length > 0) {
        lines.push(`- **Rejected:** ${d.alternativesRejected.join("; ")}`);
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

function risksSection(doc: ArchitectureDoc): string {
  const rows = doc.risks.map(
    (r) => `| ${cell(r.risk)} | ${r.category} | ${r.likelihood} | ${cell(r.mitigation)} |`,
  );
  return ["| Risk | Category | Likelihood | Mitigation |", "| --- | --- | --- | --- |", ...rows].join(
    "\n",
  );
}

function diagramSection(doc: ArchitectureDoc, diagramLink: string | undefined): string {
  const parts: string[] = [];
  if (diagramLink) parts.push(`![Architecture diagram](${diagramLink})`);
  if (doc.mermaidSource) parts.push(["```mermaid", doc.mermaidSource.trim(), "```"].join("\n"));
  return parts.length > 0 ? parts.join("\n\n") : "_No diagram attached._";
}

/**
 * Renders the architecture contract. `diagramLink` is the diagram path relative to the
 * document, so the image resolves wherever the doc is written.
 */
export function renderArchitectureDoc(doc: ArchitectureDoc, diagramLink?: string): string {
  const sections = [
    `# ${doc.title}: Architecture`,
    doc.summary,
    `## Diagram\n\n${diagramSection(doc, diagramLink)}`,
    `## Components\n\n${componentsSection(doc)}`,
    `## Data flow\n\n${dataFlowSection(doc)}`,
    `## Key decisions\n\n${decisionsSection(doc)}`,
    `## Risks and pre-mortem\n\n${risksSection(doc)}`,
    `## Open questions\n\n${doc.openQuestions.length > 0 ? bullets(doc.openQuestions) : "_None._"}`,
    `## Rules for the coding agent\n\n${bullets(AGENT_RULES)}`,
  ];
  return `${sections.join("\n\n")}\n`;
}
