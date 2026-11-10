import { execFile } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type MmdcOutcome =
  { kind: "success" } | { kind: "failed"; stderr: string } | { kind: "timeout" };

// mermaid-cli does not export its CLI path, so resolve it next to the package entry point.
const MMDC_CLI = join(
  dirname(fileURLToPath(import.meta.resolve("@mermaid-js/mermaid-cli"))),
  "cli.js",
);
const MAX_STDERR_BYTES = 1024 * 1024;

/**
 * Runs mmdc with an argument array via the current Node binary. No shell is involved, so
 * model-generated text can never be interpreted as a command.
 */
export function runMmdc(args: readonly string[], timeoutMs: number): Promise<MmdcOutcome> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [MMDC_CLI, ...args],
      { timeout: timeoutMs, maxBuffer: MAX_STDERR_BYTES, windowsHide: true },
      (error, _stdout, stderr) => {
        if (!error) resolve({ kind: "success" });
        else if (error.killed) resolve({ kind: "timeout" });
        else resolve({ kind: "failed", stderr });
      },
    );
  });
}
