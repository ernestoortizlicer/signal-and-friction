-- Stripe payment truth -> Finance OS projection.
-- The payment row is canonical external-payment truth. Finance is a separate
-- auditable projection and must use the hardened finance RPC, never raw ledger
-- table inserts from application code.
BEGIN;

CREATE TABLE IF NOT EXISTS public.finance_external_integrations (
  provider text PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.finance_profiles(id) ON DELETE CASCADE,
  cash_account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  revenue_account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  fee_account_id uuid REFERENCES public.accounts(id) ON DELETE RESTRICT,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_projection_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  external_id text NOT NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  issue_code text NOT NULL,
  detail text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  UNIQUE(provider, external_id, issue_code)
);
CREATE INDEX IF NOT EXISTS idx_finance_projection_issues_open
  ON public.finance_projection_issues(status,created_at DESC) WHERE status='open';

-- Seed only when the current internal Finance OS account set is unambiguous.
-- Runtime logic consumes IDs from this mapping; account names are not a
-- permanent integration contract.
INSERT INTO public.finance_external_integrations(provider,profile_id,cash_account_id,revenue_account_id,fee_account_id)
SELECT 'stripe', fp.id, cash.id, revenue.id, fees.id
FROM public.finance_profiles fp
JOIN public.accounts cash ON cash.profile_id=fp.id AND cash.name='Signal & Friction Checking' AND cash.is_active=true
JOIN public.accounts revenue ON revenue.profile_id=fp.id AND revenue.name='Consulting Revenue' AND revenue.is_active=true
LEFT JOIN public.accounts fees ON fees.profile_id=fp.id AND fees.name='Stripe Fees Expense' AND fees.is_active=true
WHERE fp.scope='business' AND fp.base_currency='USD'
  AND cash.currency='USD' AND revenue.currency='USD'
  AND (fees.id IS NULL OR fees.currency='USD')
ON CONFLICT (provider) DO NOTHING;

CREATE OR REPLACE FUNCTION public.record_finance_projection_issue(
  p_provider text,
  p_external_id text,
  p_payment_id uuid,
  p_issue_code text,
  p_detail text
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  INSERT INTO public.finance_projection_issues(provider,external_id,payment_id,issue_code,detail,status,updated_at,resolved_at)
  VALUES(p_provider,p_external_id,p_payment_id,p_issue_code,left(p_detail,500),'open',now(),NULL)
  ON CONFLICT(provider,external_id,issue_code) DO UPDATE
    SET payment_id=excluded.payment_id,detail=excluded.detail,status='open',updated_at=now(),resolved_at=NULL;
$$;

CREATE OR REPLACE FUNCTION public.project_stripe_payment_to_finance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  cfg record;
  actor_id uuid;
  transaction_id uuid;
BEGIN
  IF NEW.stripe_session_id IS NULL OR NEW.amount_total IS NULL OR NEW.amount_total <= 0 THEN
    RETURN NEW;
  END IF;

  IF lower(COALESCE(NEW.currency,'')) <> 'usd' THEN
    PERFORM public.record_finance_projection_issue('stripe',NEW.stripe_session_id,NEW.id,'unsupported_currency','Automatic Finance posting is USD-only until an explicit FX workflow exists.');
    RETURN NEW;
  END IF;

  SELECT * INTO cfg
  FROM public.finance_external_integrations
  WHERE provider='stripe' AND is_active=true;
  IF cfg.provider IS NULL THEN
    PERFORM public.record_finance_projection_issue('stripe',NEW.stripe_session_id,NEW.id,'integration_unconfigured','No active Stripe -> Finance account mapping exists.');
    RETURN NEW;
  END IF;

  SELECT owner_id INTO actor_id
  FROM public.finance_profiles
  WHERE id=cfg.profile_id;
  IF actor_id IS NULL THEN
    PERFORM public.record_finance_projection_issue('stripe',NEW.stripe_session_id,NEW.id,'profile_owner_missing','Configured Finance profile has no owner.');
    RETURN NEW;
  END IF;

  BEGIN
    transaction_id := public.post_finance_transaction(
      actor_id,
      COALESCE(NEW.created_at,now()),
      'Stripe payment: ' || COALESCE(NEW.product_name,'Signal & Friction service'),
      cfg.cash_account_id,
      cfg.revenue_account_id,
      NEW.amount_total,
      'stripe_checkout_session',
      NEW.stripe_session_id
    );

    UPDATE public.finance_projection_issues
      SET status='resolved',resolved_at=now(),updated_at=now()
    WHERE provider='stripe' AND external_id=NEW.stripe_session_id
      AND issue_code IN ('integration_unconfigured','profile_owner_missing','posting_failed')
      AND status='open';
  EXCEPTION WHEN OTHERS THEN
    PERFORM public.record_finance_projection_issue('stripe',NEW.stripe_session_id,NEW.id,'posting_failed',SQLERRM);
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_project_stripe_payment_to_finance ON public.payments;
CREATE TRIGGER trigger_project_stripe_payment_to_finance
AFTER INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.project_stripe_payment_to_finance();

-- Canonical Finance writes go through SECURITY DEFINER RPCs. The application
-- service role may read ledger state but cannot bypass profile/currency/
-- idempotency invariants with raw INSERT/UPDATE/DELETE calls.
REVOKE INSERT,UPDATE,DELETE ON public.transactions FROM anon,authenticated,service_role;
REVOKE INSERT,UPDATE,DELETE ON public.transaction_entries FROM anon,authenticated,service_role;
REVOKE ALL ON public.finance_external_integrations FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.finance_projection_issues FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.finance_external_integrations,public.finance_projection_issues TO service_role;
REVOKE ALL ON FUNCTION public.record_finance_projection_issue(text,text,uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.project_stripe_payment_to_finance() FROM PUBLIC,anon,authenticated;

COMMIT;
