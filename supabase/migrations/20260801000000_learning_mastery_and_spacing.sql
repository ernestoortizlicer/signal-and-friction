-- ════════════════════════════════════════════════════════════
-- MIGRATION: Diagnostic-craft training — mastery + spaced repetition
-- Migration ID: 20260801000000_learning_mastery_and_spacing
--
-- Extends hyper_leap_sessions (from 20260730000000_hyper_leap_sessions.sql,
-- still not deployed as of this migration — this one is written to apply
-- cleanly whether that migration has already run or is being applied in
-- the same batch, via IF NOT EXISTS / ADD COLUMN IF NOT EXISTS throughout)
-- for the real four-skill rubric approved 2026-08-01: mechanism isolation,
-- evidence-tier discipline, the specificity test, confidence calibration.
--
-- Two new pieces:
--   1. mechanism_mastery — a VIEW, not a table. Per-mechanism accuracy is
--      100% derivable from hyper_leap_sessions rows that already exist;
--      storing it separately would let it drift from real session history
--      the moment a table update was missed. A view can't drift — it's
--      recomputed from the source of truth every time it's read. Scoped to
--      an all-time aggregate for now, not a recency-windowed one — with a
--      handful of real cases and early session volume, a windowed
--      aggregate would add real complexity (ROW_NUMBER/PARTITION) for no
--      evidenced benefit yet. Revisit if session volume grows enough that
--      "all-time" stops reflecting current skill.
--   2. practice_queue — real scheduling state for spaced, interleaved
--      practice (contextual interference effect / spaced retrieval
--      research — see the approved curriculum doc). Deliberately does NOT
--      duplicate case_key -> mechanism mapping here: that mapping lives in
--      each deliverable's own groundTruthMechanism field
--      (src/app/deliverable/fallback.ts), read at runtime by the frontend.
--      Duplicating it into this table would create a second copy that
--      could silently disagree with the first.
-- ════════════════════════════════════════════════════════════


-- ── 1. Extend hyper_leap_sessions with the real rubric ──

ALTER TABLE public.hyper_leap_sessions
    ADD COLUMN IF NOT EXISTS ground_truth_mechanism TEXT CHECK (ground_truth_mechanism IN (
        'cognitive_load', 'trust_deficit', 'commitment_anxiety',
        'ordering_error', 'identity_friction', 'value_uncertainty'
    )),
    ADD COLUMN IF NOT EXISTS mechanism_claimed TEXT CHECK (mechanism_claimed IN (
        'cognitive_load', 'trust_deficit', 'commitment_anxiety',
        'ordering_error', 'identity_friction', 'value_uncertainty'
    )),
    ADD COLUMN IF NOT EXISTS mechanism_correct BOOLEAN,
    -- {evidence_tier_violations: string[], specificity_pass: boolean,
    --  confidence_calibrated: boolean} — see the edge function for the
    -- exact shape. jsonb rather than three more columns because this is
    -- the one part of the rubric most likely to gain a dimension later
    -- (e.g. a fifth Pareto skill); the two boolean/enum columns above are
    -- the ones the mastery view and practice_queue scheduling actually
    -- need to query directly, so those stay as real typed columns.
    ADD COLUMN IF NOT EXISTS rubric_scores JSONB;


-- ── 2. mechanism_mastery — computed, never stored ──

CREATE OR REPLACE VIEW public.mechanism_mastery AS
SELECT
    ground_truth_mechanism AS mechanism,
    COUNT(*) AS attempts,
    COUNT(*) FILTER (WHERE mechanism_correct) AS correct,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE mechanism_correct) / NULLIF(COUNT(*), 0),
        1
    ) AS accuracy_pct,
    MAX(created_at) AS last_attempted_at
FROM public.hyper_leap_sessions
WHERE ground_truth_mechanism IS NOT NULL
GROUP BY ground_truth_mechanism;

-- Views inherit the querying role's RLS on the underlying table
-- automatically in Postgres — no separate policy needed or possible here.
-- hyper_leap_sessions' own admin_all_* policy (from the original
-- migration) already restricts this to authenticated.


-- ── 3. practice_queue — spaced, interleaved scheduling state ──

CREATE TABLE IF NOT EXISTS public.practice_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_key TEXT NOT NULL UNIQUE, -- matches hyper_leap_sessions.challenge_id and each deliverable's clientKey
    stage TEXT NOT NULL DEFAULT 'guided' CHECK (stage IN ('guided', 'independent')),
    consecutive_correct INT NOT NULL DEFAULT 0,
    next_eligible_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_attempted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_practice_queue_eligible ON public.practice_queue(next_eligible_at);

ALTER TABLE public.practice_queue ENABLE ROW LEVEL SECURITY;

-- Same "authenticated = admin" pattern used everywhere else in this
-- schema, including hyper_leap_sessions itself.
CREATE POLICY admin_all_practice_queue ON public.practice_queue
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
