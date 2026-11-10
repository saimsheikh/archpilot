# Commonly forgotten concerns

For each concern, the design must either handle it (name the component or decision) or say
explicitly why it is not needed. Use the probing question when you are unsure.

## Auth and access

- **Authentication**: who can log in and how (email, SSO, social, API keys)? Buy it unless
  there is a strong reason not to.
- **Authorization**: roles, per-object permissions, tenant isolation. Enforced in one place?
- **Service-to-service auth**: how do internal services and jobs authenticate?

## Traffic and abuse

- **Rate limits**: per user, per IP, per API key; on login and expensive endpoints first.
- **Input limits**: maximum upload size, payload size, pagination limits.
- **Bots and abuse**: signup spam, scraping, credential stuffing.

## Async work

- **Queues**: anything slower than ~1 s or calling third parties goes to a background job.
- **Idempotency**: retries happen. Payments, emails, webhooks and job handlers must be safe
  to run twice (idempotency keys, processed-event ids).
- **Retries and dead letters**: bounded retries with backoff; failed jobs go somewhere
  visible.
- **Webhooks in**: verify signatures, store events, process asynchronously.

## Operations

- **Observability**: structured logs, metrics (latency, error rate, saturation), traces with
  a request id across services, and alerts that a human will act on.
- **Health checks and deploys**: readiness checks, zero-downtime deploys, rollback plan.
- **Backups**: automated database backups, tested restore, point-in-time recovery if data
  is valuable. Object storage versioning for user files.
- **Environments**: at least local and production; staging if more than one developer.
- **Migrations**: schema changes that do not lock tables or break the running version.

## Security

- **Secrets**: stored in a secret manager or platform env vars, never in the repo; rotation
  plan.
- **Encryption**: TLS everywhere; encryption at rest for sensitive data.
- **Dependencies**: automated updates and vulnerability scanning.
- **LLM-specific**: prompt injection through user or retrieved content, tool permissions,
  output validation.

## Cost

- **Cost per request / per user**: estimate it, especially for LLM calls, media, egress.
- **Cost ceilings**: budgets and alerts; caps on per-user expensive operations.
- **Idle cost**: managed services with a high minimum bill.

## Failure modes

- **Third-party outages**: what happens when the payment, auth, email or LLM provider is
  down? Timeouts, fallbacks, degraded mode.
- **Single points of failure**: one database, one region, one worker.
- **Data consistency**: what if a step in a multi-step write fails halfway?

## Data lifecycle and privacy

- **Data deletion**: account deletion that also removes data from backups, search indexes,
  analytics and third parties within the required time.
- **Data export**: users or customers asking for their data.
- **Retention**: how long logs, events and user content are kept.
- **PII in logs**: mask or avoid it.
- **Compliance**: GDPR/CCPA basics, and HIPAA/PCI/SOC 2 if the domain requires it.
