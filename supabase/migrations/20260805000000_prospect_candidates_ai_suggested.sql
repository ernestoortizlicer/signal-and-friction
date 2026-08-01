-- ════════════════════════════════════════════════════════════
-- MIGRATION: Allow AI-suggested prospect candidates
-- Migration ID: 20260805000000_prospect_candidates_ai_suggested
--
-- Companion to the new prospecting-suggest-leads edge function. Loosens
-- prospect_candidates.source from a hard CHECK (source = 'seed_list') to
-- also allow 'ai_suggested' — nothing else about the table changes. An
-- AI-suggested candidate goes through the exact same status lifecycle
-- (new → scanning → scanned/scan_failed → promoted/dismissed) as a
-- manually pasted one; source only records provenance, it never changes
-- what gates a candidate can pass through.
--
-- Deliberately NOT adding a "verified"/"unconfirmed" status column: an
-- AI-suggested company is never written to this table until a human
-- clicks Add in the review panel (after a lightweight real-fetch check
-- already ran client-visible in that panel), and the existing scan
-- pipeline is the only thing that can ever move a row out of 'new' —
-- so the suggestion step itself never needs its own DB-level trust
-- state. Nothing unverified ever reaches this table at all.
-- ════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.prospect_candidates
  DROP CONSTRAINT IF EXISTS prospect_candidates_source_check;

ALTER TABLE public.prospect_candidates
  ADD CONSTRAINT prospect_candidates_source_check
  CHECK (source IN ('seed_list', 'ai_suggested'));

-- Sanity check: constraint should now accept both values.
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.prospect_candidates'::regclass
  AND conname = 'prospect_candidates_source_check';

COMMIT;
