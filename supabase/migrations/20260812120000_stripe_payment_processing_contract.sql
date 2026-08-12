-- ════════════════════════════════════════════════════════════
-- STRIPE PAYMENT IDEMPOTENCY CONTRACT
-- 2026-08-12
--
-- Purpose:
--   Make the production idempotency invariant reproducible on fresh/staging
--   databases without introducing unrelated commerce state.
--
-- Invariant:
--   one Checkout Session -> at most one canonical payment row.
--
-- Production was independently verified on 2026-08-12 to already enforce
-- UNIQUE(stripe_session_id). Migration history did not reproduce that truth.
-- This migration is therefore a no-op in production and additive elsewhere.
-- ════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.payments'::regclass
      AND contype = 'u'
      AND conname = 'payments_stripe_session_id_key'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_stripe_session_id_key UNIQUE (stripe_session_id);
  END IF;
END
$$;
