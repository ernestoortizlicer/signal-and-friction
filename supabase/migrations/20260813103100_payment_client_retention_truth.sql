-- PAYMENT -> CLIENT RETENTION TRUTH
-- 2026-08-13
--
-- PR #13 made payments.client_id immutable once assigned. The existing
-- FK still declared ON DELETE SET NULL, which asks Postgres to perform the
-- exact mutation the immutability guard correctly rejects when a paid client
-- is deleted. Make the schema state the real rule directly: a client with
-- canonical payment evidence cannot be deleted while that payment remains.
-- Unpaid clients remain deletable. Payment deletion remains a separate,
-- deliberate financial-data action rather than an accidental client cascade.

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_client_id_fkey;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_client_id_fkey
  FOREIGN KEY (client_id)
  REFERENCES public.clients(id)
  ON DELETE RESTRICT;
