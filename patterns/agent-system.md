---
id: agent-system
name: Agent system with tools
when_to_use:
  - An LLM must take multi-step actions (call APIs, query data, write files) to finish a task
  - The steps are not known in advance, so a fixed workflow does not fit
  - Humans can review or approve risky actions
scale_range: "1 to 1k concurrent agent runs; runs last seconds to hours"
components:
  - Orchestrator running the model-tool loop
  - LLM API
  - Tool layer (MCP servers or function tools) with typed schemas
  - Sandbox for code or shell execution
  - Run state store with checkpoints
  - Human approval queue for risky actions
  - Tracing and evaluation harness
  - Budget and rate limiter
failure_modes:
  - Runaway loops that burn tokens without progress
  - Prompt injection from tool output triggers unintended actions
  - Irreversible tool actions taken on a wrong assumption
  - Non-reproducible behavior makes bugs impossible to debug
  - Tool errors returned as raw stack traces confuse the model
cost_drivers:
  - LLM tokens per run (context grows each step)
  - Sandbox compute time
  - Third-party API calls made by tools
tags:
  [
    agent,
    agents,
    llm,
    tools,
    mcp,
    automation,
    ai,
    orchestration,
    assistant,
    workflow,
    function-calling,
  ]
---

# Agent system with tools

A model runs in a loop: read state, pick a tool, observe the result, repeat until done.
The reliability of the tools and the guardrails around them matter more than the prompt.

## Diagram

```mermaid
flowchart TD
  user([User]) --> orchestrator["Orchestrator: model-tool loop"]
  orchestrator --> llm["LLM API"]
  orchestrator --> tools["Tool layer: typed schemas"]
  tools --> apis["External APIs"]
  tools --> sandbox["Code sandbox"]
  tools --> data[("Business data")]
  orchestrator --> state[("Run state + checkpoints")]
  orchestrator --> approvals["Human approval queue"]
  orchestrator --> budget["Budget + rate limiter"]
  orchestrator --> traces[("Traces + evals")]
```

## Trade-offs

- **Single agent vs multi-agent:** start with one agent and good tools; add sub-agents
  only when contexts clearly separate (research vs writing) and you can measure the gain.
- **Workflow vs agent:** if you can write the steps down, a deterministic workflow with an
  LLM per step is cheaper, faster and easier to test.
- **Structured tool errors:** cost a little design upfront but let the model self-repair.
- **Checkpointing:** adds storage but makes long runs resumable and debuggable.

## Failure modes and mitigations

1. **Runaway loops.** Hard limits on steps, tokens and wall-clock per run; detect repeated
   identical tool calls.
2. **Injection via tool output.** Treat tool results as data; require approval for
   destructive or external actions; least-privilege credentials per tool.
3. **Irreversible actions.** Dry-run modes, approval gates, and undo where possible.
4. **Non-reproducibility.** Log every model input and output and tool call; replay runs
   from traces in tests.
5. **Unreadable errors.** Tools return `{code, message, hint}`, never stack traces.

## Do not use it for

- Fixed, well-understood processes: write a workflow.
- Latency-critical paths (under a second): one model call, no loop.
- Actions where a mistake is catastrophic and cannot be reviewed by a human.
