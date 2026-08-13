-- PAYMENT -> CLIENT -> SCAFFOLD PROVISIONING TRUTH
-- 2026-08-13
--
-- Invariants:
-- 1. clients.target_url is the canonical client-backed scan target.
-- 2. Public intake may establish that target, but duplicate scaffold identity is impossible.
-- 3. A canonical payment linked to a client atomically emits one durable provisioning job.
-- 4. Background execution is an optimization; the durable DB job is the source of recovery truth.
-- 5. External scan failure never rolls back or fakes payment success.
-- 6. One client owns at most one client-backed diagnostic scaffold; rescans update it.

-- Backfill target_url only where existing scaffold evidence is unambiguous.
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

-- The UI and rescan flow already model one mutable workspace per client.
-- Make duplicate client-backed workspaces impossible at the database layer.
CREATE UNIQUE INDEX IF NOT EXISTS diagnostic_scaffolds_one_per_client_idx
  ON public.diagnostic_scaffolds(client_id)
  WHERE client_id IS NOT NULL;

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

-- Atomic claim prevents concurrent Stripe retries/background tasks from
-- scanning the same target simultaneously. needs_input is only claimable
-- through an explicit operator retry after the missing input is corrected.
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
      OR (p_allow_needs_input AND j.status = 'needs_input')
    )
  RETURNING j.*;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.scaffold_provisioning_jobs IS
  'Durable outbox for payment-triggered client scaffold provisioning. Payment truth is committed first; external scan work is asynchronous/recoverable.';
COMMENT ON FUNCTION public.claim_scaffold_provisioning_job(UUID, BOOLEAN) IS
  'Atomically claims one pending/retryable provisioning job. needs_input requires explicit operator retry.';
