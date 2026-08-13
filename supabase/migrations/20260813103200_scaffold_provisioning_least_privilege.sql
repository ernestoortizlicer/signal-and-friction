-- SCAFFOLD PROVISIONING LEAST-PRIVILEGE HARDENING
-- 2026-08-13
--
-- These functions are internal workflow machinery. Supabase/Postgres grants
-- EXECUTE on new functions broadly by default, which is unnecessary here.
-- Keep the service role as the only API caller for claim/finish operations;
-- trigger-owned functions remain inaccessible to anon/authenticated callers.
-- Pin search_path to remove mutable-resolution ambiguity flagged by the DB linter.

ALTER FUNCTION public.enqueue_scaffold_provisioning_job()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_payment_state_truth()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.claim_scaffold_provisioning_job(UUID, BOOLEAN)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.finish_scaffold_provisioning_job(UUID, TEXT, UUID, TEXT)
  SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.enqueue_scaffold_provisioning_job()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_payment_state_truth()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_scaffold_provisioning_job(UUID, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finish_scaffold_provisioning_job(UUID, TEXT, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_scaffold_provisioning_job(UUID, BOOLEAN)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_scaffold_provisioning_job(UUID, TEXT, UUID, TEXT)
  TO service_role;
