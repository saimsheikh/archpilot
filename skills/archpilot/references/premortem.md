# Pre-mortem

Imagine it is twelve months after launch and the project has failed or had a serious
incident. Write the five most likely causes for **this** design, not generic ones. Cover at
least one cause from each category below, then pick the five with the highest
likelihood x impact.

For each risk give: what happens (one sentence), likelihood (low/medium/high), and one
concrete mitigation the team can actually do.

## Categories and prompts

### Scaling

- Which component hits its limit first if usage is 10x the estimate? (Usually the database,
  a single worker, or a synchronous third-party call.)
- Is there a hot partition, hot tenant or hot document?
- What happens during a traffic spike from a launch or a push notification?

### Cost

- Which line item grows faster than revenue? (LLM tokens, egress, per-seat SaaS, logs.)
- Is there an operation a single user can trigger that costs real money each time?
- What is the minimum monthly bill even with zero users?

### Vendor dependency

- Which vendor, if it raised prices 3x, shut down an API, or had a day-long outage, would hurt
  the most?
- Is data stored in a format or service that is hard to export?
- Is there an abstraction or exit plan for that vendor (even if not built yet)?

### Data-pipeline fragility

- Where does data move between systems (ETL, webhooks, sync, search indexing)?
- What happens on schema changes, partial failures, duplicates, or late data?
- How would anyone notice the data is wrong?

### Security

- What is the most valuable data, and what is the shortest path for an attacker to reach it?
- Can one tenant or user ever see another's data?
- Are there admin tools, API keys or LLM tools with more power than they need?

## Good vs weak risk entries

Weak: "The system might not scale." / Mitigation: "Make it scalable."

Good: "Postgres write load from the activity feed exceeds a single instance around 2k
writes/s." / Likelihood: medium / Mitigation: "Batch feed writes through the job queue and
add a read replica for feed reads; revisit partitioning at 1k writes/s."

## Feeding back into the design

- If a mitigation is cheap (an index, a queue, a rate limit), add it to the design now.
- If it is expensive, record it as a risk with a trigger ("revisit when ...").
- Every risk goes into `ARCHITECTURE.md` via `export_architecture_md` with its category.
