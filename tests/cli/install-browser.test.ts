import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { BROWSER_INSTALL_ARGS, puppeteerCliPath } from "../../src/cli/install-browser.js";

describe("puppeteerCliPath", () => {
  it("resolves the puppeteer CLI that mermaid-cli depends on", async () => {
    const cli = puppeteerCliPath();
    await access(cli);
    // cli.js lives at <puppeteer>/lib/puppeteer/node/cli.js
    const pkg = JSON.parse(
      await readFile(join(dirname(cli), "..", "..", "..", "package.json"), "utf8"),
    ) as { name: string };
    expect(pkg.name).toBe("puppeteer");
  });

  it("installs the headless shell build mermaid-cli launches", () => {
    expect(BROWSER_INSTALL_ARGS).toEqual(["browsers", "install", "chrome-headless-shell"]);
  });
});
