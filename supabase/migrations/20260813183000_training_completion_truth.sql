-- Training completion truth — 2026-08-13
BEGIN;
ALTER TABLE public.learning_sessions ADD COLUMN IF NOT EXISTS actual_seconds integer;
ALTER TABLE public.learning_sessions DROP CONSTRAINT IF EXISTS learning_sessions_actual_seconds_check;
ALTER TABLE public.learning_sessions ADD CONSTRAINT learning_sessions_actual_seconds_check CHECK (actual_seconds IS NULL OR actual_seconds > 0);
ALTER TABLE public.learning_sessions DROP CONSTRAINT IF EXISTS learning_sessions_completed_truth_check;
ALTER TABLE public.learning_sessions ADD CONSTRAINT learning_sessions_completed_truth_check CHECK (
  status <> 'completed' OR (
    started_at IS NOT NULL AND completed_at IS NOT NULL
    AND actual_minutes IS NOT NULL AND actual_minutes > 0
    AND actual_seconds IS NOT NULL AND actual_seconds > 0
    AND NULLIF(btrim(outcome),'') IS NOT NULL
    AND (session_type <> 'active_recall' OR retrieval_score IS NOT NULL)
    AND (session_type <> 'build_application' OR NULLIF(btrim(evidence_ref),'') IS NOT NULL)
    AND (session_type <> 'diagnostic_case' OR linked_attempt_id IS NOT NULL)
  )
) NOT VALID;
ALTER TABLE public.learning_sessions VALIDATE CONSTRAINT learning_sessions_completed_truth_check;

-- Diagnostic Calibration is already its own canonical staged workflow. The
-- daily Training block therefore completes from a real reflected attempt, not
-- from a user-entered evidence string. This trigger connects the two canonical
-- modules without duplicating diagnostic truth into Learning state.
CREATE OR REPLACE FUNCTION public.link_completed_attempt_to_daily_training()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  session_id uuid;
  elapsed_seconds integer;
BEGIN
  IF NEW.stage <> 'reflection_complete' OR NEW.completed_at IS NULL THEN RETURN NEW; END IF;
  IF OLD.stage = 'reflection_complete' THEN RETURN NEW; END IF;

  SELECT ls.id
    INTO session_id
  FROM public.learning_sessions ls
  WHERE ls.analyst_id = NEW.analyst_id
    AND ls.session_type = 'diagnostic_case'
    AND ls.status = 'in_progress'
    AND ls.started_at IS NOT NULL
    AND ls.started_at <= NEW.completed_at
  ORDER BY ls.started_at DESC
  LIMIT 1;

  IF session_id IS NULL THEN RETURN NEW; END IF;

  SELECT greatest(1, floor(extract(epoch FROM (NEW.completed_at - ls.started_at)))::integer)
    INTO elapsed_seconds
  FROM public.learning_sessions ls
  WHERE ls.id = session_id;

  UPDATE public.learning_sessions
  SET status = 'completed',
      actual_seconds = elapsed_seconds,
      actual_minutes = greatest(1, round(elapsed_seconds / 60.0)::integer),
      linked_attempt_id = NEW.id,
      evidence_ref = 'training_attempt:' || NEW.id::text,
      outcome = 'Completed Diagnostic Calibration through comparative reflection.',
      completed_at = NEW.completed_at,
      updated_at = NEW.completed_at
  WHERE id = session_id AND status = 'in_progress';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_link_completed_attempt_to_daily_training ON public.training_attempts;
CREATE TRIGGER trigger_link_completed_attempt_to_daily_training
AFTER UPDATE OF stage, completed_at ON public.training_attempts
FOR EACH ROW EXECUTE FUNCTION public.link_completed_attempt_to_daily_training();
REVOKE ALL ON FUNCTION public.link_completed_attempt_to_daily_training() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE VIEW public.v_learning_session_performance WITH (security_invoker=true) AS
SELECT id,analyst_id,session_date,session_type,plan_key,planned_minutes,actual_minutes,actual_seconds,retrieval_score,status,started_at,completed_at,
CASE WHEN status='completed' AND actual_seconds>0 AND planned_minutes>0 THEN round(((planned_minutes*60.0)/actual_seconds)::numeric,3) ELSE NULL END AS pace_vs_plan,
CASE WHEN status='completed' AND started_at IS NOT NULL AND completed_at IS NOT NULL THEN extract(epoch FROM (completed_at-started_at))::integer ELSE NULL END AS wall_clock_seconds
FROM public.learning_sessions;
REVOKE ALL ON public.v_learning_session_performance FROM PUBLIC,anon;
GRANT SELECT ON public.v_learning_session_performance TO authenticated,service_role;
COMMIT;
