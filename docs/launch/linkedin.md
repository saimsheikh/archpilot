# LinkedIn post

Ask a coding agent to "build me a booking app" and it starts writing code in seconds.

Nobody asked how many users, what the budget is, whether patient data has to stay in the EU, or what happens when the payment provider is down. Those questions come up later, usually as a rewrite.

So I built archpilot: an MCP server + Claude Code skill that plans before anyone codes.

The problem, measured. I gave Claude Sonnet 10 project ideas (SaaS, RAG bot, mobile app, marketplace, data pipeline, AI agent, internal tool, live quiz, clinic booking, IoT fleet) with a plain prompt: "Draw me an architecture diagram for this project. Use Mermaid."

The diagrams rendered fine. But across the 10 answers:
→ cost came up in 1 of 10
→ failure handling (retries, fallbacks, backups) in 5 of 10
→ observability in 6 of 10
→ security in 7 of 10

The method. archpilot makes the agent:

1. Interview you in short rounds (max 3–4 questions, each with a default)
2. Start from an opinionated reference architecture and justify every deviation
3. Check a list of commonly forgotten concerns: auth, rate limits, idempotency, backups, secrets, cost per request, data deletion
4. Run a pre-mortem: the top 5 ways this design fails, each with a mitigation
5. Validate the diagram, repairing from structured errors
6. Write an ARCHITECTURE.md that the coding agent must follow. Deviations get flagged, not silently made.

The numbers. Same 10 ideas, same model:
→ concerns covered: 5.9/6 on average vs 3.5/6 for the plain prompt
→ cost: 9/10 vs 1/10
→ failure handling: 10/10 vs 5/10

The limits, honestly.
→ The rubric checks whether a concern is mentioned, not whether it's handled well. And archpilot's prompt asks for those concerns, so part of the gap is the method doing what it says.
→ Sonnet wrote valid Mermaid first try in all 20 runs, so my diagram repair loop never fired. I can't claim it helps yet.
→ Pattern retrieval is keyword-based: 4 of the 10 ideas got a poor-fit reference pattern (in 3 of those the model rejected it explicitly).
→ 10 ideas, one run each. Small sample.

Every prompt and output is recorded in the repo so you can re-score it yourself.

It's open source (MIT): https://github.com/saimsheikh/archpilot

If you try it on your next project, I'd love to hear which question it asked that you hadn't thought about.

#SoftwareArchitecture #AI #ClaudeCode #MCP #BuildInPublic
