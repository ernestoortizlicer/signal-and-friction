-- ════════════════════════════════════════════════════════════
-- MIGRATION: MONITORING BASELINE ON DIAGNOSTIC SCAFFOLDS
-- Migration ID: 20260812000000_scaffold_monitoring_baseline
--
-- Phase 6.3 — the Monitoring launch-state decision. DWY Monitoring was
-- priced and sold with no way to honestly deliver its promise: the
-- scaffold's technical_signals column is overwritten on every Rescan
-- (functions/api/scaffolds/generate.ts), so no before/after ever
-- survived to compare. Building a full analytics/funnel-measurement
-- pipeline was rejected — nobody grants that access by default, and
-- pretending otherwise would be exactly the fabrication this whole
-- system exists to prevent. Instead: Monitoring is reframed around what
-- the existing scan engine can already, honestly measure — real
-- technical evidence, before vs. after, using infrastructure that has
-- existed since Phase 1. This is Option B from the Phase 6.3 audit
-- (reduce/reframe the promise), not Option A (ship the broken promise)
-- or D (make it unavailable) — the capability is real, it just needed
-- one column to stop being silently discarded.
--
-- baseline_technical_signals: a frozen snapshot of technical_signals,
-- captured once (via the new "Set as Monitoring Baseline" admin action)
-- at the moment the analyst confirms the fix is live — never
-- auto-captured, never inferred. NULL means "no baseline yet", not "no
-- signal" — the client-facing module must render that distinction
-- honestly, not collapse it into a blank comparison.
-- baseline_captured_at: when that snapshot was taken — lets the client
-- see the real measurement window, not a vague "recently".
--
-- Additive only. No existing column, row, or behavior changes.
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.diagnostic_scaffolds
  ADD COLUMN IF NOT EXISTS baseline_technical_signals JSONB,
  ADD COLUMN IF NOT EXISTS baseline_captured_at TIMESTAMPTZ;

-- Verification query — confirm both columns exist before trusting this
-- migration "ran":
--   SELECT column_name, data_type
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'diagnostic_scaffolds'
--     AND column_name IN ('baseline_technical_signals', 'baseline_captured_at')
--   ORDER BY column_name;
-- Expect exactly 2 rows.
