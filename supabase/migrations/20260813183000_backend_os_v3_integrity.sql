-- Backend Operating System v3 — integrity + action reconciliation
-- 2026-08-13
--
-- Goals:
-- 1) A Training session cannot become completed without a real start, elapsed time,
--    outcome evidence, and type-specific proof.
-- 2) Priorities is a derived action projection, not an independent source of truth.
--    It can be reconstructed idempotently from current commercial/system state.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- TRAINING TRUTH
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.learning_sessions
  ADD COLUMN IF NOT EXISTS actual_seconds integer;

ALTER TABLE public.learning_sessions
  DROP CONSTRAINT IF EXISTS learning_sessions_actual_seconds_check;
ALTER TABLE public.learning_sessions
  ADD CONSTRAINT learning_sessions_actual_seconds_check
  CHECK (actual_seconds IS NULL OR actual_seconds > 0);

-- Completed means validated evidence-bearing execution, not a button click.
ALTER TABLE public.learning_sessions
  DROP CONSTRAINT IF EXISTS learning_sessions_completed_truth_check;
ALTER TABLE public.learning_sessions
  ADD CONSTRAINT learning_sessions_completed_truth_check
  CHECK (
    status <> 'completed'
    OR (
      started_at IS NOT NULL
      AND completed_at IS NOT NULL
      AND actual_minutes IS NOT NULL
      AND actual_minutes > 0
      AND actual_seconds IS NOT NULL
      AND actual_seconds > 0
      AND NULLIF(btrim(outcome), '') IS NOT NULL
      AND (
        session_type <> 'active_recall'
        OR retrieval_score IS NOT NULL
      )
      AND (
        session_type <> 'build_application'
        OR NULLIF(btrim(evidence_ref), '') IS NOT NULL
      )
      AND (
        session_type <> 'diagnostic_case'
        OR linked_attempt_id IS NOT NULL
        OR NULLIF(btrim(evidence_ref), '') IS NOT NULL
      )
    )
  ) NOT VALID;

-- Validate only after invalid historical rows have been remediated explicitly.
-- Production's known false-positive 2026-08-13 row was reset to planned before
-- this migration was authored. Keeping validation separate makes drift visible
-- rather than silently rewriting unknown historical evidence.
ALTER TABLE public.learning_sessions
  VALIDATE CONSTRAINT learning_sessions_completed_truth_check;

CREATE OR REPLACE VIEW public.v_learning_session_performance
WITH (security_invoker = true)
AS
SELECT
  id,
  analyst_id,
  session_date,
  session_type,
  plan_key,
  planned_minutes,
  actual_minutes,
  actual_seconds,
  retrieval_score,
  status,
  started_at,
  completed_at,
  CASE
    WHEN status = 'completed' AND actual_seconds > 0 AND planned_minutes > 0
      THEN round(((planned_minutes * 60.0) / actual_seconds)::numeric, 3)
    ELSE NULL
  END AS pace_vs_plan,
  CASE
    WHEN status = 'completed' AND started_at IS NOT NULL AND completed_at IS NOT NULL
      THEN extract(epoch FROM (completed_at - started_at))::integer
    ELSE NULL
  END AS wall_clock_seconds
FROM public.learning_sessions;

