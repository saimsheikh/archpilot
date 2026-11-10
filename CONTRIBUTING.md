# Contributing to archpilot

Thanks for helping. archpilot plans software before it is written: an interview, an
architecture with trade-offs, a pre-mortem, and a validated diagram plus `ARCHITECTURE.md`
as a contract. Contributions should make that planning better. It is not meant to become a
generic diagram tool.

## Setup

```bash
git clone https://github.com/saimsheikh/archpilot.git
cd archpilot
npm install
npx puppeteer browsers install chrome-headless-shell   # Chromium for mermaid-cli
npm test
```

Requires Node.js 22.13+. On Linux as root (containers), see the sandbox note in the README.

## Before opening a pull request

- `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:e2e` pass.
- New behavior has tests. Services and renderers always get unit tests.
- No `any`, no dead code, no unused dependencies.
- The README is updated if behavior or configuration changed.
- One logical change per commit, using [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).

## Architecture rules

- Layers: `src/tools/` (thin MCP handlers) → `src/services/` (logic) → `src/renderers/`
  (behind `DiagramRenderer`) and `src/patterns/` (data loading). Handlers contain no
  business logic.
- Tools return structured errors `{ ok: false, error: { code, message, line?, hint? } }`.
  Never return raw exceptions, stack traces or absolute paths to the model.
- Never pass model-generated text to a shell. Use argument arrays and temp files.
- Every file the server writes stays inside the project root.
- Check a library's current docs before using its API. Do not rely on memory for SDK
  signatures or CLI flags.

## Adding a reference pattern

1. Add `patterns/<id>.md` with YAML frontmatter: `id` (same as the file name), `name`,
   `when_to_use`, `scale_range`, `components`, `failure_modes` (at least 3), `cost_drivers`,
   `tags`.
2. The body needs `## Trade-offs`, `## Failure modes and mitigations`, `## Do not use it for`
   and one Mermaid diagram. The test suite renders it.
3. Be opinionated: concrete trade-offs and the cases where the pattern is the wrong choice.
4. Add 2 to 3 queries for it to `evals/retrieval/queries.json`, written the way a user
   would describe the project (not copied from your tags), and run `npm run eval:retrieval`.
   Report the numbers in the PR even if they went down.

## Evals

`npm run eval` calls Claude through your Claude Code login and uses your quota. Use
`--only <idea-id>` while iterating, and `--replay <recordings dir>` to re-score without
calling the model. Report results honestly, including failures and regressions.
