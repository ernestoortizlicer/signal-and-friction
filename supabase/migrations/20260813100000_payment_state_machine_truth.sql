-- PAYMENT STATE MACHINE TRUTH
-- 2026-08-13
--
-- Invariants:
-- 1. A client is never "payment_confirmed" before an authoritative payment row exists.
-- 2. Inserting the first canonical payment for a client atomically advances client/project payment state.
-- 3. A payment-linked client must have exactly one beta_project; otherwise the payment insert fails and Stripe can retry.
-- 4. Payment cannot regress a client that is already beyond payment_confirmed.
-- 5. The payments table / Stripe webhook owns payment truth. A manual beta_projects.payment_status update must not create revenue.

-- The old protocol model started every client at payment_confirmed, which made
-- pre-payment intake indistinguishable from a paid customer. Introduce an
-- explicit pre-payment state and make it the default for new clients.
ALTER TABLE public.clients
  ALTER COLUMN protocol_stage DROP DEFAULT;

ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_protocol_stage_check;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_protocol_stage_check
  CHECK (protocol_stage IN (
    'pre_payment',
    'payment_confirmed',
    'heuristics_in_progress',
    'sneak_peek_delivered',
    'final_diagnostic_ready'
  ));

ALTER TABLE public.clients
  ALTER COLUMN protocol_stage SET DEFAULT 'pre_payment';

-- Correct only states contradicted by production payment evidence. Do not
-- regress clients that have any canonical payment row.
UPDATE public.clients c
SET protocol_stage = 'pre_payment'
WHERE c.protocol_stage = 'payment_confirmed'
  AND NOT EXISTS (
    SELECT 1
    FROM public.payments p
    WHERE p.client_id = c.id
  );

-- Retire the legacy "payment_status = paid means money happened" finance
-- trigger. payment_status is a derived workflow state, not authoritative
-- financial evidence. The Stripe payment handler remains the sole runtime
-- owner of ledger posting for canonical Checkout payments.
DROP TRIGGER IF EXISTS trigger_project_payment_paid ON public.beta_projects;

COMMENT ON FUNCTION public.handle_project_payment_paid() IS
  'RETIRED 2026-08-13: payment_status is derived state; canonical payment events own financial reconciliation.';

CREATE OR REPLACE FUNCTION public.handle_payment_state_truth()
RETURNS TRIGGER AS $$
DECLARE
  v_project_count integer;
BEGIN
  -- An unmatched economic event is still retained in payments for recovery.
  -- It cannot advance client/project state until client_id is reconciled.
  IF NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Monotonic client lifecycle: payment may advance pre_payment, but must
  -- never regress a client already in a later delivery stage.
  UPDATE public.clients
  SET protocol_stage = CASE
        WHEN protocol_stage = 'pre_payment' THEN 'payment_confirmed'
        ELSE protocol_stage
      END,
      updated_at = now()
  WHERE id = NEW.client_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment references missing client %', NEW.client_id
      USING ERRCODE = '23503';
  END IF;

  -- One client has one beta_project by schema contract. Payment is the
  -- authoritative transition into paid diagnostic work. Later project
  -- states are preserved so a subsequent purchase cannot regress delivery.
  UPDATE public.beta_projects
  SET payment_status = 'paid',
      status = CASE
        WHEN status IN ('prospecting', 'outreach_sent', 'followup_sent')
          THEN 'diagnostic_in_progress'
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

DROP TRIGGER IF EXISTS trigger_payment_state_truth ON public.payments;
CREATE TRIGGER trigger_payment_state_truth
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_payment_state_truth();

COMMENT ON FUNCTION public.handle_payment_state_truth() IS
  'Canonical payment insert atomically advances non-regressive client/project payment state; missing project fails closed for retry.';