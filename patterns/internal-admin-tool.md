---
id: internal-admin-tool
name: Internal admin tool
when_to_use:
  - Employees (support, ops, finance) need to view and change production data
  - A small number of users, all inside your company
  - Speed of building matters more than polish
scale_range: "5 to 500 internal users; low request volume"
components:
  - Admin UI (low-code builder or a simple web app)
  - Company SSO
  - Admin API with role-based access control
  - Read replica for searches and reports
  - Primary database for writes through the API
  - Audit log of every change
  - Approval flow for dangerous actions
failure_modes:
  - An admin action corrupts or deletes production data with no undo
  - Over-broad access lets every employee see sensitive customer data
  - Heavy admin queries slow down the production database
  - The tool bypasses business rules and creates invalid states
cost_drivers:
  - Low-code platform seats
  - Engineering time to maintain it
  - Read replica
tags:
  [
    internal,
    admin,
    back-office,
    dashboard,
    crud,
    operations,
    support,
    low-code,
    retool,
    rbac,
    audit,
  ]
---

# Internal admin tool

A small app that lets staff search and fix production data. Its main risks are not scale
but damage: wrong changes, too much access, and no trail.

## Diagram

```mermaid
flowchart LR
  staff([Staff]) --> sso["Company SSO"]
  sso --> ui["Admin UI"]
  ui --> adminApi["Admin API with RBAC"]
  adminApi --> replica[("Read replica")]
  adminApi --> primary[("Primary DB")]
  adminApi --> audit[("Audit log")]
  adminApi --> approvals["Approval flow for risky actions"]
```

## Trade-offs

- **Low-code builder vs custom app:** low-code ships in days and suits CRUD; a custom app
  wins when workflows are complex or seat pricing gets expensive.
- **Go through the API vs direct DB writes:** routing writes through the same domain logic
  as the product prevents invalid states; direct SQL is faster to build and more dangerous.
- **Read replica:** small extra cost, removes the risk of admin searches slowing down
  customers.

## Failure modes and mitigations

1. **Destructive mistakes.** Soft deletes, confirmation for bulk actions, approvals for
   refunds or deletions, and point-in-time database recovery.
2. **Over-broad access.** RBAC from day one, least privilege, and mask sensitive fields by
   default.
3. **Production slowdown.** All reads and exports from the replica with query timeouts.
4. **Bypassed business rules.** Writes call the product's domain services, never raw SQL.

## Do not use it for

- Customer-facing features: build them in the product with proper UX and tenancy.
- Analytics and reporting at scale: use the data warehouse and BI tools.
- Automations that should run without a human: write a job or a workflow.
