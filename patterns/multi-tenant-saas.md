---
id: multi-tenant-saas
name: Multi-tenant SaaS
when_to_use:
  - A B2B product where many customer organizations share one deployment
  - You need per-organization users, roles, billing and data isolation
  - You want one codebase and one deploy pipeline for all customers
scale_range: "10 to 10k tenants; up to a few thousand requests per second"
components:
  - Web frontend
  - API service (stateless)
  - Auth provider with organizations and SSO
  - Postgres with tenant_id on every row and row-level security
  - Background job queue and workers
  - Billing provider with webhooks
  - Object storage with per-tenant prefixes
  - Audit log
failure_modes:
  - Cross-tenant data leak from a query that forgets the tenant filter
  - Noisy neighbor tenant exhausts shared database or queue capacity
  - Billing webhook missed or processed twice, leaving plan state wrong
  - Enterprise customer requires data residency or a dedicated instance late in the sales cycle
cost_drivers:
  - Shared database size and IOPS
  - Per-seat or per-MAU auth provider pricing
  - Background job compute
tags:
  [
    saas,
    b2b,
    multi-tenant,
    tenants,
    organizations,
    billing,
    subscriptions,
    rbac,
    sso,
    postgres,
    web-app,
  ]
---

# Multi-tenant SaaS

One deployment serves every customer organization. Isolation is enforced in the data layer,
not by convention in application code.

## Diagram

```mermaid
flowchart TD
  browser([Browser]) --> web["Web frontend"]
  web --> api["API service (stateless)"]
  api --> auth["Auth provider: orgs + SSO"]
  api --> db[("Postgres: tenant_id + RLS")]
  api --> queue[["Job queue"]]
  queue --> workers["Workers"]
  workers --> db
  api --> files[("Object storage: per-tenant prefix")]
  billing["Billing provider"] -->|webhooks| api
  api --> audit[("Audit log")]
```

## Trade-offs

- **Shared schema with tenant_id + row-level security (default):** cheapest to run and
  migrate. Isolation depends on RLS being on for every table, so test it.
- **Schema or database per tenant:** stronger isolation and easy per-tenant restore, but
  migrations fan out to N databases and connection counts explode. Reserve for enterprise
  tiers that pay for it.
- **Buy auth:** organizations, invites, SSO/SAML and SCIM are months of work; buy them.
- **Stateless API:** lets you scale horizontally; keep sessions in the auth provider or a
  shared store.

## Failure modes and mitigations

1. **Cross-tenant leak.** Enforce Postgres RLS using a session variable set per request;
   add an automated test that runs every endpoint as tenant A against tenant B's ids.
2. **Noisy neighbor.** Per-tenant rate limits, per-tenant job concurrency caps, and query
   timeouts.
3. **Billing drift.** Make webhook handlers idempotent (store event ids) and reconcile plan
   state nightly against the billing provider.
4. **Late data-residency demands.** Keep region in the tenant record from day one so a
   second regional deployment is configuration, not a rewrite.

## Do not use it for

- Single-customer internal tools: you pay the tenancy complexity for nothing.
- Consumer apps where every user is their own "tenant": plain per-user ownership is enough.
- Regulated customers that contractually require physical isolation: plan dedicated
  deployments instead.
