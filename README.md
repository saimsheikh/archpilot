# archpilot

Plan before you code. archpilot is a Claude Code Skill plus an MCP server that interviews you
about your idea, proposes an architecture with trade-offs and a pre-mortem, and outputs a
validated diagram plus an `ARCHITECTURE.md` your coding agent follows as a contract.

**Status: work in progress.** The MCP server, the Skill and the eval harness work;
packaging is next.

## Requirements

- Node.js 22.13+ (required by `@mermaid-js/mermaid-cli` 12)
- Headless Chromium for mermaid-cli (see below)

### Headless Chromium setup

mermaid-cli renders through Puppeteer. Recent npm versions block install scripts, so the
browser may not download on `npm install`. Install it explicitly once:

```bash
npx puppeteer browsers install chrome-headless-shell
```

If it is missing, tools return `RENDERER_UNAVAILABLE` with this command as the hint.

On Linux containers/CI running as root, Chromium needs the sandbox disabled. Create a
Puppeteer config and point the server at it:

```bash
echo '{ "args": ["--no-sandbox", "--disable-setuid-sandbox"] }' > puppeteer.json
export ARCHPILOT_PUPPETEER_CONFIG="$PWD/puppeteer.json"
```

Each render launches a browser (about 2 to 4 seconds on a laptop). Validation is a full
render that is discarded, because mermaid has no browser-free parser.

## Development

```bash
npm install
npm run build          # compile to dist/
npm run dev            # run the server from source over stdio
npm run lint           # eslint + prettier check
npm run typecheck
npm test               # unit + renderer tests (launch Chromium)
npm run test:e2e       # builds, then drives the server over stdio
npm run eval:retrieval # pattern retrieval accuracy, writes evals/retrieval/results.md
```

## Register with Claude Code (local dev)

Build first, then run this from the repo root (use an absolute path):

```bash
npm run build
claude mcp add archpilot -- node /absolute/path/to/repo/dist/index.js
```

Add `--scope user` to make it available in every project. Check with `claude mcp list`.
Claude Code starts the server in your project directory; all files are written there.

## The Skill

[skills/archpilot/SKILL.md](skills/archpilot/SKILL.md) is the planner. It triggers when you
ask Claude to plan or architect a project before coding, and then:

1. Interviews you in short rounds (at most 3 to 4 questions, each with a default).
2. Picks the closest reference architecture via `list_patterns` / `get_pattern` and explains
   deviations.
3. Drafts components, data flow and key decisions with rejected alternatives, checked
   against a list of commonly forgotten concerns.
4. Runs a pre-mortem: top 5 ways the design fails, each with a mitigation.
5. Validates the Mermaid diagram, repairing from structured errors up to 3 times, then
   simplifying if needed.
6. Renders the diagram and exports `ARCHITECTURE.md`.
7. Ends with a summary and the exact first build step.

Long checklists live in [skills/archpilot/references/](skills/archpilot/references/).

Install it for Claude Code by copying the folder into your skills directory:

```bash
# all projects
cp -r skills/archpilot ~/.claude/skills/
# or one project
mkdir -p .claude/skills && cp -r /path/to/archpilot/skills/archpilot .claude/skills/
```

## MCP tools

| Tool                     | What it does                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `validate_diagram`       | Validates Mermaid source. Returns `ok`, or `{ code, message, line, hint }`.                                                  |
| `render_diagram`         | Validates and renders to `svg`/`png` inside the project; returns the path.                                                   |
| `export_architecture_md` | Writes `ARCHITECTURE.md`: components, data flow, decisions, pre-mortem, diagram, open questions, rules for the coding agent. |
| `list_patterns`          | Lists reference architectures; with `query`, ranked by relevance.                                                            |
| `get_pattern`            | Full pattern: components, trade-offs, failure modes, cost drivers, diagram.                                                  |

Errors are always structured JSON (`{ ok: false, error: { code, message, line?, hint? } }`).
Diagram error codes: `EMPTY_SOURCE`, `SOURCE_TOO_LARGE`, `UNKNOWN_DIAGRAM_TYPE`,
`UNBALANCED_BRACKET`, `RESERVED_WORD`, `BAD_ARROW`, `UNQUOTED_SPECIAL_CHAR`, `PARSE_ERROR`,
`RENDER_TIMEOUT`, `OUTPUT_TOO_LARGE`, `RENDERER_UNAVAILABLE`, `RENDER_FAILED`. Path errors:
`INVALID_OUTPUT_PATH`, `PATH_OUTSIDE_PROJECT`.

