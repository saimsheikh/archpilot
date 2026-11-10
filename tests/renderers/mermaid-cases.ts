import type { DiagramErrorCode } from "../../src/renderers/diagram-renderer.js";

export const VALID_DIAGRAMS: Readonly<Record<string, string>> = {
  flowchart: `flowchart TD
  user([User]) --> api[API Gateway]
  api -->|REST| svc["Order Service (v2)"]
  svc --> db[(Postgres)]
  svc -.-> queue{{Queue}}`,
  sequence: `sequenceDiagram
  participant C as Client
  participant A as API
  C->>A: POST /orders
  A-->>C: 201 Created`,
  c4: `C4Context
  Person(user, "User")
  System(app, "Archpilot")
  Rel(user, app, "plans with")`,
  er: `erDiagram
  USER ||--o{ ORDER : places
  ORDER {
    string id
    int total
  }`,
  state: `stateDiagram-v2
  [*] --> Draft
  Draft --> Review
  Review --> Approved
  Approved --> [*]`,
  frontmatter: `---
title: With frontmatter
---
%% a comment
flowchart LR
  a --> b`,
};

export interface InvalidCase {
  source: string;
  code: DiagramErrorCode;
  line?: number;
}

export const INVALID_DIAGRAMS: Readonly<Record<string, InvalidCase>> = {
  empty: { source: "   \n\n", code: "EMPTY_SOURCE" },
  onlyComments: { source: "%% nothing here\n", code: "EMPTY_SOURCE" },
  typoInType: { source: "flowchartz TD\n  A --> B", code: "UNKNOWN_DIAGRAM_TYPE", line: 1 },
  missingType: { source: "A --> B", code: "UNKNOWN_DIAGRAM_TYPE", line: 1 },
  unclosedSquare: { source: "flowchart TD\n  A[Start --> B", code: "UNBALANCED_BRACKET", line: 2 },
  unclosedRound: {
    source: "flowchart TD\n  A(Start --> B\n  B --> C",
    code: "UNBALANCED_BRACKET",
    line: 2,
  },
  unclosedClassBody: {
    source: "classDiagram\n  class A {\n  +foo()",
    code: "UNBALANCED_BRACKET",
    line: 2,
  },
  reservedEnd: { source: "flowchart TD\n  end --> B", code: "RESERVED_WORD", line: 2 },
  singleDashArrow: { source: "flowchart TD\n  A -> B", code: "BAD_ARROW", line: 2 },
  badErCardinality: {
    source: "erDiagram\n  USER ||--x ORDER : places",
    code: "BAD_ARROW",
    line: 2,
  },
  unquotedParens: {
    source: "flowchart TD\n  A[Hello (world)] --> B",
    code: "UNQUOTED_SPECIAL_CHAR",
    line: 2,
  },
  sequenceMissingTarget: {
    source: "sequenceDiagram\n  Alice->>",
    code: "PARSE_ERROR",
    line: 2,
  },
  stateMissingTarget: {
    source: "stateDiagram-v2\n  [*] --> A\n  A --> ",
    code: "PARSE_ERROR",
    line: 3,
  },
};
