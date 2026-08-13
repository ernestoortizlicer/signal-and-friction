# Stripe payments Event Destination routing note

Release-blocking finding discovered after PR #7: the pre-existing Stripe Event Destination and the new payments Event Destination would otherwise share `/api/stripe/webhook` while each destination has its own signing-secret lifecycle. One runtime verification slot must not be silently reused by two independently managed destinations.

Decision: preserve the existing `/api/stripe/webhook` route and `STRIPE_WEBHOOK_SECRET`; route Snapshot `checkout.session.completed` deliveries through `/api/stripe/payments-webhook` with a dedicated `STRIPE_PAYMENTS_WEBHOOK_SECRET`.

This file is operational context only. It does not authorize a live Stripe destination or production secret change.
