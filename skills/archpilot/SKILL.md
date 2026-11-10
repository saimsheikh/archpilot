---
name: archpilot
description: >
  Plan a software project's architecture before any code is written. Use when the user wants
  to plan, design or architect a new project, app, system or feature ("how should I build X",
  "design the architecture for", "plan before coding", "what stack should I use", "system
  design for my idea"). Interviews the user, picks a reference architecture, runs a
  pre-mortem, then produces a validated diagram and an ARCHITECTURE.md the coding agent
  follows as a contract. Not for reviewing or changing an existing codebase.
---

# archpilot: plan first, then build

Your job is to ask the questions the user forgot, make the trade-offs explicit, and turn the
result into a contract (`ARCHITECTURE.md` + diagram) before anyone writes code.

Do not write application code in this skill. The deliverable is the plan.

## Tools you use (archpilot MCP server)

| Tool                     | Use it to                                                               |
| ------------------------ | ----------------------------------------------------------------------- |
| `list_patterns`          | Find reference architectures; pass the project description as `query`.  |
| `get_pattern`            | Read one pattern: components, trade-offs, failure modes, diagram.       |
| `validate_diagram`       | Check Mermaid source; returns `{ code, message, line, hint }` on error. |
| `render_diagram`         | Render the validated diagram to svg/png inside the project.             |
| `export_architecture_md` | Write the final `ARCHITECTURE.md`.                                      |

If the tools are not available, say so and give the install command from the archpilot
README; you may still run the interview and write the plan in chat.

## Workflow

Follow these steps in order. Tell the user which step you are on in one short line.

### 1. Interview (rounds of at most 3 to 4 questions)

Never send a wall of questions. Ask one round, wait for answers, then ask the next.

- Skip anything the user already told you. Restate what you know first, in 2 to 3 lines.
- Offer a sensible default with each question, so "use the default" is a valid answer.
- Ask the highest-impact unknowns first; stop when the remaining unknowns would not change
  the architecture.

Cover, across rounds (details and default answers in
[references/interview-guide.md](references/interview-guide.md)):

1. Users and the core job-to-be-done
2. Scale: users, requests per second, data size and growth
3. Latency expectations
4. Data sensitivity and compliance (PII, payments, health, residency)
5. Budget (monthly infra and third-party spend)
6. Team size and skills
7. Deployment target (cloud, on-prem, edge, mobile stores)
8. Build-vs-buy preferences (auth, payments, search, LLMs)
9. The one thing that must not fail

Usually two or three rounds are enough. If the user wants to skip the interview, proceed with
stated defaults and list them as assumptions.

### 2. Match a reference architecture

Call `list_patterns` with a one-paragraph summary of the project as `query`, then
`get_pattern` on the best match (and the runner-up if scores are close).

- Say which pattern you chose and why, in one or two sentences.
- List every deviation from the pattern and the reason (e.g. "no reranker: corpus is 200
  docs").
- If nothing fits, say so and design from first principles; do not force a pattern.

### 3. Draft the architecture

Produce, in chat, a concise draft:

- **Components**: name, responsibility, technology. Prefer boring, managed technology
  unless an answer from the interview demands otherwise.
- **Data flow**: numbered steps for the main request path and the main write path.
- **Key decisions**: for each, the choice, why, the trade-off, and the alternatives you
  rejected and why.

Walk through [references/forgotten-concerns.md](references/forgotten-concerns.md) and make
sure each concern is either handled by a component/decision or explicitly marked "not needed
because ...". Do not paste the whole checklist to the user.

Size the design to the answers: a 50-user internal tool does not get Kafka. Call out
over-engineering as readily as gaps.

### 4. Pre-mortem

Assume it is a year later and the project failed. Give the **top 5 ways this design fails**,
covering at least scaling, cost, vendor dependency, data-pipeline fragility and security
(use [references/premortem.md](references/premortem.md)). For each: what happens, how
likely (low/medium/high), and one concrete mitigation. Fold the mitigations back into the
design when they are cheap.

Ask the user to confirm or adjust the draft before generating artifacts. One round only;
do not reopen the whole interview.

### 5. Diagram with a repair loop

Write a Mermaid `flowchart` (or C4/sequence if it fits better) of the components and data
flow, then call `validate_diagram`.

On error, read `code`, `line` and `hint`, fix that exact problem, and validate again:

- Retry at most **3 times**.
- Fix only what the error points at; do not rewrite the whole diagram each time.
- Common fixes: quote labels with special characters (`A["Auth (SSO)"]`), rename
  reserved ids like `end`, use `-->` not `->`.
- If it still fails after 3 retries, **simplify**: drop styling, subgraphs and edge labels,
  use plain `A[Label] --> B[Label]` nodes, and validate once more.

Diagram rules: one node per component from step 3, ids in camelCase, labels short,
data stores as `[(Name)]`, external actors as `([Name])`.

### 6. Render and export

1. Call `render_diagram` with the validated source (default
   `docs/architecture/diagram.svg`).
2. Call `export_architecture_md` with the summary, components, data flow, decisions
   (with rejected alternatives), pre-mortem risks, `diagramPath` from step 1, the Mermaid
   source, and open questions. Default output is `ARCHITECTURE.md` in the project root.

If either call fails with a path error, use the hint and retry with a path inside the
project. If rendering is unavailable, still export the doc with the Mermaid source.

### 7. Finish

End with, in this order:

- A 3 to 5 line summary of the architecture.
- The files written.
- Open questions that still need the user.
- **The exact first build step**: one concrete task, e.g. "Scaffold the API service with
  auth middleware and a health check; no business endpoints yet."

Remind the coding agent (and the user) that `ARCHITECTURE.md` is the contract: deviations
must be flagged, not made silently.

## Style

- Plain language. Define jargon the first time if the user seems non-technical.
- Recommend; do not list five options with no opinion.
- Numbers over adjectives: "about 40 requests/s at peak", not "high traffic".
- Be honest about uncertainty and about what this plan does not cover.
