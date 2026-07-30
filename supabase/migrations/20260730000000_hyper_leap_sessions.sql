-- ════════════════════════════════════════════════════════════
-- MIGRATION: Hyper-Leap Socratic training sessions
-- Migration ID: 20260730000000_hyper_leap_sessions
--
-- Backs the real Socratic-method training flow in the admin Learning
-- module (case study → hypothesis → AI follow-up question → response →
-- real AI-assessed verdict). Replaces the previous "Absorb Concepts"
-- button, which incremented a fixed +3 / fixed domain scores regardless
-- of what the learner actually wrote — this table stores the real
-- dialogue and a real, model-assessed score, so "Concepts Mastered" and
-- the skill radar can be computed from genuine session history instead
-- of a flat button press.
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.hyper_leap_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id TEXT NOT NULL,
    challenge_title TEXT NOT NULL,
    hypothesis TEXT NOT NULL,
    selected_mechanisms TEXT[] NOT NULL DEFAULT '{}',
    followup_question TEXT NOT NULL,
    followup_response TEXT NOT NULL,
    score INT NOT NULL CHECK (score BETWEEN 0 AND 100),
    feedback TEXT NOT NULL,
    -- Exact subset of that case study's real concept titles the AI
    -- assessed the learner as having genuinely demonstrated — never an
    -- invented concept name, validated against the real list client-side
    -- before this row is written.
    concepts_demonstrated TEXT[] NOT NULL DEFAULT '{}',
    model TEXT,
    tier TEXT,
    estimated_cost_usd NUMERIC(10, 6),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hyper_leap_sessions_created ON public.hyper_leap_sessions(created_at DESC);

ALTER TABLE public.hyper_leap_sessions ENABLE ROW LEVEL SECURITY;

-- Same "authenticated = admin" pattern used everywhere else in this
-- schema (self-signup disabled at the Supabase Auth level).
CREATE POLICY admin_all_hyper_leap_sessions ON public.hyper_leap_sessions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
