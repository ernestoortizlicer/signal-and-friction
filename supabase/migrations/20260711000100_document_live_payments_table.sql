-- ════════════════════════════════════════════════════════════
-- WARNING: migration history diverged from the live database.
-- functions/api/stripe/webhook.ts inserts into public.payments, and that
-- table has existed live all along — verified directly against the live
-- database on 2026-07-11 (all 10 columns the webhook writes are present,
-- plus id/created_at/lead_id). It was simply never captured by a tracked
-- migration, the same class of gap as the RLS divergence fixed in
-- 20260711000000_close_anon_rls_gaps.sql. Do not infer schema state from
-- this directory — query information_schema / pg_policies directly.
-- ════════════════════════════════════════════════════════════
--
-- MIGRATION: Document the live payments table
-- Migration ID: 20260711000100_document_live_payments_table
--
-- CREATE TABLE IF NOT EXISTS — a pure no-op against the live database
-- (the table already exists there), included so a fresh database ends up
-- with the same shape instead of failing the moment the Stripe webhook
-- tries to insert into a table that was never created.
--
-- Column types below are inferred from how functions/api/stripe/webhook.ts
-- uses each field (e.g. raw_event holds the full Stripe event object →
-- JSONB, amount_total is Stripe's integer cents value → INT) and from the
-- id/created_at convention every other table in this schema uses. Live
-- column *names* and count were confirmed directly against the database;
-- exact types/nullability/constraints were not independently re-verified
-- column-by-column, so this is a best-effort documentation of a table
-- that already exists and works today, not a from-scratch design — if a
-- fresh-DB bootstrap ever behaves differently than production here,
-- check information_schema.columns against this file rather than assume
-- either is right.
--
-- lead_id intentionally has no REFERENCES clause: the leads table it
-- points to (functions/api/leads.ts, functions/api/scan-url.ts) is itself
-- undocumented in this migration history — the same divergence, one
-- level deeper. Adding a foreign key to a table this repo never creates
-- would make this migration fail outright on a fresh database. Out of
-- scope for this pass; flagging for a future one.
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_session_id TEXT NOT NULL,
    stripe_customer_id TEXT,
    stripe_payment_intent TEXT,
    email TEXT,
    amount_total INT,
    currency TEXT,
    product_name TEXT,
    segment TEXT,
    referral_code TEXT,
    raw_event JSONB,
    lead_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
