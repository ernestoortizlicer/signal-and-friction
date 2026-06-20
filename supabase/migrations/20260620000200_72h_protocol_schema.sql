-- ════════════════════════════════════════════════════════════
-- MIGRATION: 72-Hour Zero Friction Protocol — State Machine
-- Migration ID: 20260620000200_72h_protocol_schema
--
-- Adds the asynchronous delivery lifecycle fields to public.clients
-- and creates the protocol_executions audit table for Make webhooks.
-- No existing columns are modified. All additions are additive.
-- ════════════════════════════════════════════════════════════

-- ── 1. EXTEND public.clients WITH PROTOCOL FIELDS ──────────

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS protocol_stage TEXT
    DEFAULT 'payment_confirmed'
    CHECK (protocol_stage IN (
      'payment_confirmed',
      'heuristics_in_progress',
      'sneak_peek_delivered',
      'final_diagnostic_ready'
    )),
  ADD COLUMN IF NOT EXISTS target_url TEXT,
  ADD COLUMN IF NOT EXISTS metadata_log JSONB DEFAULT '{}'::jsonb;

-- Fast lookup by lifecycle stage (Make polls this to build dashboards)
CREATE INDEX IF NOT EXISTS idx_clients_protocol_stage
  ON public.clients (protocol_stage);

-- Fast lookup by email (Make patches records via email key)
CREATE INDEX IF NOT EXISTS idx_clients_contact_email
  ON public.clients (contact_email);


-- ── 2. PROTOCOL EXECUTIONS AUDIT TABLE ─────────────────────
-- Immutable event log. One row per Make scenario execution.
-- Source of truth for debugging, refunds, and SLA audits.

CREATE TABLE IF NOT EXISTS public.protocol_executions (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID          REFERENCES public.clients(id) ON DELETE SET NULL,
  stripe_session_id   TEXT          NOT NULL,
  customer_email      TEXT          NOT NULL,
  price_id            TEXT          NOT NULL,
  amount_total        INT           NOT NULL,             -- cents
  target_url          TEXT,
  execution_stage     TEXT          NOT NULL
    CHECK (execution_stage IN (
      'minute_1_email',
      'hour_12_dashboard',
      'hour_36_sneak_peek'
    )),
  make_scenario_id    TEXT,                               -- Make execution ID for traceability
  http_status         INT,                                -- HTTP response from Supabase REST PATCH
  payload_sent        JSONB         DEFAULT '{}'::jsonb,  -- Exact payload Make sent
  response_received   JSONB         DEFAULT '{}'::jsonb,  -- Exact response Supabase returned
  error_message       TEXT,
  executed_at         TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Lookup by session (refund flow needs this)
CREATE INDEX IF NOT EXISTS idx_protocol_executions_session
  ON public.protocol_executions (stripe_session_id);

-- Lookup by email (client support flow)
CREATE INDEX IF NOT EXISTS idx_protocol_executions_email
  ON public.protocol_executions (customer_email);

-- Lookup by stage (monitoring dashboard)
CREATE INDEX IF NOT EXISTS idx_protocol_executions_stage
  ON public.protocol_executions (execution_stage);


-- ── 3. ROW LEVEL SECURITY ───────────────────────────────────

ALTER TABLE public.protocol_executions ENABLE ROW LEVEL SECURITY;

-- Service role (Make webhook PATCH calls) has full access
CREATE POLICY "Allow all service_role" ON public.protocol_executions
  FOR ALL TO service_role USING (true);

-- Authenticated admins can read (Command Center monitoring)
CREATE POLICY "Allow select authenticated" ON public.protocol_executions
  FOR SELECT TO authenticated USING (true);

-- Anon can read (admin dashboard uses anon key as fallback)
CREATE POLICY "Allow select anon" ON public.protocol_executions
  FOR SELECT TO anon USING (true);


-- ── 4. TRIGGER: AUTO-LOG PROTOCOL STAGE CHANGES ON clients ─

CREATE OR REPLACE FUNCTION public.handle_protocol_stage_updated()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.protocol_stage IS DISTINCT FROM NEW.protocol_stage THEN
    INSERT INTO public.activity_log (client_id, action, details)
    VALUES (
      NEW.id,
      'PROTOCOL_STAGE_CHANGE',
      jsonb_build_object(
        'from_stage', OLD.protocol_stage,
        'to_stage',   NEW.protocol_stage,
        'target_url', NEW.target_url
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_protocol_stage_updated
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_protocol_stage_updated();
