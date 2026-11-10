import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { MERMAID_CLI_ENTRY } from "../renderers/mermaid/mmdc-runner.js";

/**
 * The puppeteer CLI that mermaid-cli itself uses. Resolving it from mermaid-cli's location
 * (instead of `npx puppeteer`, which fetches the latest puppeteer) guarantees the installed
 * browser is the exact build the renderer will look for.
 */
export function puppeteerCliPath(): string {
  return createRequire(MERMAID_CLI_ENTRY).resolve("puppeteer/lib/puppeteer/node/cli.js");
}

export const BROWSER_INSTALL_ARGS = ["browsers", "install", "chrome-headless-shell"] as const;

/** Downloads headless Chromium, streaming puppeteer's progress output. Resolves to the exit code. */
export function installBrowser(): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [puppeteerCliPath(), ...BROWSER_INSTALL_ARGS], {
      stdio: "inherit",
      windowsHide: true,
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}
