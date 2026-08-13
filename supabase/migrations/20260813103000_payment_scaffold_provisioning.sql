-- PAYMENT -> CLIENT -> SCAFFOLD PROVISIONING TRUTH
-- 2026-08-13
--
-- Invariants:
-- 1. clients.target_url is the canonical client-backed scan target.
-- 2. Public intake may establish that target, but duplicate scaffold identity is impossible.
-- 3. A canonical payment linked to a client atomically emits one durable provisioning job.
-- 4. Background execution is an optimization; the durable DB job is the source of recovery truth.
-- 5. External scan failure never rolls back or fakes payment success.
-- 6. Project delivery state says provisioning/awaiting_input until a real scaffold exists.
-- 7. Job completion + project transition are one DB transaction.
-- 8. Interrupted running jobs become reclaimable after a bounded lease.
-- 9. One client owns at most one client-backed diagnostic scaffold; rescans update it.

WITH canonical_scaffold_target AS (
  SELECT client_id, min(target_url) AS target_url
  FROM public.diagnostic_scaffolds
  WHERE client_id IS NOT NULL
    AND target_url IS NOT NULL
    AND btrim(target_url) <> ''
  GROUP BY client_id
  HAVING count(DISTINCT target_url) = 1
)
UPDATE public.clients c
SET target_url = s.target_url,
    updated_at = now()
