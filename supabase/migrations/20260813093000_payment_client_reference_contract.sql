-- ════════════════════════════════════════════════════════════
-- PAYMENT → CLIENT REFERENTIAL TRUTH
-- 2026-08-13
--
-- Production truth discovered during Payment → Client → Scaffold baseline:
--   public.payments.lead_id has a real FK to public.leads(id), while the
--   Stripe handler was writing public.clients.id into that column.
--
-- That mismatch makes a valid payment from an already-known client fail the
-- payment insert with a foreign-key violation. Do not repurpose lead_id.
-- Preserve it as the legacy lead reference and add a canonical client_id.
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS client_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.payments'::regclass
      AND contype = 'f'
      AND conname = 'payments_client_id_fkey'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_client_id_fkey
      FOREIGN KEY (client_id)
      REFERENCES public.clients(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS payments_client_id_idx
  ON public.payments(client_id);

COMMENT ON COLUMN public.payments.client_id IS
  'Canonical paying client reference. FK → public.clients(id).';

COMMENT ON COLUMN public.payments.lead_id IS
  'Legacy lead reference. FK → public.leads(id). Never store clients.id here.';
