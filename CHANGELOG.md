# Changelog

## Unreleased

- New `marketplace` reference pattern (two-sided marketplaces with payouts, booking, reviews).
- `list_patterns` returns a `note`: judge fit yourself, or design from first principles when
  nothing matches. The keyword retriever returns no candidates when even its best match is weak.
- Skill and eval harness consider the top 3 candidates and may pick none, instead of trusting #1.
- Output paths treat `\` as a separator on every OS, so `..\x` is rejected on Linux too.

## 0.1.1

- `setup` command: installs headless Chromium and the skill in one step.
- `install-browser` command: installs the exact Chromium build archpilot's Puppeteer expects
  (a plain `npx puppeteer browsers install` can fetch a mismatched version).
- `RENDERER_UNAVAILABLE` now points to `npx -y archpilot-mcp install-browser`.
- README: quickstart, troubleshooting, upgrade instructions and npm badges.

## 0.1.0

- First release: MCP server (`validate_diagram`, `render_diagram`, `export_architecture_md`,
  `list_patterns`, `get_pattern`), the archpilot planning skill, 8 reference architectures,
  and the eval harness.
