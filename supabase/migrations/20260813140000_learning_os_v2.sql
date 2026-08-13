-- ═════════════════════════════════════════════════════════════════════════════
-- LEARNING OS v2 — deliberate practice + external-course operating system
-- Migration ID: 20260813140000_learning_os_v2
--
-- Course consumption is NOT certification evidence. The purpose of this layer is
-- discipline, planning, retrieval practice and application. Premium readiness
-- remains exclusively in the hardened Diagnostic Calibration contract.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.learning_daily_settings (
  analyst_id uuid PRIMARY KEY,
  course_study_target_min integer NOT NULL DEFAULT 45 CHECK (course_study_target_min BETWEEN 0 AND 480),
  diagnostic_practice_target_min integer NOT NULL DEFAULT 30 CHECK (diagnostic_practice_target_min BETWEEN 0 AND 240),
  active_recall_target_min integer NOT NULL DEFAULT 15 CHECK (active_recall_target_min BETWEEN 0 AND 120),
  build_application_target_min integer NOT NULL DEFAULT 30 CHECK (build_application_target_min BETWEEN 0 AND 240),
  timezone text NOT NULL DEFAULT 'Europe/Madrid',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.learning_daily_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.learning_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analyst_id uuid NOT NULL,
  provider text NOT NULL,
  title text NOT NULL,
  source_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('planned','active','paused','completed','archived')),
  priority integer NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  estimated_total_minutes integer CHECK (estimated_total_minutes IS NULL OR estimated_total_minutes > 0),
  notes text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.learning_resources ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_learning_resources_owner_status
  ON public.learning_resources(analyst_id, status, priority DESC, created_at);

CREATE TABLE IF NOT EXISTS public.learning_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analyst_id uuid NOT NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  session_type text NOT NULL CHECK (session_type IN (
    'course_study','diagnostic_case','active_recall','build_application','review'
  )),
  plan_key text,
  resource_id uuid REFERENCES public.learning_resources(id) ON DELETE SET NULL,
  linked_attempt_id uuid REFERENCES public.training_attempts(id) ON DELETE SET NULL,
  planned_minutes integer NOT NULL DEFAULT 0 CHECK (planned_minutes BETWEEN 0 AND 480),
  actual_minutes integer CHECK (actual_minutes IS NULL OR actual_minutes BETWEEN 0 AND 720),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','skipped')),
  outcome text,
  evidence_ref text,
  retrieval_score integer CHECK (retrieval_score IS NULL OR retrieval_score BETWEEN 0 AND 100),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.learning_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_learning_sessions_owner_date
  ON public.learning_sessions(analyst_id, session_date DESC, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_learning_session_plan_key
  ON public.learning_sessions(analyst_id, session_date, plan_key)
  WHERE plan_key IS NOT NULL;

-- Direct authenticated access remains owner-scoped. The admin Cloudflare API
-- uses service_role only after server-side requireAdmin() validation.
DROP POLICY IF EXISTS learning_daily_settings_owner ON public.learning_daily_settings;
CREATE POLICY learning_daily_settings_owner ON public.learning_daily_settings
  FOR ALL TO authenticated
  USING (analyst_id = auth.uid()) WITH CHECK (analyst_id = auth.uid());

DROP POLICY IF EXISTS learning_resources_owner ON public.learning_resources;
CREATE POLICY learning_resources_owner ON public.learning_resources
  FOR ALL TO authenticated
  USING (analyst_id = auth.uid()) WITH CHECK (analyst_id = auth.uid());

DROP POLICY IF EXISTS learning_sessions_owner ON public.learning_sessions;
CREATE POLICY learning_sessions_owner ON public.learning_sessions
  FOR ALL TO authenticated
  USING (analyst_id = auth.uid()) WITH CHECK (analyst_id = auth.uid());

REVOKE ALL ON public.learning_daily_settings, public.learning_resources, public.learning_sessions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_daily_settings, public.learning_resources, public.learning_sessions TO authenticated;

-- Give every existing analyst an editable baseline. These are scheduling
-- defaults, not claims about an optimal universal study dose.
INSERT INTO public.learning_daily_settings (analyst_id)
SELECT id FROM auth.users
ON CONFLICT (analyst_id) DO NOTHING;

CREATE OR REPLACE VIEW public.v_learning_resource_progress
WITH (security_invoker = true) AS
SELECT r.id, r.analyst_id, r.provider, r.title, r.source_url, r.status, r.priority,
       r.estimated_total_minutes,
       COALESCE(sum(s.actual_minutes) FILTER (WHERE s.status='completed'), 0)::bigint AS completed_minutes,
       count(s.id) FILTER (WHERE s.status='completed')::bigint AS completed_sessions,
       max(s.completed_at) AS last_completed_at
FROM public.learning_resources r
LEFT JOIN public.learning_sessions s ON s.resource_id=r.id
GROUP BY r.id;
GRANT SELECT ON public.v_learning_resource_progress TO authenticated;
