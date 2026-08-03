-- ════════════════════════════════════════════════════════════
-- MIGRATION: Scaffold reasoning links + unknowns (Phase 3)
-- Migration ID: 20260803000000_scaffold_reasoning_links
--
-- Adds the two Phase 3 columns to diagnostic_scaffolds. Both additive and
-- nullable/defaulted — no existing scaffold row changes behavior. This is
-- the ONLY schema change Phase 3 makes; the 7 judgment fields remain
-- exactly as they are and remain authoritative.
--
-- reasoning_links: JSONB array of DiagnosisHypothesis-shaped objects
-- (src/domain/reasoning/types.ts) — mechanism hypotheses the analyst has
-- deliberately attached, each with a required analyst-authored rationale.
-- Defaults to '[]', matching how `evidence` already defaults on this
-- table. A suggested mechanism the analyst never attaches never appears
-- here — the reasoning engine only ever proposes; nothing writes to this
-- column except a deliberate analyst action via the PATCH endpoint.
--
-- unknowns: plain analyst-authored text, nullable. Never auto-generated,
-- never derived — per explicit decision, uncertainty is part of the
-- product and only the analyst decides what remains unknown.
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.diagnostic_scaffolds
  ADD COLUMN IF NOT EXISTS reasoning_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS unknowns TEXT;

-- Verification query — run this after applying, confirm both columns show
-- up before trusting this migration "ran." (Per this project's own
-- documented history: a migration reporting success is not proof its
-- columns exist live — see 20260808000000_reconcile_diagnostic_scaffolds_dosing_columns.sql's
-- header for the exact incident this caution comes from.)
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'diagnostic_scaffolds'
  AND column_name IN ('reasoning_links', 'unknowns')
ORDER BY column_name;
