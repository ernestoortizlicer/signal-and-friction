-- ════════════════════════════════════════════════════════════
-- MIGRATION: DIAGNOSTIC SCAFFOLDS — LOOM SCRIPT COLUMNS
-- Migration ID: 20260729000001_diagnostic_scaffolds_loom_script
--
-- 20260729000000_diagnostic_scaffolds.sql already ran and the table
-- exists live. This adds the two columns needed by
-- functions/api/scaffolds/generate-loom.ts on top of that, instead of
-- re-running the CREATE TABLE. IF NOT EXISTS makes this safe to run even
-- if it's ever replayed. No RLS change — the existing
-- admin_all_diagnostic_scaffolds policy already covers every column on
-- this table (FOR ALL, not column-scoped).
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.diagnostic_scaffolds
    ADD COLUMN IF NOT EXISTS loom_script TEXT,
    ADD COLUMN IF NOT EXISTS loom_script_generated_at TIMESTAMPTZ;
