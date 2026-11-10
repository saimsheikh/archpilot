# Interview guide

Ask in rounds of at most 3 to 4 questions. Each question gets a default the user can accept.
Skip any question already answered. The "why it matters" line is for you, not the user.

## Round 1: what and for whom (always first)

| Question                                                                | Default                 | Why it matters                                   |
| ----------------------------------------------------------------------- | ----------------------- | ------------------------------------------------ |
| Who uses it, and what is the one job they hire it for?                  | none, must ask          | Drives every other decision                      |
| Roughly how many users in the first year, and how many at once at peak? | 1k users, 50 concurrent | Separates single-server from distributed designs |
| What must never fail or be lost?                                        | user data and payments  | Defines where to spend reliability budget        |
| Is there anything you have already decided (stack, cloud, vendors)?     | none                    | Constraints beat preferences                     |

## Round 2: constraints

| Question                                                                             | Default                              | Why it matters                             |
| ------------------------------------------------------------------------------------ | ------------------------------------ | ------------------------------------------ |
| Does it store personal, payment, health or regulated data? Any data-residency rules? | personal data (emails), no residency | Compliance can dictate hosting and vendors |
| Monthly budget for infrastructure and third-party services?                          | under $200/month at launch           | Rules out expensive managed services early |
| Team size and the languages/frameworks they know well?                               | 1 to 2 developers, TypeScript        | Pick what the team can operate at 3 a.m.   |
| Where will it run: a cloud, on-prem, edge, app stores?                               | one managed cloud region             | Deployment target shapes the whole stack   |

## Round 3: shape of the workload (ask only what still matters)

| Question                                                      | Default                              | Why it matters                                   |
| ------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------ |
| How fast must responses feel? Anything real-time?             | under 500 ms for pages, no real-time | Real-time needs WebSockets and different scaling |
| How much data, and how fast does it grow?                     | under 10 GB in year one              | Decides single database vs partitioning          |
| Any heavy background work (imports, emails, AI calls, video)? | some emails and exports              | Needs a queue and workers                        |
| Build or buy for auth, payments, search, AI?                  | buy auth and payments                | Buying saves months; note lock-in                |
| Integrations with other systems?                              | none                                 | Each integration is a failure mode               |

## When to stop

Stop asking when the remaining unknowns would not change components, data stores or
deployment. Record those as open questions in `ARCHITECTURE.md` instead.

## If the user is vague

Propose a concrete scenario ("Say 500 teams, 10 users each, mostly weekday office hours:
does that sound right?") and let them correct it. People correct numbers more easily than
they invent them.