REVOKE ALL ON public.v_learning_session_performance FROM PUBLIC, anon;
GRANT SELECT ON public.v_learning_session_performance TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- PRIORITIES AS A DERIVED ACTION PROJECTION
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.ensure_project_priority_task(
  p_project_id uuid,
  p_replace boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_project record;
  v_existing uuid;
  v_new_id uuid;
  v_title text;
  v_effort integer := 30;
  v_energy text := 'shallow';
  v_deadline timestamptz;
  v_revenue bigint := 0;
  v_learning integer := 3;
BEGIN
  IF COALESCE(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role required';
  END IF;

  SELECT bp.*, c.company_name
    INTO v_project
  FROM public.beta_projects bp
  JOIN public.clients c ON c.id = bp.client_id
  WHERE bp.id = p_project_id;

  IF v_project.id IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_project.status IN ('closed_completed', 'closed_lost') THEN
    UPDATE public.priority_tasks
       SET status = 'eliminated', updated_at = now()
     WHERE source_table = 'beta_projects'
       AND source_id = p_project_id
       AND auto_generated = true
       AND status IN ('pending', 'in_progress');
    RETURN NULL;
  END IF;

  SELECT id INTO v_existing
  FROM public.priority_tasks
  WHERE source_table = 'beta_projects'
    AND source_id = p_project_id
    AND auto_generated = true
    AND status IN ('pending', 'in_progress')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing IS NOT NULL AND NOT p_replace THEN
    RETURN v_existing;
  END IF;

  IF p_replace THEN
    UPDATE public.priority_tasks
       SET status = 'eliminated', updated_at = now()
     WHERE source_table = 'beta_projects'
       AND source_id = p_project_id
       AND auto_generated = true
       AND status IN ('pending', 'in_progress');
  END IF;

  -- Prefer the value recorded on the project. This removes the previous
  -- unconditional $350 assumption. A later commercial-contract migration can
  -- replace this legacy field with a canonical offer identifier without
  -- changing the priority projection boundary.
  IF v_project.symbolic_price_charged IS NOT NULL AND v_project.symbolic_price_charged > 0 THEN
    v_revenue := round(v_project.symbolic_price_charged * 100)::bigint;
  END IF;

  CASE v_project.status
    WHEN 'prospecting' THEN
      v_title := 'Send outreach to ' || v_project.company_name;
      v_effort := 20; v_energy := 'creative'; v_deadline := now() + interval '2 days'; v_learning := 4;
    WHEN 'outreach_sent' THEN
      v_title := 'Follow up with ' || v_project.company_name;
      v_effort := 15; v_energy := 'shallow'; v_deadline := now() + interval '3 days'; v_learning := 2;
    WHEN 'followup_sent' THEN
      v_title := 'Check response from ' || v_project.company_name;
      v_effort := 10; v_energy := 'admin'; v_deadline := now() + interval '5 days'; v_learning := 2;
    WHEN 'diagnostic_in_progress' THEN
      v_title := 'Complete diagnostic for ' || v_project.company_name;
      v_effort := 120; v_energy := 'deep'; v_deadline := now() + interval '3 days'; v_learning := 7;
    WHEN 'delivered' THEN
      v_title := 'Request testimonial from ' || v_project.company_name;
      v_effort := 15; v_energy := 'shallow'; v_deadline := now() + interval '7 days'; v_learning := 3;
    WHEN 'awaiting_testimonial' THEN
      v_title := 'Follow up for testimonial from ' || v_project.company_name;
      v_effort := 10; v_energy := 'admin'; v_deadline := now() + interval '5 days'; v_learning := 2;
    ELSE
      RETURN NULL;
  END CASE;

  INSERT INTO public.priority_tasks (
    title,
    description,
    category,
    effort_minutes,
    energy_required,
    deadline,
    revenue_impact,
    learning_multiplier,
    source_table,
    source_id,
    auto_generated,
    status
  ) VALUES (
    v_title,
    'Derived from current beta_projects state: ' || v_project.status,
    'beta_project',
    v_effort,
    v_energy,
    v_deadline,
    v_revenue,
    v_learning,
    'beta_projects',
    p_project_id,
    true,
    'pending'
  ) RETURNING id INTO v_new_id;

  PERFORM public.calculate_priority_score(v_new_id);
  RETURN v_new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_beta_project_to_priority_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM public.ensure_project_priority_task(NEW.id, true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_beta_project_priorities ON public.beta_projects;
CREATE TRIGGER trigger_sync_beta_project_priorities
AFTER INSERT OR UPDATE OF status, symbolic_price_charged, payment_status, current_phase
ON public.beta_projects
FOR EACH ROW EXECUTE FUNCTION public.sync_beta_project_to_priority_tasks();

CREATE OR REPLACE FUNCTION public.ensure_incident_priority_task(
  p_incident_id uuid,
  p_replace boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_incident record;
  v_existing uuid;
  v_new_id uuid;
BEGIN
  IF COALESCE(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role required';
  END IF;

  SELECT * INTO v_incident
  FROM public.ai_incidents
  WHERE id = p_incident_id;

  IF v_incident.id IS NULL THEN RETURN NULL; END IF;

  IF v_incident.resolved_at IS NOT NULL OR v_incident.severity NOT IN ('high', 'critical') THEN
    UPDATE public.priority_tasks
       SET status = 'done', completed_at = COALESCE(completed_at, now()), updated_at = now()
     WHERE source_table = 'ai_incidents'
       AND source_id = p_incident_id
       AND auto_generated = true
       AND status IN ('pending', 'in_progress');
    RETURN NULL;
  END IF;

  SELECT id INTO v_existing
  FROM public.priority_tasks
  WHERE source_table = 'ai_incidents'
    AND source_id = p_incident_id
    AND auto_generated = true
    AND status IN ('pending', 'in_progress')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing IS NOT NULL AND NOT p_replace THEN
    RETURN v_existing;
  END IF;

  IF p_replace THEN
    UPDATE public.priority_tasks
       SET status = 'eliminated', updated_at = now()
     WHERE source_table = 'ai_incidents'
       AND source_id = p_incident_id
       AND auto_generated = true
       AND status IN ('pending', 'in_progress');
  END IF;

  INSERT INTO public.priority_tasks (
    title, description, category, effort_minutes, energy_required,
    deadline, revenue_impact, learning_multiplier,
    source_table, source_id, auto_generated, status
  ) VALUES (
    '[' || upper(v_incident.severity) || '] Resolve ' || replace(v_incident.incident_type, '_', ' ') || ' in ' || v_incident.phase,
    'Derived from unresolved AI/system incident: ' || left(v_incident.description, 200),
    'incident',
    45,
    'analytical',
    now() + CASE WHEN v_incident.severity = 'critical' THEN interval '4 hours' ELSE interval '24 hours' END,
    CASE WHEN v_incident.severity = 'critical' THEN 105000 ELSE 35000 END,
    8,
    'ai_incidents',
    p_incident_id,
    true,
    'pending'
  ) RETURNING id INTO v_new_id;

  PERFORM public.calculate_priority_score(v_new_id);
  RETURN v_new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_incident_to_priority_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM public.ensure_incident_priority_task(NEW.id, true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_incident_priorities ON public.ai_incidents;
CREATE TRIGGER trigger_sync_incident_priorities
AFTER INSERT OR UPDATE OF severity, resolved_at
ON public.ai_incidents
FOR EACH ROW EXECUTE FUNCTION public.sync_incident_to_priority_tasks();

CREATE OR REPLACE FUNCTION public.reconcile_priority_tasks()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_id uuid;
  v_projects integer := 0;
  v_incidents integer := 0;
BEGIN
  IF COALESCE(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role required';
  END IF;

  FOR v_id IN
    SELECT id FROM public.beta_projects
    WHERE status NOT IN ('closed_completed', 'closed_lost')
  LOOP
    IF public.ensure_project_priority_task(v_id, false) IS NOT NULL THEN
      v_projects := v_projects + 1;
    END IF;
  END LOOP;

  FOR v_id IN
    SELECT id FROM public.ai_incidents
    WHERE resolved_at IS NULL AND severity IN ('high', 'critical')
  LOOP
    IF public.ensure_incident_priority_task(v_id, false) IS NOT NULL THEN
      v_incidents := v_incidents + 1;
    END IF;
  END LOOP;

  PERFORM public.recalculate_all_priorities();

  RETURN jsonb_build_object(
    'project_actions_present', v_projects,
    'incident_actions_present', v_incidents,
    'active_actions', (
      SELECT count(*) FROM public.priority_tasks WHERE status IN ('pending', 'in_progress')
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_project_priority_task(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_incident_priority_task(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reconcile_priority_tasks() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_project_priority_task(uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_incident_priority_task(uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_priority_tasks() TO service_role;

COMMIT;
