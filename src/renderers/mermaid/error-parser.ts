import type { DiagramError } from "../diagram-renderer.js";

// Jison token names used by mermaid's grammars. Matching on tokens (not prose) keeps the
// classification stable when message wording changes.
const CLOSING_TOKENS = new Set([
  "SQE",
  "PE",
  "DIAMOND_STOP",
  "STADIUMEND",
  "SUBROUTINEEND",
  "CYLINDEREND",
  "DOUBLECIRCLEEND",
  "TRAPEND",
  "INVTRAPEND",
  "STRUCT_STOP",
]);
const END_OF_INPUT_TOKENS = new Set(["1", "EOF", "NEWLINE", "NL", "EOF_IN_STRUCT"]);
const ARROW_TOKENS = new Set(["LINK", "START_LINK"]);
const CARDINALITY_TOKENS = new Set(["ZERO_OR_ONE", "ZERO_OR_MORE", "ONE_OR_MORE", "ONLY_ONE"]);
const RESERVED_TOKENS = new Set([
  "end",
  "subgraph",
  "STYLE",
  "CLASSDEF",
  "CLASS",
  "CLICK",
  "LINKSTYLE",
  "DEFAULT",
]);

const LINE_PATTERN = /(?:Parse|Lexical) error on line (\d+)/;
const EXPECTING_PATTERN = /Expecting (.+), got '([^']*)'/;
const BROWSER_MISSING_PATTERN =
  /Could not find (?:Chrome|Chromium|browser)|Failed to launch the browser/i;
const UNKNOWN_TYPE_PATTERN = /UnknownDiagramError|No diagram type detected/;
const OPENERS: Readonly<Record<string, string>> = { "[": "]", "(": ")", "{": "}" };

interface ParserFailure {
  line: number | undefined;
  expected: string[];
  got: string;
}

/**
 * Maps raw mmdc stderr to a structured error. Never echoes stderr: it contains local paths
 * and stack traces that must not reach the model.
 */
export function parseMermaidError(stderr: string, source: string): DiagramError {
  if (BROWSER_MISSING_PATTERN.test(stderr)) {
    return {
      code: "RENDERER_UNAVAILABLE",
      message: "Headless Chromium for mermaid-cli is not installed.",
      hint: "Run: npx puppeteer browsers install chrome-headless-shell",
    };
  }
  if (UNKNOWN_TYPE_PATTERN.test(stderr)) {
    return {
      code: "UNKNOWN_DIAGRAM_TYPE",
      message: "Mermaid could not detect a diagram type.",
      line: 1,
      hint: "The first line must name a diagram type, e.g. 'flowchart TD'.",
    };
  }
  const failure = extractParserFailure(stderr, source);
  if (failure) return classifyParserFailure(failure, source);
  if (stderr.includes("Lexical error")) {
    return withLine(
      {
        code: "UNQUOTED_SPECIAL_CHAR",
        message: "Mermaid found characters it cannot tokenize.",
        hint: 'Wrap labels containing special characters in double quotes: A["label (x)"].',
      },
      clampLine(extractLine(stderr), source),
    );
  }
  return {
    code: "RENDER_FAILED",
    message: "mermaid-cli failed without a recognizable parse error.",
    hint: "Simplify the diagram and retry.",
  };
}

function extractLine(stderr: string): number | undefined {
  const match = LINE_PATTERN.exec(stderr);
  return match?.[1] ? Number(match[1]) : undefined;
}

function extractParserFailure(stderr: string, source: string): ParserFailure | undefined {
  const match = EXPECTING_PATTERN.exec(stderr);
  if (!match?.[1] || match[2] === undefined) return undefined;
  const expected = [...match[1].matchAll(/'([^']+)'/g)].map((token) => token[1] ?? "");
  return { line: clampLine(extractLine(stderr), source), expected, got: match[2] };
}

function classifyParserFailure(failure: ParserFailure, source: string): DiagramError {
  const { expected, got, line } = failure;
  const expectsAny = (tokens: Set<string>): boolean => expected.some((token) => tokens.has(token));

  if (RESERVED_TOKENS.has(got)) {
    const word = got.toLowerCase();
    return withLine(
      {
        code: "RESERVED_WORD",
        message: `'${word}' is a reserved word and cannot be used as a node id.`,
        hint: `Rename the node and keep the text as a label: ${word}Node["${word}"].`,
      },
      line,
    );
  }
  if (expectsAny(CLOSING_TOKENS)) {
    if (END_OF_INPUT_TOKENS.has(got)) {
      return withLine(
        {
          code: "UNBALANCED_BRACKET",
          message: "A bracket is opened but never closed.",
          hint: "Close every [, ( and { of a node shape on the same line, e.g. A[Start].",
        },
        findUnclosedBracketLine(source) ?? line,
      );
    }
    return withLine(
      {
        code: "UNQUOTED_SPECIAL_CHAR",
        message: "A node label contains brackets or other special characters without quotes.",
        hint: 'Quote the label: A["Hello (world)"].',
      },
      line,
    );
  }
  if (expectsAny(ARROW_TOKENS)) {
    return withLine(
      {
        code: "BAD_ARROW",
        message: "Invalid link/arrow syntax.",
        hint: "Flowchart links use -->, ---, -.-> or ==> (a single '->' is invalid). Labels: A -->|text| B.",
      },
      line,
    );
  }
  if (expectsAny(CARDINALITY_TOKENS)) {
    return withLine(
      {
        code: "BAD_ARROW",
        message: "Invalid ER relationship cardinality.",
        hint: "ER relationships look like A ||--o{ B : label (ends: |o, ||, }o, }|).",
      },
      line,
    );
  }
  return withLine(
    {
      code: "PARSE_ERROR",
      message: `Unexpected '${got}'; expected one of: ${expected.slice(0, 6).join(", ")}.`,
      hint: "Check that the statement on this line is complete (e.g. a link needs a target).",
    },
    line,
  );
}

function withLine(error: DiagramError, line: number | undefined): DiagramError {
  return line === undefined ? error : { ...error, line };
}

// Mermaid reports end-of-input errors past the last line; clamp to real content.
function clampLine(line: number | undefined, source: string): number | undefined {
  if (line === undefined) return undefined;
  const lastContentLine = source.trimEnd().split(/\r?\n/).length;
  return Math.max(1, Math.min(line, lastContentLine));
}

/** Line of the earliest opener with no matching closer, ignoring quoted text. */
export function findUnclosedBracketLine(source: string): number | undefined {
  const stack: { closer: string; line: number }[] = [];
  for (const [index, text] of source.split(/\r?\n/).entries()) {
    let inQuotes = false;
    for (const char of text) {
      if (char === '"') inQuotes = !inQuotes;
      if (inQuotes) continue;
      const closer = OPENERS[char];
      if (closer) stack.push({ closer, line: index + 1 });
      else if (stack.at(-1)?.closer === char) stack.pop();
    }
  }
  return stack[0]?.line;
}
