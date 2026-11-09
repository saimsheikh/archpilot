# PROMPTS.md: planfirst, complete build guide for Claude Code

Project: **planfirst**, a Skill + MCP server that interviews you before you code, then outputs an architecture diagram (SVG/PNG), Mermaid source, a pre-mortem, and an ARCHITECTURE.md the coding agent follows.

## How to use this file
1. Create an empty folder `planfirst-mcp`. Put `CLAUDE.md` in the root.
2. Run `claude` in that folder.
3. Paste the prompts below one phase at a time. Run `/clear` between phases.
4. After every phase, run the Refactor pass and the Gate check (at the bottom).
5. Commit after every green phase. Do not skip ahead.

Rule for every phase: before using any library API (MCP SDK, mermaid-cli, tree-sitter), Claude Code must check the current docs. Never trust memory for signatures or CLI flags.

---

## Phase 0: Kickoff and scaffold
```
Read CLAUDE.md fully and restate in 5 bullets what we are building and what is
explicitly out of scope for v1. Then scaffold the project:
- TypeScript strict, ESM, Node 20+, vitest, eslint, prettier.
- npm scripts: build, dev, lint, typecheck, test, test:e2e.
- Folders: src/tools, src/services, src/renderers, src/patterns, src/shared,
  skills/planfirst, patterns/, evals/, examples/, docs/, tests/.
- .gitignore, LICENSE (MIT), minimal README (purpose + status: "work in progress").
- git init and an initial commit using conventional commits.
Check current docs for @modelcontextprotocol/sdk and set up a stdio server with a
placeholder `ping` tool. Add a test for it.
Then show me the exact command to register this server in Claude Code, after
verifying the current syntax in the docs.
```

## Phase 1: Renderer layer (hardest part, take your time)
```
Implement the renderer layer per CLAUDE.md.
1. Define the DiagramRenderer interface (validate, render) with typed results
   (discriminated union: ok | error).
2. Implement MermaidRenderer using @mermaid-js/mermaid-cli:
   - write source to a temp file, call mmdc with an argument array (never a shell string)
   - enforce timeout, max source size, max output size
   - always clean up temp files, even on failure
   - support svg and png
3. Parse mermaid errors into structured errors: code, message, line (when available),
   and a short repair hint. Cover at least: unbalanced brackets, reserved words as
   node ids, bad arrow syntax, unquoted special characters, unknown diagram type.
4. Tests: 5+ valid diagrams (flowchart, sequence, C4-style, ER, state) and 10+ known
   invalid ones with expected error codes.
Check how mermaid-cli runs headless Chromium here and document any setup requirement
(e.g. puppeteer sandbox config) in the README.
```

## Phase 2: MCP tools
```
Implement MCP tools: validate_diagram, render_diagram, export_architecture_md.
Use zod schemas. Handlers must be thin; logic lives in src/services.
- validate_diagram: returns ok, or structured error with line and repair hint.
- render_diagram: validate first, then render, return the output file path.
  Output restricted to a directory inside the user's project; reject path traversal
  and symlink escapes.
- export_architecture_md: structured input (system summary, components, data flow,
  key decisions with trade-offs, risks/pre-mortem with mitigations, diagram path,
  open questions). Render via a template in src/services. The document must end
  with a "Rules for the coding agent" section: follow this architecture, flag any
  deviation instead of silently changing it.
Tests for every tool including error paths. Then an end-to-end test that spawns the
server over stdio and calls each tool.
```

## Phase 3: Pattern library and retrieval (your RAG practice area)
```
Create patterns/ with 8 reference architectures as markdown with YAML frontmatter
(id, name, when_to_use, scale_range, components, failure_modes, cost_drivers, tags)
and one Mermaid diagram each: RAG app, multi-tenant SaaS, event-driven pipeline,
agent system with tools, mobile app + API backend, data/ML pipeline, realtime
collaboration app, internal admin tool.
Content must be accurate and opinionated: concrete trade-offs, at least 3 realistic
failure modes each, and what NOT to use it for. Validate every diagram with the
renderer in a test.
Implement list_patterns and get_pattern. Put retrieval behind a `PatternRetriever`
interface with a first implementation using keyword + tag scoring.
Add a second implementation, BM25 over the pattern text, and a small retrieval eval:
20 sample project descriptions with the expected best pattern, reporting top-1 and
top-3 accuracy for each retriever. Keep the interface so embeddings can be added later.
```

