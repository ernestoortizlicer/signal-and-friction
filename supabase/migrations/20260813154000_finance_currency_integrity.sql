-- Finance OS v2 — currency integrity.
-- The ledger has integer amounts denominated by account currency. Until an
-- explicit FX journal workflow exists, one journal entry may not cross currencies.

CREATE OR REPLACE FUNCTION public.post_finance_transaction(
  p_actor_id uuid,
  p_date timestamptz,
  p_description text,
  p_debit_account uuid,
  p_credit_account uuid,
  p_amount_cents bigint,
  p_external_source text DEFAULT NULL,
  p_external_id text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  tx_id uuid;
  debit_profile uuid;
  credit_profile uuid;
  debit_currency text;
  credit_currency text;
BEGIN
  IF COALESCE(auth.jwt()->>'role','') <> 'service_role' THEN RAISE EXCEPTION 'service_role required'; END IF;
  IF p_actor_id IS NULL THEN RAISE EXCEPTION 'actor required'; END IF;
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  IF p_debit_account IS NULL OR p_credit_account IS NULL OR p_debit_account=p_credit_account THEN
    RAISE EXCEPTION 'debit and credit accounts must be distinct';
  END IF;
  IF (p_external_source IS NULL) <> (p_external_id IS NULL) THEN
    RAISE EXCEPTION 'external_source and external_id must be supplied together';
  END IF;
  IF p_external_source IS NOT NULL THEN
    SELECT id INTO tx_id FROM public.transactions
    WHERE external_source=p_external_source AND external_id=p_external_id;
    IF tx_id IS NOT NULL THEN RETURN tx_id; END IF;
  END IF;

  SELECT profile_id,currency INTO debit_profile,debit_currency
  FROM public.accounts WHERE id=p_debit_account AND is_active=true;
  IF NOT FOUND OR debit_profile IS NULL THEN RAISE EXCEPTION 'debit account not found, inactive, or unscoped'; END IF;
  SELECT profile_id,currency INTO credit_profile,credit_currency
  FROM public.accounts WHERE id=p_credit_account AND is_active=true;
  IF NOT FOUND OR credit_profile IS NULL THEN RAISE EXCEPTION 'credit account not found, inactive, or unscoped'; END IF;
  IF debit_profile<>credit_profile THEN
    RAISE EXCEPTION 'cross-profile journal entry requires an explicit interprofile workflow';
  END IF;
  IF debit_currency IS DISTINCT FROM credit_currency THEN
    RAISE EXCEPTION 'cross-currency journal entry requires an explicit FX workflow';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.finance_profiles WHERE id=debit_profile AND owner_id=p_actor_id) THEN
    RAISE EXCEPTION 'actor does not own finance profile';
  END IF;

  INSERT INTO public.transactions(date,description,profile_id,status,external_source,external_id,created_by)
  VALUES(COALESCE(p_date,now()),btrim(p_description),debit_profile,'posted',p_external_source,p_external_id,p_actor_id)
  RETURNING id INTO tx_id;
  INSERT INTO public.transaction_entries(transaction_id,account_id,amount)
  VALUES(tx_id,p_debit_account,p_amount_cents),(tx_id,p_credit_account,-p_amount_cents);
  RETURN tx_id;
END $$;

REVOKE ALL ON FUNCTION public.post_finance_transaction(uuid,timestamptz,text,uuid,uuid,bigint,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.post_finance_transaction(uuid,timestamptz,text,uuid,uuid,bigint,text,text) TO service_role;
