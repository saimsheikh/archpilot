# X thread (8 posts)

**1/8**
Coding agents start building the second you describe an idea.

Nobody asks about scale, budget, compliance, or what happens when a vendor goes down.

I built archpilot: an MCP server + Claude Code skill that makes the agent plan first. Here's what I measured 🧵

**2/8**
Baseline: 10 project ideas, Claude Sonnet, plain prompt: "Draw me an architecture diagram for this project. Use Mermaid."

Diagrams rendered fine. But:
• cost mentioned in 1/10
• failure handling in 5/10
• observability in 6/10

**3/8**
archpilot changes the process, not the model:
• short interview rounds (≤4 questions, each with a default)
• start from an opinionated reference architecture
• a checklist of forgotten concerns: auth, rate limits, idempotency, backups, cost per request, data deletion

**4/8**
Then a pre-mortem: "it's a year later and this failed. Why?" Top 5 risks across scaling, cost, vendor lock-in, data-pipeline fragility and security, each with a concrete mitigation.

**5/8**
The output is a contract, not a picture: a validated diagram + ARCHITECTURE.md that ends with rules for the coding agent. "Follow this architecture. Flag any deviation instead of silently changing it."

**6/8**
Same 10 ideas, same model:
• concerns covered: 5.9/6 vs 3.5/6
• cost: 9/10 vs 1/10
• failure handling: 10/10 vs 5/10

**7/8**
Limits, honestly:
• the rubric checks a concern is mentioned, not handled well, and archpilot asks for those concerns
• Sonnet wrote valid Mermaid first try in all 20 runs, so the repair loop never fired
• 4/10 ideas got a poor-fit pattern from keyword retrieval
• n=10

**8/8**
Open source, MIT. All prompts and outputs are recorded so you can re-score them.

github.com/saimsheikh/archpilot

What's the question you always forget to ask before building?
