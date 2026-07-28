-- ════════════════════════════════════════════════════════════
-- MIGRATION: PROSPECTING CANDIDATES
-- Migration ID: 20260728000000_prospect_candidates
--
-- Backing table for the automated prospecting pipeline. A candidate is a
-- company URL pasted in as a seed list, scanned via the existing scan-url
-- engine, and scored by a fixed arithmetic formula on purely observable
-- technical signals. This table intentionally has no column for a "pain point",
-- "diagnosis", or "projected impact" — that judgment stays with the human
-- reviewing the Command Center view. technical_signals stores only the raw
-- scan fields (see functions/api/_scan.ts:toRawTechnicalSignals); the
-- scan's narrative frictionMechanisms text and abandonmentDelta projection
-- are never written here.
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.prospect_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain TEXT NOT NULL UNIQUE,
    url TEXT NOT NULL,
    company_name TEXT,
    source TEXT NOT NULL DEFAULT 'seed_list' CHECK (source = 'seed_list'),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'scanning', 'scanned', 'scan_failed', 'promoted', 'dismissed')),
    technical_signals JSONB,
    technical_score INTEGER,
    score_breakdown JSONB,
    founder_contact TEXT,
    scan_error TEXT,
    scanned_at TIMESTAMPTZ,
    promoted_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    dismissed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prospect_candidates_score ON public.prospect_candidates(technical_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_prospect_candidates_status ON public.prospect_candidates(status);

-- KNOWN DIVERGENCE (found 2026-07-28, applied via SQL editor): this CREATE
-- TRIGGER failed silently against the live DB — public.set_updated_at()
-- does not exist there under that name, despite being defined in
-- 20260618000000_init_prospection.sql in this repo. Same class of
-- migration-history-vs-live-DB drift already documented in
-- 20260711000000_close_anon_rls_gaps.sql. Table, indexes, and the RLS
-- policy below all applied fine; only this trigger is missing live, so
-- updated_at on prospect_candidates does not currently auto-update.
-- Not fixed yet — either create public.set_updated_at() live or drop this
-- trigger so the file matches reality.
CREATE TRIGGER trigger_set_prospect_candidates_updated
    BEFORE UPDATE ON public.prospect_candidates
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.prospect_candidates ENABLE ROW LEVEL SECURITY;

-- Matches this app's established "authenticated = admin" pattern (public
-- self-signup is disabled at the Supabase Auth level; see
-- 20260711000000_close_anon_rls_gaps.sql).
CREATE POLICY admin_all_prospect_candidates ON public.prospect_candidates
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
