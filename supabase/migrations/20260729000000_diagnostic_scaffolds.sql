-- ════════════════════════════════════════════════════════════
-- MIGRATION: DIAGNOSTIC SCAFFOLDS
-- Migration ID: 20260729000000_diagnostic_scaffolds
--
-- Private draft workspace for building a diagnosis from the Command
-- Center UI, for either a client or a prospect candidate. evidence and
-- technical_signals are populated once by the scan engine
-- (functions/api/_scan.ts) and are immutable after that — regenerate to
-- refresh them, never hand-edit "measured" data. The 7 judgment fields
-- (friction_mechanism through confidence_and_why) start NULL and are the
-- only fields an admin can edit; nothing here is ever LLM-filled.
--
-- Deliberately separate from public.deliverables: a deliverables row is
-- live-readable by anyone holding that client's cid capability token the
-- moment it exists, with no "published" gate. Writing a scaffold straight
-- into it would risk exposing an unfinished diagnosis. Formalizing a
-- finished scaffold into a real deliverable stays a deliberate manual
-- step through the existing admin/dashboard delivery form
-- (buildDeliveryPayload / handlePublishDelivery) — not automated here.
--
-- loom_script is generated from the 7 judgment fields above (never from
-- anything else) by functions/api/scaffolds/generate-loom.ts, only once
-- they're filled in — an empty judgment set has no real findings to script
-- from. Human-revisable afterward, same as the judgment fields.
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.diagnostic_scaffolds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    prospect_candidate_id UUID REFERENCES public.prospect_candidates(id) ON DELETE CASCADE,
    target_url TEXT NOT NULL,
    domain TEXT NOT NULL,
    scanned_at TIMESTAMPTZ NOT NULL,
    evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    technical_signals JSONB,
    friction_mechanism TEXT,
    specific_friction_point TEXT,
    why_blocks_conversion TEXT,
    projected_impact TEXT,
    the_decision TEXT,
    what_to_avoid TEXT,
    confidence_and_why TEXT,
    loom_script TEXT,
    loom_script_generated_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pushed_to_deliverable')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT diagnostic_scaffolds_exactly_one_target CHECK (
        (client_id IS NOT NULL AND prospect_candidate_id IS NULL) OR
        (client_id IS NULL AND prospect_candidate_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_scaffolds_client ON public.diagnostic_scaffolds(client_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_scaffolds_candidate ON public.diagnostic_scaffolds(prospect_candidate_id);

-- No updated_at trigger — set explicitly by functions/api/scaffolds/[id].ts
-- on every PATCH. public.set_updated_at() was found live-broken for
-- prospect_candidates (see 20260728000000_prospect_candidates.sql); this
-- table avoids that failure mode entirely rather than repeating it.

ALTER TABLE public.diagnostic_scaffolds ENABLE ROW LEVEL SECURITY;

-- authenticated-only, matching this app's established pattern (public
-- self-signup is disabled at the Supabase Auth level; see
-- 20260711000000_close_anon_rls_gaps.sql). No anon policy of any kind —
-- unlike deliverables, this table is never meant to be readable by anyone
-- outside the admin session, at any point.
CREATE POLICY admin_all_diagnostic_scaffolds ON public.diagnostic_scaffolds
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
