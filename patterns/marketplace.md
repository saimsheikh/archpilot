---
id: marketplace
name: Two-sided marketplace
when_to_use:
  - Connecting independent sellers or providers with buyers or customers (tutors, freelancers, rentals, services)
  - The platform takes payment from one side and pays out the other, minus a commission
  - Search, booking or ordering, reviews and trust between strangers are core to the product
scale_range: "100 to 100k providers; 1k to 1M buyers"
components:
  - Web and mobile clients for buyers and providers
  - API service
  - Postgres for listings, bookings and orders
  - Search over listings (Postgres full-text first, a search engine later)
  - Payments provider with connected accounts for split payouts (e.g. Stripe Connect)
  - Booking or availability service
  - Reviews and ratings
  - Messaging between buyers and providers
  - Trust and safety tooling (verification, moderation, disputes)
  - Notification service (email, SMS, push)
failure_modes:
  - Double booking when two buyers reserve the same slot at the same time
  - Payout errors or delays break provider trust and trigger churn on the supply side
  - Fraud, fake listings or fake reviews erode trust in the whole marketplace
  - Disintermediation, where buyers and providers move off-platform to avoid the commission
  - KYC and tax rules for paying out individuals block launch in new countries
cost_drivers:
  - Payment processing and payout fees
  - Search infrastructure at scale
  - Support and trust-and-safety staff time
tags:
  [
    marketplace,
    two-sided,
    booking,
    providers,
    sellers,
    buyers,
    freelancers,
    tutors,
    commission,
    payouts,
    stripe-connect,
    reviews,
  ]
---

# Two-sided marketplace

Buyers find and pay providers; the platform holds the money, takes a cut and pays out. The
hard problems are trust, payments between strangers, and growing both sides at once, not
raw scale.

## Diagram

```mermaid
flowchart TD
  buyer([Buyer]) --> app["Web / mobile app"]
  provider([Provider]) --> app
  app --> api["API service"]
  api --> db[("Postgres: listings, bookings, orders")]
  api --> search["Listing search"]
  search --> db
  api --> booking["Booking + availability"]
  booking --> db
  api --> payments["Payments: connected accounts + payouts"]
  payments -->|webhooks| api
  api --> reviews["Reviews + ratings"]
  api --> messaging["Buyer-provider messaging"]
  api --> trust["Trust + safety: KYC, moderation, disputes"]
  api --> notify["Notifications"]
```

## Trade-offs

- **Payments provider with connected accounts (default):** handles KYC, split payments,
  payouts and tax forms. Building this yourself is a regulated money-transmission problem;
  buy it, and accept its fees and country coverage.
- **Postgres search first:** full-text plus filters (category, price, location) covers early
  catalogs; add a search engine only when relevance or faceting outgrows it.
- **Managed vs request-to-book:** instant booking converts better but needs reliable
  availability; request-to-book is simpler and gives providers control.
- **On-platform messaging:** costs effort and moderation, but keeps transactions on the
  platform and gives evidence for disputes.

## Failure modes and mitigations

1. **Double booking.** Reserve slots in a transaction with a unique constraint on
   (provider, time slot); hold a slot for a few minutes during checkout.
2. **Payout problems.** Use the payments provider's payout schedule, make webhook handlers
   idempotent, reconcile daily, and show providers a clear earnings ledger.
3. **Fraud and fake reviews.** Only allow reviews after a completed transaction, verify
   providers, rate-limit new accounts, and hold first payouts.
4. **Disintermediation.** Add value that only exists on-platform: payment protection,
   scheduling, reviews, insurance; detect contact details in early messages.
5. **KYC and tax blockers.** Check the payments provider's supported countries and payout
   requirements before choosing launch markets.

## Do not use it for

- A single seller selling to customers: that is a plain online shop.
- B2B procurement with negotiated contracts and invoicing: different workflow and tooling.
- Pure lead generation where the platform never touches the money: a directory is simpler.
