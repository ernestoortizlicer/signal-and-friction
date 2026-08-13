-- TRAINING INTEGRITY — completion means reflection_complete, not verdict reveal.
--
-- Production reconciliation 2026-08-13:
-- finalize_and_reveal_attempt previously wrote completed_at at the same moment
-- the hidden verdict became visible. gate_track_a/v_training_attempt_scores use
-- completed_at as a gate condition, so an analyst could reveal and stop before
-- the mandatory Comparative Reflection yet still produce gate evidence.
--
-- The pedagogy defines reflection as a required stage. This migration makes
-- the database agree: reveal freezes/scorers/snapshots the preregistered
-- judgment, but ONLY the reflect application action may set completed_at and
-- move stage to reflection_complete.

CREATE OR REPLACE FUNCTION public.finalize_and_reveal_attempt(p_attempt_id uuid)
RETURNS TABLE(
  reference_disposition public.case_disposition,
  reference_mechanism text,
  disposition_correct boolean,
  mechanism_correct boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  a record;
  c record;
  prior_reveal boolean;
BEGIN
  SELECT * INTO a
  FROM public.training_attempts
  WHERE id = p_attempt_id
  FOR UPDATE;

  IF a.id IS NULL THEN
    RAISE EXCEPTION 'attempt not found';
  END IF;
  IF a.analyst_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'caller does not own this attempt';
  END IF;
  IF a.verdict_revealed_at IS NOT NULL THEN
    RAISE EXCEPTION 'attempt already finalized';
  END IF;

  IF a.observation IS NULL OR length(btrim(a.observation)) = 0
     OR a.evidence_notes IS NULL OR length(btrim(a.evidence_notes)) = 0
     OR a.hypothesis_mechanism IS NULL
     OR a.hypothesis_reasoning IS NULL OR length(btrim(a.hypothesis_reasoning)) = 0
     OR a.counter_hypothesis_mechanism IS NULL
     OR a.counter_hypothesis_reasoning IS NULL OR length(btrim(a.counter_hypothesis_reasoning)) = 0
     OR a.judgment_disposition IS NULL
     OR a.judgment_confidence IS NULL
     OR a.recommendation IS NULL OR length(btrim(a.recommendation)) = 0
     OR a.uncertainty_notes IS NULL OR length(btrim(a.uncertainty_notes)) = 0
  THEN
    RAISE EXCEPTION 'incomplete_preregistration: canonical reasoning payload incomplete';
  END IF;

  IF a.judgment_disposition IN ('behavioral_diagnosis','mixed_condition') THEN
    IF a.judgment_mechanism IS NULL THEN
      RAISE EXCEPTION 'incomplete_preregistration: judgment_mechanism required for % disposition', a.judgment_disposition;
    END IF;
  ELSE
    IF a.judgment_mechanism IS NOT NULL THEN
      RAISE EXCEPTION 'invalid_abstention: judgment_mechanism must be NULL for % disposition', a.judgment_disposition;
    END IF;
  END IF;

  SELECT
    tc.reference_disposition AS disp,
    tc.reference_mechanism AS mech,
    COALESCE(d.derived_eligible, false) AS elig,
    tc.reference_source AS src
  INTO c
  FROM public.training_cases tc
  LEFT JOIN public.v_case_eligibility_derived d ON d.case_id = tc.id
  WHERE tc.id = a.case_id;

  SELECT EXISTS(
    SELECT 1
    FROM public.training_attempts x
    WHERE x.case_id = a.case_id
      AND x.analyst_id = a.analyst_id
      AND x.verdict_revealed_at IS NOT NULL
      AND x.id <> p_attempt_id
  ) INTO prior_reveal;

  UPDATE public.training_attempts
  SET
    ref_disposition_snapshot = c.disp,
    ref_mechanism_snapshot = c.mech,
    verdict_revealed_at = now(),
    -- Deliberately NOT completed_at: Comparative Reflection is mandatory.
    stage = 'verdict_revealed',
    disposition_correct = (a.judgment_disposition = c.disp),
    mechanism_correct = CASE
      WHEN c.disp IN ('behavioral_diagnosis','mixed_condition')
        THEN (a.judgment_mechanism IS NOT DISTINCT FROM c.mech)
      ELSE (a.judgment_mechanism IS NULL)
    END,
    is_gate_eligible = (c.elig AND c.src = 'independent_hidden' AND NOT prior_reveal)
  WHERE id = p_attempt_id;

  RETURN QUERY
  SELECT
    c.disp,
    c.mech,
    (SELECT ta.disposition_correct FROM public.training_attempts ta WHERE ta.id = p_attempt_id),
    (SELECT ta.mechanism_correct FROM public.training_attempts ta WHERE ta.id = p_attempt_id);
END
$function$;

REVOKE ALL ON FUNCTION public.finalize_and_reveal_attempt(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.finalize_and_reveal_attempt(uuid) TO authenticated;
