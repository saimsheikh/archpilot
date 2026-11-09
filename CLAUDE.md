# planfirst: pre-build architecture planner (Skill + MCP server)

## What this is
A planning tool for Claude Code and other MCP clients. Before a user writes any code, it:
1. Interviews them about the idea, scale, constraints, budget.
2. Proposes an architecture with trade-offs and a pre-mortem (why it might fail).
3. Outputs a validated, rendered diagram (SVG/PNG), the Mermaid source, and an ARCHITECTURE.md that the coding agent follows as a contract.

Two deliverables:
- **Skill** (`skills/planfirst/SKILL.md`): the brain. Interview flow, heuristics, pre-mortem checklist, output template.
- **MCP server** (`src/`): the hands. Deterministic tools for validating, rendering, exporting, and pattern lookup.

The differentiator is NOT drawing diagrams. It is asking the questions the user forgot and making the diagram a contract. Never let scope drift into "generic diagram tool".

## Scope for v1
- Greenfield only (idea -> architecture). Existing-repo analysis is phase 2. Do not build it now.
- Mermaid only, behind a renderer interface so D2/Excalidraw can be added later.

## Stack
- TypeScript (strict mode), Node 20+, ESM.
- `@modelcontextprotocol/sdk` for the server, stdio transport.
- `@mermaid-js/mermaid-cli` for validation and rendering.
- `zod` for tool input schemas, `vitest` for tests, `eslint` + `prettier`.
- Before using any library API, check its current docs. Do not rely on memory for SDK signatures; they change.

## Architecture rules
- Layers: `tools/` (MCP handlers, thin) -> `services/` (logic) -> `renderers/` (behind an interface) and `patterns/` (data loading). Handlers contain no business logic.
- `DiagramRenderer` interface: `validate(source)`, `render(source, format)`. `MermaidRenderer` implements it. Tools depend on the interface only.
- Tool errors are structured: `{ ok: false, error: { code, message, line?, hint? } }`. Never throw raw strings or stack traces at the model.
- Render timeouts, output size limits, and temp-file cleanup are mandatory. Never pass model-generated text to a shell; use argument arrays and write source to a temp file.
- Output paths are restricted to the user's project directory. Reject path traversal.

## Tools (MCP)
- `validate_diagram`: returns ok, or structured error with line and a repair hint.
- `render_diagram`: validates, then renders to svg/png. Returns file path.
- `export_architecture_md`: writes ARCHITECTURE.md from structured input (components, data flow, decisions, risks, diagram path).
- `list_patterns` / `get_pattern`: reference architectures (RAG app, multi-tenant SaaS, event-driven pipeline, agent system, mobile + API backend).

## Code quality (non-negotiable)
- Clean, small, single-purpose functions. No duplication; refactor as you go.
- Names explain intent. Comments explain why, not what.
- Every service and renderer has unit tests. No feature is done without tests passing.
- No `any`. No dead code. No unused dependencies.
- Conventional commits, one logical change per commit.

## Definition of done for each phase
- `npm run lint`, `npm run typecheck`, `npm test` all pass.
- README section for the phase is updated.
- Short summary of what changed and what is still risky.

## Working style
- Plan briefly, then build. Ask me only when a decision is genuinely mine; otherwise pick the sensible default and note it.
- Build in the phase order from PROMPTS.md. Do not jump ahead.