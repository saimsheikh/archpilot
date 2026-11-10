# Show HN post

**Title:** Show HN: Archpilot – make your coding agent plan the architecture before it codes

**URL:** https://github.com/saimsheikh/archpilot

**Text:**

archpilot is an MCP server plus a Claude Code skill. Before any code is written, it
interviews you about the project (in rounds of at most 3 to 4 questions, each with a
default), picks the closest of 8 opinionated reference architectures, checks the design
against a list of commonly forgotten concerns, runs a pre-mortem (top 5 ways it fails, with
mitigations), and then writes a validated Mermaid diagram plus an ARCHITECTURE.md. The doc
ends with rules for the coding agent: follow this architecture, and flag deviations instead
of making them silently.

The server side is deliberately boring and deterministic: validate_diagram (mermaid-cli
behind a renderer interface, with structured errors like `{code: "BAD_ARROW", line: 2, hint:
"use -->"}` so the model can repair), render_diagram, export_architecture_md, and
list_patterns/get_pattern. Output paths are confined to the project (traversal and symlink
escapes rejected), and mermaid-cli is never called through a shell.

I tried to measure it rather than just demo it. 10 project ideas, Claude Sonnet, compared
against a plain "Draw me an architecture diagram for this project. Use Mermaid":

- Concerns covered (auth, data store, failure handling, observability, cost, security): 5.9/6
  on average vs 3.5/6
- Cost came up in 9/10 plans vs 1/10
- Failure handling in 10/10 vs 5/10

Caveats, which I think matter more than the numbers:

- The rubric is keyword evidence that a topic is mentioned, not a judgment of whether the
  design is good. The archpilot prompt includes the checklist, so part of the gap is simply
  the method asking for those topics.
- Sonnet produced valid Mermaid on the first try in all 20 runs, so the repair loop never
  triggered. It is unit-tested, but I have no evidence yet that it helps in practice.
- Pattern retrieval is keyword-based. It scores 90% top-1 on 20 queries I wrote, but on the
  10 eval ideas 4 got a poor-fit pattern. In 3 of those the model explicitly rejected it.
- n=10, one run each. The eval can't interview, so the model assumes defaults.

All prompts and model outputs are committed, so the results can be re-scored with
`npm run eval -- --replay`.

v1 is greenfield only. Next up are a relevance threshold for retrieval, more patterns, and
later existing-repo mode plus drift detection between ARCHITECTURE.md and the code.

I'd especially like feedback on the pre-mortem prompts and on which reference architectures
are missing.
