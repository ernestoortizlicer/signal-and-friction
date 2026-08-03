-- ════════════════════════════════════════════════════════════
-- MIGRATION: CONTACT DISCOVERY ON PROSPECT CANDIDATES
-- Migration ID: 20260809000000_prospect_candidates_contact_discovery
--
-- Audit finding (2026-08-03): prospect_candidates.founder_contact is a
-- single untyped free-text column a human fills in by hand — there was
-- never any automated CEO/founder/LinkedIn/email discovery in this
-- codebase. This migration adds storage for the first real attempt
-- (supabase/functions/prospecting-discover-contact/index.ts), which
-- returns candidates with explicit provenance and verification state,
-- never a fabricated "verified" result — see that function's own header
-- comment for why "verified" is structurally representable but never
-- actually produced today.
--
-- Additive only. founder_contact is untouched and keeps working exactly
-- as before; contact_discovery is a new, independent column that starts
-- NULL on every existing row (never discovered, not "no contact exists" —
-- the UI must render that distinction, not collapse it to an empty field).
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.prospect_candidates
    ADD COLUMN IF NOT EXISTS contact_discovery JSONB;

COMMENT ON COLUMN public.prospect_candidates.contact_discovery IS
    'Ephemeral discovery-run output persisted on demand from prospecting-discover-contact edge function. Shape: { runAt, people: {status, candidates[]}, linkedin: {status, candidates[]}, email: {status, candidates[]}, meta }. Every candidate carries verificationStatus (verified|candidate|inferred), sourceUrl, rationale, discoveredAt — never a bare string. NULL means never run, not "no contact exists".';

-- Verification query — confirm the column exists with the expected type
-- before treating this migration as applied:
--   SELECT column_name, data_type
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'prospect_candidates'
--     AND column_name = 'contact_discovery';
