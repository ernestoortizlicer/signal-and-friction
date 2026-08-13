-- TRAINING INTEGRITY — freeze the COMPLETE preregistered reasoning trail.
--
-- The prior live trigger protected most fields but omitted socratic_exchanges
-- and revision. Those are part of the mandatory pre-verdict reasoning trail
-- and must not be alterable after the answer key is visible.

CREATE OR REPLACE FUNCTION public.training_attempt_freeze()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $fn$
BEGIN
  IF OLD.verdict_revealed_at IS NOT NULL AND (
       NEW.case_id                      IS DISTINCT FROM OLD.case_id
    OR NEW.analyst_id                   IS DISTINCT FROM OLD.analyst_id
    OR NEW.observation                  IS DISTINCT FROM OLD.observation
    OR NEW.evidence_notes               IS DISTINCT FROM OLD.evidence_notes
    OR NEW.hypothesis_mechanism         IS DISTINCT FROM OLD.hypothesis_mechanism
    OR NEW.hypothesis_reasoning         IS DISTINCT FROM OLD.hypothesis_reasoning
    OR NEW.counter_hypothesis_mechanism IS DISTINCT FROM OLD.counter_hypothesis_mechanism
    OR NEW.counter_hypothesis_reasoning IS DISTINCT FROM OLD.counter_hypothesis_reasoning
    OR NEW.socratic_exchanges           IS DISTINCT FROM OLD.socratic_exchanges
    OR NEW.revision                     IS DISTINCT FROM OLD.revision
    OR NEW.judgment_mechanism           IS DISTINCT FROM OLD.judgment_mechanism
    OR NEW.judgment_disposition         IS DISTINCT FROM OLD.judgment_disposition
    OR NEW.judgment_confidence          IS DISTINCT FROM OLD.judgment_confidence
    OR NEW.recommendation               IS DISTINCT FROM OLD.recommendation
    OR NEW.uncertainty_notes            IS DISTINCT FROM OLD.uncertainty_notes
    OR NEW.verdict_revealed_at          IS DISTINCT FROM OLD.verdict_revealed_at
  ) THEN
    RAISE EXCEPTION
      'training_attempts %: preregistered reasoning is immutable once verdict_revealed_at is set', OLD.id
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_a_training_attempt_freeze ON public.training_attempts;
CREATE TRIGGER trg_a_training_attempt_freeze
BEFORE UPDATE ON public.training_attempts
FOR EACH ROW EXECUTE FUNCTION public.training_attempt_freeze();
