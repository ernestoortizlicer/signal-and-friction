-- ════════════════════════════════════════════════════════════
-- MIGRATION: Close anon RLS gaps — sibling-policy sweep
-- Migration ID: 20260711000000_close_anon_rls_gaps
--
-- ROOT CAUSE OF THE PRIOR FAILED FIX (20260626000000):
-- That migration dropped policies named `anon_read_*` (from
-- 20260620000100). It never touched a second, differently-named,
-- earlier set of policies — `allow_read_*` (from 20260618000001
-- and 20260618000002) — that grant the exact same `TO authenticated,
-- anon USING (true)` access on several of the SAME tables. Postgres
-- RLS policies for the same role+operation are OR'd together
-- (permissive by default): dropping one permissive policy does
-- nothing while a sibling permissive policy still exists. This
-- migration was built by enumerating every CREATE POLICY across
-- ALL 16 migrations and computing the actual cumulative effect per
-- table, not by trusting policy names.
--
-- This migration is idempotent — every DROP uses IF EXISTS, every
-- CREATE POLICY is preceded by a matching DROP IF EXISTS, and every
-- ALTER TABLE ... ENABLE ROW LEVEL SECURITY is safe to re-run.
-- Existing `admin_all_*` (FOR ALL TO authenticated) policies are
-- left untouched everywhere — this app's established pattern is
-- "authenticated = admin, full access," and that access is
-- preserved throughout. service_role always bypasses RLS in
-- Supabase regardless of policy state, so no service-role-based
-- Cloudflare Function is affected by anything below.
-- ════════════════════════════════════════════════════════════

-- 1. Drop the never-closed `allow_read_*` permissive siblings
-- ────────────────────────────────────────────────────────────
-- clients / beta_projects / interactions / activity_log / tasks
-- (from 20260618000001) — the exact tables the prior fix believed
-- it had closed via the differently-named anon_read_* policies.
DROP POLICY IF EXISTS allow_read_clients ON public.clients;
DROP POLICY IF EXISTS allow_read_beta_projects ON public.beta_projects;
DROP POLICY IF EXISTS allow_read_interactions ON public.interactions;
DROP POLICY IF EXISTS allow_read_activity_log ON public.activity_log;
DROP POLICY IF EXISTS allow_read_tasks ON public.tasks;

-- testimonials / portfolio: the unrestricted sibling is dropped;
-- the correct published-only public_read_* policies (added in
-- 20260626000000) remain untouched and now govern anon access.
DROP POLICY IF EXISTS allow_read_testimonials ON public.testimonials;
DROP POLICY IF EXISTS allow_read_portfolio ON public.portfolio;

-- prompt_versions / ai_incidents (from 20260618000001) — never
-- addressed by any prior fix migration at all.
DROP POLICY IF EXISTS allow_read_prompt_versions ON public.prompt_versions;
DROP POLICY IF EXISTS allow_read_ai_incidents ON public.ai_incidents;

-- education_content (from 20260618000002) — differently named from
-- the already-dropped anon_read_education_content.
DROP POLICY IF EXISTS allow_read_education ON public.education_content;

-- education_drafts / education_progress (from 20260619000000) —
-- differently named from the already-dropped anon_read_education_drafts
-- / anon_read_education_progress.
DROP POLICY IF EXISTS allow_read_education_drafts ON public.education_drafts;
DROP POLICY IF EXISTS allow_read_education_progress ON public.education_progress;

-- All 8 finance-intelligence tables (from 20260618000002) — never
-- addressed by any prior fix migration. Real transaction/net-worth data.
DROP POLICY IF EXISTS allow_read_accounts ON public.accounts;
DROP POLICY IF EXISTS allow_read_categories ON public.categories;
DROP POLICY IF EXISTS allow_read_transactions ON public.transactions;
DROP POLICY IF EXISTS allow_read_transaction_entries ON public.transaction_entries;
DROP POLICY IF EXISTS allow_read_investments ON public.investments;
DROP POLICY IF EXISTS allow_read_snapshots ON public.net_worth_snapshots;
DROP POLICY IF EXISTS allow_read_goals ON public.financial_goals;
DROP POLICY IF EXISTS allow_read_fin_incidents ON public.financial_incidents;

-- All 3 priority-engine tables (from 20260618000003) — never
-- addressed by any prior fix migration.
DROP POLICY IF EXISTS allow_read_priority_tasks ON public.priority_tasks;
DROP POLICY IF EXISTS allow_read_priority_log ON public.priority_scores_log;
DROP POLICY IF EXISTS allow_read_priority_config ON public.priority_config;

-- 2. Enable RLS on the 3 tables where it was never enabled at all
-- ────────────────────────────────────────────────────────────
-- Policies referencing performance_guarantees already exist
-- (from 20260620000100 / 20260626000000) but have been inert since
-- RLS was never turned on for this table — enabling it now makes
-- them live. certification_programs / certified_practitioners have
-- no policies at all yet; add admin-only access matching this
-- codebase's established "authenticated = admin" pattern, with no
-- anon access (internal certification/practitioner records).
ALTER TABLE public.certification_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certified_practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_guarantees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_all_certification_programs ON public.certification_programs;
CREATE POLICY admin_all_certification_programs ON public.certification_programs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS admin_all_certified_practitioners ON public.certified_practitioners;
CREATE POLICY admin_all_certified_practitioners ON public.certified_practitioners
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- performance_guarantees already has authenticated_read_own_guarantees
-- (SELECT, client-scoped) from 20260626000000 — add the missing
-- admin write policy so enabling RLS doesn't silently remove the
-- admin dashboard's ability to create/update guarantees.
DROP POLICY IF EXISTS admin_all_performance_guarantees ON public.performance_guarantees;
CREATE POLICY admin_all_performance_guarantees ON public.performance_guarantees
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Verification query (run manually after applying — not part of
-- the migration itself): confirm zero anon-permissive USING(true)
-- policies remain on any table.
--
--   SELECT schemaname, tablename, policyname, roles, qual
--   FROM pg_policies
--   WHERE 'anon' = ANY(roles) AND qual = 'true'
--   ORDER BY tablename;
--
-- Expected result: only stripe_payment_links' "Allow select for all"
-- (intentional — payment link URLs are not sensitive) and
-- testimonials/portfolio's public_read_* (intentional, published-only,
-- qual is NOT bare 'true' so won't match this query anyway).
