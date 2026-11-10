# archpilot

Plan before you code. archpilot is a Claude Code Skill plus an MCP server that interviews you
about your idea, proposes an architecture with trade-offs and a pre-mortem, and outputs a
validated diagram plus an `ARCHITECTURE.md` your coding agent follows as a contract.

**Status: work in progress.** The MCP server (renderer, tools, pattern library) works; the
Skill, evals and packaging are next.

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

## License

MIT
