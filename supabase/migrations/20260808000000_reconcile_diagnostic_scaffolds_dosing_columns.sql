-- ════════════════════════════════════════════════════════════
-- MIGRATION: Reconcile diagnostic_scaffolds dosing columns
-- Migration ID: 20260808000000_reconcile_diagnostic_scaffolds_dosing_columns
--
-- Found live 2026-08-02: diagnostic_scaffolds had ZERO columns matching
-- pending%/dosing% — despite 20260806000000_commercial_dosing_engine.sql
-- (which added them, in the same transaction that also backfilled
-- stripe_payment_links.line/tier, which DID commit successfully). Root
-- cause not fully confirmed — the two parts should have committed
-- together as one transaction. Whatever happened historically, this
-- migration is a standalone, idempotent re-application of ONLY the
-- diagnostic_scaffolds columns this feature needs, safe to run even if
-- some or all of them already exist (every statement is
-- ADD COLUMN IF NOT EXISTS — a no-op on a column that's already there).
-- ════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.diagnostic_scaffolds
  ADD COLUMN IF NOT EXISTS funnel_stage TEXT
    CHECK (funnel_stage IN ('landing', 'pricing', 'signup', 'checkout', 'activation')),
  ADD COLUMN IF NOT EXISTS projected_impact_magnitude TEXT
    CHECK (projected_impact_magnitude IN ('low', 'moderate', 'high')),
  ADD COLUMN IF NOT EXISTS confidence_level TEXT
    CHECK (confidence_level IN ('low', 'moderate', 'high')),
  ADD COLUMN IF NOT EXISTS dfy_execution_summary TEXT,
  ADD COLUMN IF NOT EXISTS dfy_monitoring_findings TEXT,
  ADD COLUMN IF NOT EXISTS dfy_handoff_documentation TEXT,
  ADD COLUMN IF NOT EXISTS pending_dosing_line TEXT
    CHECK (pending_dosing_line IN ('dwy', 'dfy')),
  ADD COLUMN IF NOT EXISTS pending_dosing_tier TEXT
    CHECK (pending_dosing_tier IN ('beta_diagnostic', 'intervention', 'monitoring', 'expansion', 'autonomy_kit')),
  ADD COLUMN IF NOT EXISTS pending_dosing_triggered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dosed_preview JSONB;

-- Verification: every column the webhook and the publish path need
-- should now appear in this list. Compare against the information_schema
-- query run before this migration — anything that appeared here but not
-- there is what was actually missing.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'diagnostic_scaffolds'
  AND column_name IN (
    'funnel_stage', 'projected_impact_magnitude', 'confidence_level',
    'dfy_execution_summary', 'dfy_monitoring_findings', 'dfy_handoff_documentation',
    'pending_dosing_line', 'pending_dosing_tier', 'pending_dosing_triggered_at', 'dosed_preview'
  )
ORDER BY column_name;

COMMIT;