### Safety limits

- mmdc runs with an argument array (no shell); source is written to a private temp dir that
  is always deleted.
- Mermaid runs with `securityLevel: "strict"`.
- Output paths must stay inside the project: `..`, absolute paths elsewhere and symlink
  escapes are rejected.
- Unexpected exceptions return `INTERNAL_ERROR`; details go to stderr, never to the model.

### Configuration (environment variables)

| Variable                           | Default           | Meaning                                |
| ---------------------------------- | ----------------- | -------------------------------------- |
| `ARCHPILOT_PROJECT_ROOT`           | working directory | Directory all output must stay inside  |
| `ARCHPILOT_RENDER_TIMEOUT_MS`      | `60000`           | Per-render timeout                     |
| `ARCHPILOT_MAX_SOURCE_BYTES`       | `50000`           | Max diagram source size                |
| `ARCHPILOT_MAX_OUTPUT_BYTES`       | `10485760`        | Max rendered file size                 |
| `ARCHPILOT_MAX_CONCURRENT_RENDERS` | `2`               | Parallel browser renders               |
| `ARCHPILOT_PUPPETEER_CONFIG`       | unset             | Puppeteer launch config file           |
| `ARCHPILOT_RETRIEVER`              | `keyword`         | Pattern retriever: `keyword` or `bm25` |

## Pattern library

Eight opinionated reference architectures in [patterns/](patterns/): RAG app, multi-tenant
SaaS, event-driven pipeline, agent system with tools, mobile app + API backend, data/ML
pipeline, realtime collaboration app, internal admin tool. Each has YAML frontmatter
(`id, name, when_to_use, scale_range, components, failure_modes, cost_drivers, tags`),
trade-offs, at least three failure modes with mitigations, what not to use it for, and a
Mermaid diagram that is render-tested.

Retrieval sits behind a `PatternRetriever` interface with two implementations, compared on
20 labeled project descriptions ([results](evals/retrieval/results.md)):

| Retriever      | Top-1 | Top-3 |
| -------------- | ----- | ----- |
| keyword + tags | 90%   | 100%  |
| BM25           | 85%   | 100%  |

The set is small and written by the same author as the patterns, so treat it as a
regression check, not a benchmark.

## Evals

`npm run eval` runs 10 project ideas ([evals/ideas.json](evals/ideas.json)) through two
conditions using Claude via the Claude Code CLI (headless, no settings, plugins, tools or MCP):

- **baseline**: one plain prompt, "Draw me an architecture diagram for this project. Use
  Mermaid", rendered once with no repair.
- **archpilot**: the skill's flow run non-interactively: pattern retrieval, the forgotten-concerns
  checklist, a pre-mortem, structured output, validation with up to 3 repairs, then simplify,
  then render and export `ARCHITECTURE.md`.

Every prompt and output is recorded under `evals/runs/<run>/recordings`, so a run can be
re-scored without calling the model: `npm run eval -- --replay evals/runs/<run>/recordings`.
Options: `--model`, `--only <idea-id>`, `--limit <n>`, `--concurrency <n>`.

Latest run (Claude Sonnet, 10 ideas, one run each), full table in
[evals/results/results.md](evals/results/results.md):

| Metric                                                                               | archpilot | baseline |
| ------------------------------------------------------------------------------------ | --------- | -------- |
| First-pass render success                                                            | 100%      | 100%     |
| Render success after repair loop                                                     | 100%      | 100%     |
| Avg repair attempts                                                                  | 0         | 0        |
| Avg rubric score (auth, data store, failure handling, observability, cost, security) | 5.9 / 6   | 3.5 / 6  |
| Mentions cost                                                                        | 90%       | 10%      |
| Mentions failure handling                                                            | 100%      | 50%      |

What this does and does not show:

- Sonnet produced valid Mermaid on the first try in every case, in both conditions. The repair
  loop was never exercised in this run, so these numbers say nothing about its value; it is
  covered by unit tests only.
- The rubric is keyword evidence that a concern is mentioned, not a judgment of design
  quality. The archpilot prompt includes a checklist naming these concerns, so part of the gap
  is the method asking for them.
- 10 ideas, one run each: expect run-to-run variance.

## License

MIT
