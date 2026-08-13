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
    AND (session_type <> 'diagnostic_case' OR linked_attempt_id IS NOT NULL OR NULLIF(btrim(evidence_ref),'') IS NOT NULL)
  )
) NOT VALID;
ALTER TABLE public.learning_sessions VALIDATE CONSTRAINT learning_sessions_completed_truth_check;
CREATE OR REPLACE VIEW public.v_learning_session_performance WITH (security_invoker=true) AS
SELECT id,analyst_id,session_date,session_type,plan_key,planned_minutes,actual_minutes,actual_seconds,retrieval_score,status,started_at,completed_at,
CASE WHEN status='completed' AND actual_seconds>0 AND planned_minutes>0 THEN round(((planned_minutes*60.0)/actual_seconds)::numeric,3) ELSE NULL END AS pace_vs_plan,
CASE WHEN status='completed' AND started_at IS NOT NULL AND completed_at IS NOT NULL THEN extract(epoch FROM (completed_at-started_at))::integer ELSE NULL END AS wall_clock_seconds
FROM public.learning_sessions;
REVOKE ALL ON public.v_learning_session_performance FROM PUBLIC,anon;
GRANT SELECT ON public.v_learning_session_performance TO authenticated,service_role;
COMMIT;
