// Verifies the published artifact, not the repo: packs the package, installs the tarball into
// an empty temp project, then drives the installed binary like a real MCP client would.
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const EXPECTED_TOOLS = [
  "export_architecture_md",
  "get_pattern",
  "list_patterns",
  "render_diagram",
  "validate_diagram",
];

// Run npm's own CLI script with node (npm sets npm_execpath under `npm run`), so no shell is
// needed even on Windows, where `npm` is a .cmd shim.
const npm = (args, cwd) => {
  const cli = process.env.npm_execpath;
  if (!cli) throw new Error("verify-pack: run me via `npm run verify:pack`");
  return execFileSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8" });
};

function check(condition, message) {
  if (!condition) throw new Error(`verify-pack: ${message}`);
  console.log(`ok  ${message}`);
}

const work = await mkdtemp(join(tmpdir(), "archpilot-verify-"));
try {
  const [{ filename, files }] = JSON.parse(
    npm(["pack", "--json", "--pack-destination", work], process.cwd()),
  );
  const paths = files.map((file) => file.path);
  check(paths.includes("dist/index.js"), "tarball contains dist/index.js");
  check(paths.includes("skills/archpilot/SKILL.md"), "tarball contains the skill");
  check(paths.filter((p) => p.startsWith("patterns/")).length === 8, "tarball contains 8 patterns");
  check(
    !paths.some((p) => p.startsWith("tests/") || p.startsWith("evals/") || p.startsWith("src/")),
    "tarball excludes src, tests and evals",
  );

  const project = join(work, "project");
  await mkdir(project);
  npm(["init", "-y"], project);
  npm(["install", "--no-audit", "--no-fund", join(work, filename)], project);
  const bin = join(project, "node_modules", "archpilot-mcp", "dist", "index.js");

  const version = execFileSync(process.execPath, [bin, "--version"], { encoding: "utf8" }).trim();
  check(
    version === JSON.parse(await readFile("package.json", "utf8")).version,
    `--version prints ${version}`,
  );

  execFileSync(process.execPath, [bin, "install-skill", "--project"], { cwd: project });
  const skill = await readFile(join(project, ".claude", "skills", "archpilot", "SKILL.md"), "utf8");
  check(skill.includes("name: archpilot"), "install-skill --project writes the skill");

  const client = new Client({ name: "verify-pack", version: "0.0.0" });
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [bin],
      cwd: project,
      env: { ...process.env, ARCHPILOT_PROJECT_ROOT: project },
    }),
  );
  try {
    const tools = (await client.listTools()).tools.map((tool) => tool.name).sort();
    check(
      JSON.stringify(tools) === JSON.stringify(EXPECTED_TOOLS),
      "installed server lists all 5 tools",
    );

    const listed = await client.callTool({
      name: "list_patterns",
      arguments: { query: "chatbot over our docs" },
    });
    check(listed.content[0].text.includes('"rag-app"'), "list_patterns finds bundled patterns");

    const rendered = await client.callTool({
      name: "render_diagram",
      arguments: { source: "flowchart LR\n  a --> b" },
    });
    check(!rendered.isError, "render_diagram renders with the installed mermaid-cli");
    const svg = await readFile(join(project, "docs", "architecture", "diagram.svg"), "utf8");
    check(svg.includes("<svg"), "diagram.svg written inside the project");
  } finally {
    await client.close();
  }
  console.log("verify-pack: all checks passed");
} finally {
  await rm(work, { recursive: true, force: true });
}
