# Changelog

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
