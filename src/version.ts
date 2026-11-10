import { readFileSync } from "node:fs";

// package.json sits one level above both src/ and dist/, so this resolves in dev and when installed.
const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };

export const VERSION = packageJson.version;