FROM canonical_scaffold_target s
WHERE c.id = s.client_id
  AND (c.target_url IS NULL OR btrim(c.target_url) = '');

ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_target_url_http_check;
ALTER TABLE public.clients
  ADD CONSTRAINT clients_target_url_http_check
  CHECK (
    target_url IS NULL OR (
      target_url = btrim(target_url)
      AND target_url ~* '^https?://[^[:space:]]+$'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS diagnostic_scaffolds_one_per_client_idx
  ON public.diagnostic_scaffolds(client_id)
  WHERE client_id IS NOT NULL;

ALTER TABLE public.beta_projects
  DROP CONSTRAINT IF EXISTS beta_projects_status_check;
ALTER TABLE public.beta_projects
  ADD CONSTRAINT beta_projects_status_check
  CHECK (status IN (
    'prospecting',
    'outreach_sent',
    'followup_sent',
    'provisioning',
    'awaiting_input',
    'diagnostic_in_progress',
    'delivered',
    'awaiting_testimonial',
    'closed_completed',
    'closed_lost'
  ));

CREATE TABLE IF NOT EXISTS public.scaffold_provisioning_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL UNIQUE REFERENCES public.payments(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  scaffold_id UUID REFERENCES public.diagnostic_scaffolds(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'succeeded', 'needs_input', 'retryable')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scaffold_provisioning_jobs_status_idx
  ON public.scaffold_provisioning_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS scaffold_provisioning_jobs_client_idx
  ON public.scaffold_provisioning_jobs(client_id, created_at DESC);

ALTER TABLE public.scaffold_provisioning_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_read_scaffold_provisioning_jobs ON public.scaffold_provisioning_jobs;
CREATE POLICY admin_read_scaffold_provisioning_jobs
  ON public.scaffold_provisioning_jobs
  FOR SELECT TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.enqueue_scaffold_provisioning_job()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.client_id IS NOT DISTINCT FROM NEW.client_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.scaffold_provisioning_jobs(payment_id, client_id)
  VALUES (NEW.id, NEW.client_id)
  ON CONFLICT (payment_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enqueue_scaffold_provisioning_job ON public.payments;
CREATE TRIGGER trigger_enqueue_scaffold_provisioning_job
  AFTER INSERT OR UPDATE OF client_id ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_scaffold_provisioning_job();

-- Payment confirms money, not delivery readiness. The later scaffold executor
-- owns only the transition from provisioning/awaiting_input into real work.
CREATE OR REPLACE FUNCTION public.handle_payment_state_truth()
RETURNS TRIGGER AS $$
DECLARE
  v_project_count integer;
  v_target_url text;
BEGIN
  IF NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.client_id IS NOT DISTINCT FROM NEW.client_id THEN
    RETURN NEW;
  END IF;

  SELECT target_url INTO v_target_url
  FROM public.clients
  WHERE id = NEW.client_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment references missing client %', NEW.client_id
      USING ERRCODE = '23503';
  END IF;

  UPDATE public.clients
  SET protocol_stage = CASE
        WHEN protocol_stage = 'pre_payment' THEN 'payment_confirmed'
        ELSE protocol_stage
      END,
      updated_at = now()
  WHERE id = NEW.client_id;

  UPDATE public.beta_projects
  SET payment_status = 'paid',
      status = CASE
        WHEN status IN ('prospecting', 'outreach_sent', 'followup_sent') THEN
          CASE
            WHEN v_target_url IS NULL OR btrim(v_target_url) = '' THEN 'awaiting_input'
            ELSE 'provisioning'
          END
        ELSE status
      END,
      updated_at = now()
  WHERE client_id = NEW.client_id;

  GET DIAGNOSTICS v_project_count = ROW_COUNT;

  IF v_project_count <> 1 THEN
    RAISE EXCEPTION 'payment client % expected exactly one beta_project, found %', NEW.client_id, v_project_count
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Claim is a lease, not a permanent lock. A Worker can disappear after
-- claiming; a retry/operator may reclaim a running job after ten minutes.
CREATE OR REPLACE FUNCTION public.claim_scaffold_provisioning_job(
  p_payment_id UUID,
  p_allow_needs_input BOOLEAN DEFAULT false
)
RETURNS SETOF public.scaffold_provisioning_jobs AS $$
BEGIN
  RETURN QUERY
  UPDATE public.scaffold_provisioning_jobs j
  SET status = 'running',
      attempt_count = j.attempt_count + 1,
      started_at = now(),
      finished_at = NULL,
      last_error = NULL,
      updated_at = now()
  WHERE j.payment_id = p_payment_id
    AND (
      j.status IN ('pending', 'retryable')
      OR (j.status = 'running' AND j.started_at < now() - interval '10 minutes')
      OR (p_allow_needs_input AND j.status = 'needs_input')
    )
  RETURNING j.*;
END;
$$ LANGUAGE plpgsql;

-- Finishing a job and changing delivery state must never split. This RPC is
-- the only application-facing completion boundary for the provisioning job.
CREATE OR REPLACE FUNCTION public.finish_scaffold_provisioning_job(
  p_payment_id UUID,
  p_status TEXT,
  p_scaffold_id UUID DEFAULT NULL,
  p_last_error TEXT DEFAULT NULL
)
RETURNS public.scaffold_provisioning_jobs AS $$
DECLARE
  v_job public.scaffold_provisioning_jobs%ROWTYPE;
  v_project_exists boolean;
BEGIN
  IF p_status NOT IN ('succeeded', 'needs_input', 'retryable') THEN
    RAISE EXCEPTION 'invalid scaffold provisioning finish status %', p_status
      USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_job
  FROM public.scaffold_provisioning_jobs
  WHERE payment_id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'scaffold provisioning job missing for payment %', p_payment_id
      USING ERRCODE = '23503';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.beta_projects WHERE client_id = v_job.client_id
  ) INTO v_project_exists;
  IF NOT v_project_exists THEN
    RAISE EXCEPTION 'beta project missing for provisioning client %', v_job.client_id
      USING ERRCODE = '23503';
  END IF;

  IF p_status = 'succeeded' THEN
    IF p_scaffold_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.diagnostic_scaffolds
      WHERE id = p_scaffold_id AND client_id = v_job.client_id
    ) THEN
      RAISE EXCEPTION 'successful provisioning requires scaffold owned by client %', v_job.client_id
        USING ERRCODE = '23514';
    END IF;

    UPDATE public.beta_projects
    SET status = CASE
          WHEN status IN ('provisioning', 'awaiting_input') THEN 'diagnostic_in_progress'
          ELSE status
        END,
        updated_at = now()
    WHERE client_id = v_job.client_id;
  ELSIF p_status = 'needs_input' THEN
    UPDATE public.beta_projects
    SET status = CASE
          WHEN status = 'provisioning' THEN 'awaiting_input'
          ELSE status
        END,
        updated_at = now()
    WHERE client_id = v_job.client_id;
  END IF;

  UPDATE public.scaffold_provisioning_jobs
  SET status = p_status,
      scaffold_id = CASE WHEN p_status = 'succeeded' THEN p_scaffold_id ELSE scaffold_id END,
      last_error = CASE WHEN p_status = 'succeeded' THEN NULL ELSE left(p_last_error, 500) END,
      finished_at = now(),
      updated_at = now()
  WHERE payment_id = p_payment_id
  RETURNING * INTO v_job;

  RETURN v_job;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.scaffold_provisioning_jobs IS
  'Durable outbox for payment-triggered client scaffold provisioning. Payment truth is committed first; external scan work is asynchronous/recoverable.';
COMMENT ON FUNCTION public.claim_scaffold_provisioning_job(UUID, BOOLEAN) IS
  'Atomically claims pending/retryable work, explicitly reclaims needs_input, and leases stale running jobs after 10 minutes.';
COMMENT ON FUNCTION public.finish_scaffold_provisioning_job(UUID, TEXT, UUID, TEXT) IS
  'Atomically finishes provisioning and advances/blocks project delivery state without regressions.';
COMMENT ON FUNCTION public.handle_payment_state_truth() IS
  'Canonical payment advances payment truth while delivery remains provisioning/awaiting_input until a real scaffold is ready.';