## Phase 4: The Skill (your real differentiator)
```
Write skills/planfirst/SKILL.md with proper frontmatter (name, and a description
that clearly states when to trigger: the user wants to plan or architect a project
before writing code). The skill instructs the agent to:
1. INTERVIEW first, in rounds of at most 3-4 questions, never a wall of questions.
   Cover: users and core job-to-be-done, scale (users, requests, data size), latency,
   data sensitivity and compliance, budget, team size, deployment target, build-vs-buy
   preferences, and the one thing that must not fail. Skip questions the user already
   answered. Offer sensible defaults.
2. Call list_patterns / get_pattern, pick the closest match, and explain deviations.
3. Produce a draft architecture with explicit trade-offs and rejected alternatives.
4. Run a PRE-MORTEM: top 5 ways this design fails (scaling, cost, vendor dependency,
   data-pipeline fragility, security) with a mitigation each.
5. Generate Mermaid, call validate_diagram, and on failure repair and retry up to 3
   times using the structured error. If still failing, simplify the diagram.
6. Call render_diagram, then export_architecture_md.
7. Finish with a short summary and the exact first build step.
Include a checklist of commonly forgotten concerns: auth, rate limits, queues,
idempotency, observability, backups, secrets, cost per request, failure modes,
data deletion/privacy. Keep SKILL.md under ~300 lines; put long checklists in
referenced files under skills/planfirst/.
Add a test that checks the skill file's frontmatter is valid and that referenced
files exist.
```

## Phase 5: Evals (becomes your LinkedIn/X case study)
```
Build an eval harness in evals/:
1. evals/ideas.json with 10 diverse project ideas (SaaS, RAG app, mobile app,
   marketplace, data pipeline, agent product, internal tool, realtime app, etc.).
2. A runner that, for each idea, takes Mermaid produced by the model and records:
   first-pass render success, success after the repair loop, repair attempts,
   render time.
3. A rubric check on each ARCHITECTURE.md: does it address auth, data store, failure
   handling, observability, cost, and security? Score each 0/1.
4. Baseline comparison: the same ideas with a plain "draw me an architecture diagram"
   prompt (no interview, no validation) scored on the same metrics.
5. Output a markdown results table and a JSON file. Record model outputs so runs are
   reproducible, and report failures honestly.
```

## Phase 6: Packaging and launch
```
Prepare for release:
1. README: one-line pitch, 60-second quickstart, screenshot/GIF placeholders, install
   (npx or npm), how to add the MCP server and install the skill, example output,
   honest limitations section, roadmap.
2. examples/: 3 generated ARCHITECTURE.md + rendered diagrams from the eval ideas.
3. Verify a clean install works (npm pack, install into a temp dir, run the server).
4. GitHub Actions CI: lint, typecheck, test, with the headless-Chromium setup.
5. CONTRIBUTING.md and issue templates.
6. Draft three posts in docs/launch/: LinkedIn (problem -> baseline -> method ->
   numbers -> limits), X thread (8 posts), Show HN-style post.
   Use only real numbers from the evals. Claim nothing the evals do not support.
```

---

## v2 (only after v1 has real users)

### Phase 7: Existing-repo mode, structure extraction
```
Add a repo analyzer. Using tree-sitter (check current bindings and docs), parse a
repository and extract modules, imports and exported symbols for TypeScript and
Python first. Build a dependency graph with a typed model, behind a `RepoAnalyzer`
interface. Add tools: analyze_repo and generate_diagram_from_graph, producing
Mermaid from real structure instead of from the model's guess. Include limits for
repo size and ignore rules (.gitignore, node_modules). Tests on small fixture repos.
```

### Phase 8: Drift detection
```
Add diff_diagram_vs_repo: compare the components and dependencies declared in
ARCHITECTURE.md (use a machine-readable block in the doc) against the real
dependency graph. Report missing components, undeclared dependencies, and forbidden
dependency directions. Add a CLI command usable in CI that exits non-zero on drift,
with a clear human-readable report. Tests with fixture repos that drift on purpose.
```

---

## Reusable prompts

**Refactor pass (after every phase):**
```
Review the code added in this phase as a strict senior reviewer. Find duplication,
unclear names, functions doing more than one thing, missing tests, leaky
abstractions, and dead code. Fix them. Run lint, typecheck and tests. Summarize
what you changed.
```

**Gate check (before committing a phase):**
```
Run lint, typecheck, and the full test suite. Update the README for this phase.
List anything that is still risky or untested. Only then commit with a
conventional commit message.
```

**Security pass (after Phase 2, and again after Phase 7):**
```
Audit this server for shell injection, path traversal, symlink escapes, unbounded
resource use, unsafe temp files, and error messages that leak internals. List
findings by severity, fix them, and add regression tests.
```

**When stuck:**
```
Stop. Summarize what you tried, what failed, and your top 3 hypotheses. Verify each
hypothesis against the library's current docs before changing code.
```

**Scope guard (when Claude Code starts adding extras):**
```
Re-read CLAUDE.md. List what you just added that is not required by the current
phase, and remove it. Note it in a "later" list instead.
```

---

## Build-in-public checkpoints
- After Phase 0: post the idea and the "plan first" thesis.
- After Phase 2: post the first rendered diagram and the repair loop.
- After Phase 5: post the eval numbers versus the plain-prompt baseline.
- After Phase 6: launch post with repo link and a 60-second demo.