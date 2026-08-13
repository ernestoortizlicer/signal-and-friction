-- Finance OS v2 — profile currency contract.
-- A profile is intentionally single-currency until an explicit FX accounting
-- workflow exists. This prevents nominal cents from different currencies being
-- aggregated as if they were comparable.

CREATE OR REPLACE FUNCTION public.enforce_finance_account_profile_currency()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
DECLARE base text;
BEGIN
  IF NEW.profile_id IS NULL THEN RETURN NEW; END IF;
  SELECT base_currency INTO base FROM public.finance_profiles WHERE id=NEW.profile_id;
  IF base IS NULL THEN RAISE EXCEPTION 'finance profile not found'; END IF;
  IF NEW.currency IS DISTINCT FROM base THEN
    RAISE EXCEPTION 'account currency % must match finance profile base currency % until an explicit FX workflow exists', NEW.currency, base;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_finance_account_profile_currency ON public.accounts;
CREATE TRIGGER trg_finance_account_profile_currency
  BEFORE INSERT OR UPDATE OF profile_id,currency ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_finance_account_profile_currency();

CREATE OR REPLACE FUNCTION public.enforce_finance_profile_base_currency_change()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF NEW.base_currency IS DISTINCT FROM OLD.base_currency AND EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.profile_id=OLD.id AND a.currency IS DISTINCT FROM NEW.base_currency
  ) THEN
    RAISE EXCEPTION 'cannot change base currency while profile has accounts in another currency; migrate through an explicit currency workflow or create a separate profile';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_finance_profile_base_currency_change ON public.finance_profiles;
CREATE TRIGGER trg_finance_profile_base_currency_change
  BEFORE UPDATE OF base_currency ON public.finance_profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_finance_profile_base_currency_change();

-- Fail migration if historical state already violates the contract.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.accounts a
    JOIN public.finance_profiles p ON p.id=a.profile_id
    WHERE a.currency IS DISTINCT FROM p.base_currency
  ) THEN
    RAISE EXCEPTION 'pre-existing finance account/profile currency mismatch must be reconciled before enabling single-currency profile contract';
  END IF;
END $$;
