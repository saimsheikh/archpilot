# Examples

Three real outputs from the eval run `2026-11-10T09-40-46-939Z` (Claude Sonnet), copied
unedited from `evals/runs/<run>/outputs/`. Each folder has the generated `ARCHITECTURE.md`
and the rendered diagram it links to.

| Example                                                | Project idea                                                                     | Pattern retrieval picked                                    |
| ------------------------------------------------------ | -------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| [support-rag-bot](support-rag-bot/ARCHITECTURE.md)     | Help-center assistant over 2,000 articles and past tickets, with human handoff   | RAG application (good fit)                                  |
| [tutor-marketplace](tutor-marketplace/ARCHITECTURE.md) | Two-sided tutoring marketplace with booking, payments, video and payouts         | RAG application (poor fit; there is no marketplace pattern) |
| [clinic-booking](clinic-booking/ARCHITECTURE.md)       | Appointment booking for 15 physiotherapy clinics with health data kept in the EU | Data / ML pipeline (poor fit)                               |

The two poor fits are kept on purpose: they show the retriever always returns its best
keyword match, even when nothing fits. In the marketplace plan the model rejects the RAG
reference explicitly ("This deviates from the RAG reference, whose embeddings, reranker and
LLM add cost and failure modes with no v1 need"). A relevance threshold is on the roadmap.

The eval cannot interview anyone, so these plans assume defaults and list them under
"Open questions". With the skill in Claude Code, the interview replaces those assumptions
with your answers.

Regenerate them with `npm run eval -- --only <idea-id>`.
