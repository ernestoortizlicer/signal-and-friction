-- ════════════════════════════════════════════════════════════
-- WARNING: migration history diverged from the live database as of
-- 2026-07-11. RLS state was verified directly against pg_policies
-- in production. Do not infer RLS state from this directory —
-- query pg_policies.
-- ════════════════════════════════════════════════════════════
--
-- MIGRATION: Close anon-readable policies verified live
-- Migration ID: 20260711000000_close_anon_rls_gaps
--
-- An earlier version of this migration inferred RLS state purely
-- from the migration files in this directory and was largely a
-- false positive: the allow_read_* policies it targeted on clients,
-- transactions, investments, net_worth_snapshots, and the other
-- finance/priority tables are scoped to {authenticated}, not
-- {anon}, in the live database — those tables were never
-- anonymously readable.
--
-- The real vulnerabilities, found by querying pg_policies directly
-- against production:
--   1. Public self-signup was enabled in Supabase Auth. Combined
--      with the many FOR ALL TO authenticated USING (true) policies
--      that exist by design (this app's "authenticated = admin"
--      pattern), anyone could register an account, obtain the
--      authenticated role, and get full read/write on clients and
--      financial data. Self-signup has been disabled directly in
--      the Supabase dashboard — not something a migration can fix.
--   2. Four policies were genuinely anon-readable. Dropped below.
--
-- After this migration, only 3 anon-readable policies remain, all
-- intentional: portfolio, testimonials (published-only), and
-- stripe_payment_links (payment link URLs are not sensitive).
-- ════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Allow select anon" ON public.protocol_executions;
DROP POLICY IF EXISTS public_read ON public.deliverables;
DROP POLICY IF EXISTS allow_read_education_drafts ON public.education_drafts;
DROP POLICY IF EXISTS allow_read_education_progress ON public.education_progress;
