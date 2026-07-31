-- ════════════════════════════════════════════════════════════
-- MIGRATION: Enable RLS on certification_programs, certified_practitioners,
-- performance_guarantees
-- Migration ID: 20260731000000_enable_rls_certified_guarantee_tables
--
-- Full Command Center audit (2026-07-31) found these three tables — all
-- created in 20260619000200_certified_guarantee_tables.sql — never had
-- ALTER TABLE ... ENABLE ROW LEVEL SECURITY run against them, in any
-- migration, ever. performance_guarantees does have a CREATE POLICY
-- (authenticated_read_own_guarantees, from 20260626000000_fix_rls_client_keyed.sql)
-- but a policy on a table where RLS itself was never enabled is dormant —
-- Postgres ignores it and falls back to plain GRANT permissions. All three
-- were confirmed empty via live anon-key testing at audit time, so this
-- closes the gap before anything is ever written to them, not after.
--
-- Every real consumer of these three tables lives under src/app/admin/*
-- (admin/certified/page.tsx reads+writes certified_practitioners and reads
-- certification_programs; admin/dashboard/page.tsx reads+writes
-- performance_guarantees) — grepped the whole codebase, zero public-facing
-- consumers. So this applies the same "authenticated = admin" pattern
-- already used everywhere else in this schema (admin_all_* policies),
-- with no anon policy on any of the three — matching the posture this
-- repo has already converged on for every other admin-only table, and the
-- exact class of over-permissive-anon-policy this repo's own
-- 20260711000000_close_anon_rls_gaps.sql migration was written to fix.
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.certification_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certified_practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_guarantees ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all_certification_programs ON public.certification_programs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY admin_all_certified_practitioners ON public.certified_practitioners
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- performance_guarantees already carries authenticated_read_own_guarantees
-- (a narrower, client-keyed SELECT policy) from 20260626000000 — left in
-- place rather than dropped. It was written for a possible future
-- client-login flow that doesn't exist yet in this app (only the admin has
-- a real Supabase Auth session today); once RLS is actually enabled here,
-- Postgres evaluates policies for the same role+command with OR logic, so
-- this broader admin policy is simply the one that applies in practice
-- right now. Not a conflict — the older policy becomes correctly inert
-- rather than incorrectly inert.
CREATE POLICY admin_all_performance_guarantees ON public.performance_guarantees
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
