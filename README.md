# archpilot

Plan before you code. archpilot is a Claude Code Skill plus an MCP server that interviews you about
your idea, proposes an architecture with trade-offs and a pre-mortem, and outputs a validated
diagram plus an `ARCHITECTURE.md` your coding agent follows as a contract.

**Status: work in progress.** Only a placeholder `ping` tool exists so far.

## Requirements

- Node.js 20+

## Development

```bash
npm install
npm run build      # compile to dist/
npm run dev        # run the server from source over stdio
npm run lint       # eslint + prettier check
npm run typecheck
npm test           # unit tests
npm run test:e2e   # builds, then talks to the server over stdio
```

## Register with Claude Code (local dev)

Build first, then run this from the repo root (use an absolute path):

```bash
npm run build
claude mcp add archpilot -- node /absolute/path/to/repo/dist/index.js
```

Add `--scope user` to make it available in every project. Check with `claude mcp list`.

## License

MIT
