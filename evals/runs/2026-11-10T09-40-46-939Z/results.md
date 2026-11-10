# Eval results

Model: `sonnet` · run: `2026-11-10T09-40-46-939Z`

| Metric | archpilot | baseline |
| --- | --- | --- |
| Ideas | 10 | 10 |
| Model/harness failures | 0 | 0 |
| First-pass render success | 100% | 100% |
| Render success after repair loop | 100% | 100% |
| Avg repair attempts | 0 | 0 |
| Avg render time (ms) | 2471 | 2851 |
| Avg rubric score (/6) | 5.9 | 3.5 |
| Mentions auth | 100% | 80% |
| Mentions dataStore | 100% | 80% |
| Mentions failureHandling | 100% | 50% |
| Mentions observability | 100% | 60% |
| Mentions cost | 90% | 10% |
| Mentions security | 100% | 70% |

## Per idea

| Idea | Condition | First pass | Final | Repairs | Error codes | Rubric |
| --- | --- | --- | --- | --- | --- | --- |
| team-okr-saas | archpilot | yes | rendered | 0 | none | 6/6 |
| team-okr-saas | baseline | yes | rendered | 0 | none | 4/6 |
| support-rag-bot | archpilot | yes | rendered | 0 | none | 6/6 |
| support-rag-bot | baseline | yes | rendered | 0 | none | 2/6 |
| habit-mobile-app | archpilot | yes | rendered | 0 | none | 6/6 |
| habit-mobile-app | baseline | yes | rendered | 0 | none | 6/6 |
| tutor-marketplace | archpilot | yes | rendered | 0 | none | 6/6 |
| tutor-marketplace | baseline | yes | rendered | 0 | none | 3/6 |
| retail-sales-pipeline | archpilot | yes | rendered | 0 | none | 6/6 |
| retail-sales-pipeline | baseline | yes | rendered | 0 | none | 3/6 |
| invoice-agent | archpilot | yes | rendered | 0 | none | 6/6 |
| invoice-agent | baseline | yes | rendered | 0 | none | 2/6 |
| warehouse-admin-tool | archpilot | yes | rendered | 0 | none | 5/6 |
| warehouse-admin-tool | baseline | yes | rendered | 0 | none | 3/6 |
| live-quiz-app | archpilot | yes | rendered | 0 | none | 6/6 |
| live-quiz-app | baseline | yes | rendered | 0 | none | 3/6 |
| clinic-booking | archpilot | yes | rendered | 0 | none | 6/6 |
| clinic-booking | baseline | yes | rendered | 0 | none | 5/6 |
| iot-fleet-monitoring | archpilot | yes | rendered | 0 | none | 6/6 |
| iot-fleet-monitoring | baseline | yes | rendered | 0 | none | 4/6 |

## How to read this

- **baseline**: one plain prompt ("Draw me an architecture diagram ... Use Mermaid"), rendered
  once, no repair. **archpilot**: the skill's flow run non-interactively (pattern retrieval,
  concern checklist, pre-mortem, structured output, validate + up to 3 repairs, then simplify).
- The baseline has no repair loop by design, so its two render rates are equal.
- The rubric is keyword evidence that a topic is *mentioned* in model-written text (risk
  category labels excluded). It does not judge whether the design is good.
- The archpilot prompt includes a checklist naming these topics, so a higher rubric score
  partly reflects that the method asks for them. That is the point of the method, but it
  is not an independent quality judgment.
- No interview happens in the eval: the model is told to assume defaults.
- 10 ideas and one run per idea: small sample, expect run-to-run variance.
