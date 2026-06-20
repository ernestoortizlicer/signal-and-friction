-- ════════════════════════════════════════════════════════════
-- MIGRATION: Admin Dashboard Anon Read Policies
-- Migration ID: 20260620000100_admin_anon_read_policies
--
-- Root Cause: RLS policies only allow 'authenticated' role.
-- The admin dashboard uses anon key as fallback when no session
-- cookie is present, causing silent fallback to demo data.
--
-- Fix: Add SELECT-only policies for anon on tables the dashboard
-- reads. Write operations remain restricted to authenticated only.
-- ════════════════════════════════════════════════════════════

-- ── CLIENTS (dashboard pipeline) ──
CREATE POLICY anon_read_clients ON public.clients
    FOR SELECT TO anon USING (true);

-- ── BETA_PROJECTS (pipeline status & phases) ──
CREATE POLICY anon_read_beta_projects ON public.beta_projects
    FOR SELECT TO anon USING (true);

-- ── PERFORMANCE_GUARANTEES (guarantee panel in modal) ──
CREATE POLICY anon_read_performance_guarantees ON public.performance_guarantees
    FOR SELECT TO anon USING (true);

-- ── INTERACTIONS (friction diagnostics timeline) ──
CREATE POLICY anon_read_interactions ON public.interactions
    FOR SELECT TO anon USING (true);

-- ── ACTIVITY_LOG (event timeline in modal) ──
CREATE POLICY anon_read_activity_log ON public.activity_log
    FOR SELECT TO anon USING (true);

-- ── TASKS (priority engine) ──
CREATE POLICY anon_read_tasks ON public.tasks
    FOR SELECT TO anon USING (true);

-- ── TESTIMONIALS (portfolio page) ──
CREATE POLICY anon_read_testimonials ON public.testimonials
    FOR SELECT TO anon USING (true);

-- ── PORTFOLIO (portfolio page) ──
CREATE POLICY anon_read_portfolio ON public.portfolio
    FOR SELECT TO anon USING (true);

-- ── FINANCE TABLES (if they exist) ──
CREATE POLICY anon_read_revenue_events ON public.revenue_events
    FOR SELECT TO anon USING (true);

CREATE POLICY anon_read_expense_records ON public.expense_records
    FOR SELECT TO anon USING (true);

CREATE POLICY anon_read_finance_snapshots ON public.finance_snapshots
    FOR SELECT TO anon USING (true);

-- ── EDUCATION TABLES (learning module) ──
CREATE POLICY anon_read_education_content ON public.education_content
    FOR SELECT TO anon USING (true);

CREATE POLICY anon_read_education_drafts ON public.education_drafts
    FOR SELECT TO anon USING (true);

CREATE POLICY anon_read_education_progress ON public.education_progress
    FOR SELECT TO anon USING (true);

-- ── REFERRALS (referral tracking) ──
CREATE POLICY anon_read_referrals ON public.referrals
    FOR SELECT TO anon USING (true);
