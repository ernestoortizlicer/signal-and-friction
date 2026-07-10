-- ════════════════════════════════════════════════════════════
-- MIGRATION: Fix RLS Policies - Client-Keyed Access Control
-- Migration ID: 20260626000000_fix_rls_client_keyed
--
-- SECURITY FIX:
-- The previous migration (20260620000100) opened ALL tables to
-- anonymous users with USING (true) — a critical vulnerability.
-- 
-- NEW APPROACH:
-- Replace permissive policies with client-keyed RLS where:
-- - Authenticated users can read/write only their own client data
-- - Anonymous users cannot read sensitive data
-- - Service role bypasses RLS for admin functions
--
-- Tables affected: clients, beta_projects, interactions, activity_log,
-- performance_guarantees, tasks, finance_records, revenue_events,
-- expense_records, etc.
-- ════════════════════════════════════════════════════════════

-- 1. Drop overly permissive anon policies
DROP POLICY IF EXISTS anon_read_clients ON public.clients;
DROP POLICY IF EXISTS anon_read_beta_projects ON public.beta_projects;
DROP POLICY IF EXISTS anon_read_performance_guarantees ON public.performance_guarantees;
DROP POLICY IF EXISTS anon_read_interactions ON public.interactions;
DROP POLICY IF EXISTS anon_read_activity_log ON public.activity_log;
DROP POLICY IF EXISTS anon_read_tasks ON public.tasks;
DROP POLICY IF EXISTS anon_read_revenue_events ON public.revenue_events;
DROP POLICY IF EXISTS anon_read_expense_records ON public.expense_records;
DROP POLICY IF EXISTS anon_read_finance_snapshots ON public.finance_snapshots;
DROP POLICY IF EXISTS anon_read_education_content ON public.education_content;
DROP POLICY IF EXISTS anon_read_education_drafts ON public.education_drafts;
DROP POLICY IF EXISTS anon_read_education_progress ON public.education_progress;
DROP POLICY IF EXISTS anon_read_referrals ON public.referrals;

-- 2. Create client-keyed policies for authenticated users
-- ────────────────────────────────────────────────────────

-- CLIENTS: Authenticated users can read only if they own the client record
CREATE POLICY authenticated_read_own_client ON public.clients
    FOR SELECT TO authenticated
    USING (auth.uid()::text = id OR auth.role() = 'service_role');

-- CLIENTS: Authenticated users can update only their own client
CREATE POLICY authenticated_update_own_client ON public.clients
    FOR UPDATE TO authenticated
    USING (auth.uid()::text = id OR auth.role() = 'service_role')
    WITH CHECK (auth.uid()::text = id OR auth.role() = 'service_role');

-- BETA_PROJECTS: Read only projects for the user's clients
CREATE POLICY authenticated_read_own_projects ON public.beta_projects
    FOR SELECT TO authenticated
    USING (
      client_id IN (
        SELECT id FROM clients
        WHERE auth.uid()::text = id OR auth.role() = 'service_role'
      )
    );

-- BETA_PROJECTS: Update only projects for the user's clients
CREATE POLICY authenticated_update_own_projects ON public.beta_projects
    FOR UPDATE TO authenticated
    USING (
      client_id IN (
        SELECT id FROM clients
        WHERE auth.uid()::text = id OR auth.role() = 'service_role'
      )
    );

-- INTERACTIONS: Read only interactions for the user's clients
CREATE POLICY authenticated_read_own_interactions ON public.interactions
    FOR SELECT TO authenticated
    USING (
      client_id IN (
        SELECT id FROM clients
        WHERE auth.uid()::text = id OR auth.role() = 'service_role'
      )
    );

-- PERFORMANCE_GUARANTEES: Read only guarantees for the user's clients
CREATE POLICY authenticated_read_own_guarantees ON public.performance_guarantees
    FOR SELECT TO authenticated
    USING (
      client_id IN (
        SELECT id FROM clients
        WHERE auth.uid()::text = id OR auth.role() = 'service_role'
      )
    );

-- 3. Public-facing read policies (for portfolio, testimonials, etc.)
-- ────────────────────────────────────────────────────────────────

-- TESTIMONIALS: Anyone can read published testimonials
DROP POLICY IF EXISTS anon_read_testimonials ON public.testimonials;
CREATE POLICY public_read_testimonials ON public.testimonials
    FOR SELECT TO public
    USING (published = true);

-- PORTFOLIO: Anyone can read published portfolio items
DROP POLICY IF EXISTS anon_read_portfolio ON public.portfolio;
CREATE POLICY public_read_portfolio ON public.portfolio
    FOR SELECT TO public
    USING (published = true);

-- 4. Add audit logging table for RLS enforcement
-- ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rls_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  table_name text NOT NULL,
  operation text NOT NULL,
  rows_affected integer,
  timestamp timestamptz DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.rls_audit_log ENABLE ROW LEVEL SECURITY;

-- Service role can always write audit logs
CREATE POLICY service_role_write_audit ON public.rls_audit_log
    FOR INSERT TO service_role
    WITH CHECK (true);

-- Authenticated users cannot directly write audit logs
CREATE POLICY authenticated_no_direct_audit ON public.rls_audit_log
    FOR SELECT TO authenticated
    USING (false);

-- 5. Grant appropriate permissions
-- ────────────────────────────

GRANT SELECT, UPDATE ON public.clients TO authenticated;
GRANT SELECT, UPDATE ON public.beta_projects TO authenticated;
GRANT SELECT ON public.interactions TO authenticated;
GRANT SELECT ON public.performance_guarantees TO authenticated;
GRANT SELECT ON public.testimonials TO public;
GRANT SELECT ON public.portfolio TO public;
