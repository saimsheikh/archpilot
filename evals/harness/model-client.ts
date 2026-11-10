import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/** One model call. `key` names the call so it can be recorded and replayed. */
export interface ModelClient {
  complete(key: string, prompt: string): Promise<string>;
}

const CALL_TIMEOUT_MS = 5 * 60_000;

// Run in isolation: no user/project settings (so no plugins, hooks or output styles), no tools,
// no MCP servers. Both eval conditions then see the same plain model.
const ISOLATION_ARGS = [
  "--print",
  "--setting-sources",
  "",
  "--tools",
  "",
  "--strict-mcp-config",
  "--no-session-persistence",
  "--output-format",
  "json",
];

function defaultClaudeBinary(): string {
  if (process.env.ARCHPILOT_EVAL_CLAUDE_BIN) return process.env.ARCHPILOT_EVAL_CLAUDE_BIN;
  // On Windows `claude` is a .cmd shim, which cannot be spawned without a shell.
  const appData = process.env.APPDATA;
  if (process.platform === "win32" && appData) {
    const exe = join(appData, "npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe");
    if (existsSync(exe)) return exe;
  }
  return "claude";
}

interface CliResult {
  is_error?: boolean;
  result?: string;
}

/** Calls Claude through the Claude Code CLI in headless mode; the prompt goes over stdin. */
export class ClaudeCliClient implements ModelClient {
  constructor(
    private readonly model: string,
    private readonly binary: string = defaultClaudeBinary(),
  ) {}

  complete(_key: string, prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = execFile(
        this.binary,
        [...ISOLATION_ARGS, "--model", this.model],
        { timeout: CALL_TIMEOUT_MS, maxBuffer: 20 * 1024 * 1024, windowsHide: true },
        (error, stdout) => {
          if (error) {
            reject(new Error(`claude CLI failed: ${error.message}`));
            return;
          }
          const parsed = JSON.parse(stdout) as CliResult;
          if (parsed.is_error || typeof parsed.result !== "string") {
            reject(new Error(`claude CLI returned an error: ${String(parsed.result)}`));
            return;
          }
          resolve(parsed.result);
        },
      );
      child.stdin?.end(prompt);
    });
  }
}

/** Saves every prompt and output under `dir/<key>.{prompt,out}.txt` for replay. */
export class RecordingClient implements ModelClient {
  constructor(
    private readonly inner: ModelClient,
    private readonly dir: string,
  ) {}

  async complete(key: string, prompt: string): Promise<string> {
    const base = join(this.dir, key);
    await mkdir(dirname(base), { recursive: true });
    await writeFile(`${base}.prompt.txt`, prompt, "utf8");
    const output = await this.inner.complete(key, prompt);
    await writeFile(`${base}.out.txt`, output, "utf8");
    return output;
  }
}

/** Replays a recorded run, so results can be reproduced without calling the model. */
export class ReplayClient implements ModelClient {
  constructor(private readonly dir: string) {}

  async complete(key: string): Promise<string> {
    const path = join(this.dir, `${key}.out.txt`);
    if (!existsSync(path)) throw new Error(`No recorded output for '${key}'`);
    return readFile(path, "utf8");
  }
}
