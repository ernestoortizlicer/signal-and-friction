-- ═════════════════════════════════════════════════════════════════════════════
-- Learning + Finance security-advisor hardening
-- 2026-08-13
--
-- Removes direct authenticated execution of privileged Finance RPCs, fixes
-- security-definer views introduced/used by the hardened Training layer, and
-- removes broad legacy mastery-view grants. Cloudflare requireAdmin() is the
-- application boundary; Finance mutation RPCs are service_role-only backend
-- primitives and receive the verified actor explicitly for ownership/audit.
-- ═════════════════════════════════════════════════════════════════════════════

-- RLS helper does not need elevated privileges: auth.jwt() is caller context.
ALTER FUNCTION public.finance_is_admin() SECURITY INVOKER;

-- Training verification views are internal derived state. Use invoker semantics
-- and expose them only to service_role.
ALTER VIEW public.v_case_verification_current SET (security_invoker = true);
ALTER VIEW public.v_case_eligibility_derived SET (security_invoker = true);
REVOKE ALL ON public.v_case_verification_current, public.v_case_eligibility_derived FROM anon, authenticated;
GRANT SELECT ON public.v_case_verification_current, public.v_case_eligibility_derived TO service_role;

-- Legacy mastery view is no longer an active Learning authority. Remove the old
-- broad grants and stop inheriting the creator's privileges.
ALTER VIEW public.mechanism_mastery SET (security_invoker = true);
REVOKE ALL ON public.mechanism_mastery FROM anon, authenticated;
GRANT SELECT ON public.mechanism_mastery TO service_role;

-- Existing finance trigger/snapshot functions already schema-qualify their table
-- references; fix their mutable search_path without changing behavior.
ALTER FUNCTION public.check_transaction_double_entry() SET search_path TO '';
ALTER FUNCTION public.generate_monthly_net_worth_snapshot() SET search_path TO '';

-- Remove the previously exposed Finance RPC signatures. New signatures below
-- are callable only by service_role and carry the verified human actor explicitly.
REVOKE ALL ON FUNCTION public.post_finance_transaction(timestamptz,text,uuid,uuid,bigint,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.void_finance_transaction(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.activate_finance_cash_policy(uuid,text,numeric,numeric,numeric,numeric,numeric,numeric,boolean,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.activate_finance_investment_policy(uuid,integer,numeric,text,numeric,numeric,text[],text[],text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_finance_compliance_source(uuid,text) FROM PUBLIC, anon, authenticated;

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
DECLARE tx_id uuid; debit_profile uuid; credit_profile uuid;
BEGIN
  IF COALESCE(auth.jwt()->>'role','') <> 'service_role' THEN RAISE EXCEPTION 'service_role required'; END IF;
  IF p_actor_id IS NULL THEN RAISE EXCEPTION 'actor required'; END IF;
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  IF p_debit_account IS NULL OR p_credit_account IS NULL OR p_debit_account=p_credit_account THEN RAISE EXCEPTION 'debit and credit accounts must be distinct'; END IF;
  IF (p_external_source IS NULL) <> (p_external_id IS NULL) THEN RAISE EXCEPTION 'external_source and external_id must be supplied together'; END IF;
  IF p_external_source IS NOT NULL THEN
    SELECT id INTO tx_id FROM public.transactions WHERE external_source=p_external_source AND external_id=p_external_id;
    IF tx_id IS NOT NULL THEN RETURN tx_id; END IF;
  END IF;
  SELECT profile_id INTO debit_profile FROM public.accounts WHERE id=p_debit_account AND is_active=true;
  IF NOT FOUND OR debit_profile IS NULL THEN RAISE EXCEPTION 'debit account not found, inactive, or unscoped'; END IF;
  SELECT profile_id INTO credit_profile FROM public.accounts WHERE id=p_credit_account AND is_active=true;
  IF NOT FOUND OR credit_profile IS NULL THEN RAISE EXCEPTION 'credit account not found, inactive, or unscoped'; END IF;
  IF debit_profile<>credit_profile THEN RAISE EXCEPTION 'cross-profile journal entry requires an explicit interprofile workflow'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.finance_profiles WHERE id=debit_profile AND owner_id=p_actor_id) THEN RAISE EXCEPTION 'actor does not own finance profile'; END IF;
  INSERT INTO public.transactions(date,description,profile_id,status,external_source,external_id,created_by)
  VALUES(COALESCE(p_date,now()),btrim(p_description),debit_profile,'posted',p_external_source,p_external_id,p_actor_id)
  RETURNING id INTO tx_id;
  INSERT INTO public.transaction_entries(transaction_id,account_id,amount)
  VALUES(tx_id,p_debit_account,p_amount_cents),(tx_id,p_credit_account,-p_amount_cents);
  RETURN tx_id;
END $$;

CREATE OR REPLACE FUNCTION public.void_finance_transaction(
  p_actor_id uuid,
  p_transaction_id uuid,
  p_reason text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE original record; reversal_id uuid;
BEGIN
  IF COALESCE(auth.jwt()->>'role','') <> 'service_role' THEN RAISE EXCEPTION 'service_role required'; END IF;
  IF p_actor_id IS NULL THEN RAISE EXCEPTION 'actor required'; END IF;
  IF p_reason IS NULL OR length(btrim(p_reason))<3 THEN RAISE EXCEPTION 'void reason is required'; END IF;
  SELECT * INTO original FROM public.transactions WHERE id=p_transaction_id FOR UPDATE;
  IF original.id IS NULL THEN RAISE EXCEPTION 'transaction not found'; END IF;
  IF original.profile_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.finance_profiles WHERE id=original.profile_id AND owner_id=p_actor_id) THEN RAISE EXCEPTION 'actor does not own finance profile'; END IF;
  IF original.reverses_transaction_id IS NOT NULL THEN RAISE EXCEPTION 'a reversal transaction cannot itself be voided; reverse with a new explicit correction'; END IF;
  IF original.status='voided' THEN RETURN original.reversal_transaction_id; END IF;
  INSERT INTO public.transactions(date,description,profile_id,status,reverses_transaction_id,created_by)
  VALUES(now(),'REVERSAL — '||original.description,original.profile_id,'posted',original.id,p_actor_id)
  RETURNING id INTO reversal_id;
  INSERT INTO public.transaction_entries(transaction_id,account_id,category_id,amount)
  SELECT reversal_id,account_id,category_id,-amount FROM public.transaction_entries WHERE transaction_id=original.id;
  UPDATE public.transactions SET status='voided',voided_at=now(),void_reason=btrim(p_reason),reversal_transaction_id=reversal_id WHERE id=original.id;
  RETURN reversal_id;
END $$;

CREATE OR REPLACE FUNCTION public.activate_finance_cash_policy(
  p_actor_id uuid,
  p_profile_id uuid,
  p_name text,
  p_reserve_months numeric,
  p_owner_pay numeric,
  p_tax_reserve numeric,
  p_operating_reserve numeric,
  p_long_term_investing numeric,
  p_opportunity numeric,
  p_tax_verified boolean,
  p_tax_evidence text,
  p_rationale text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE new_id uuid; next_version integer;
BEGIN
  IF COALESCE(auth.jwt()->>'role','') <> 'service_role' THEN RAISE EXCEPTION 'service_role required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.finance_profiles WHERE id=p_profile_id AND owner_id=p_actor_id) THEN RAISE EXCEPTION 'profile not found'; END IF;
  IF round(p_owner_pay+p_tax_reserve+p_operating_reserve+p_long_term_investing+p_opportunity,2)<>100.00 THEN RAISE EXCEPTION 'allocation percentages must sum to 100'; END IF;
  IF p_tax_verified AND (p_tax_evidence IS NULL OR length(btrim(p_tax_evidence))=0) THEN RAISE EXCEPTION 'verified tax reserve requires evidence'; END IF;
  SELECT COALESCE(max(version),0)+1 INTO next_version FROM public.finance_cash_policies WHERE profile_id=p_profile_id;
  UPDATE public.finance_cash_policies SET status='retired' WHERE profile_id=p_profile_id AND status='active';
  INSERT INTO public.finance_cash_policies(profile_id,version,name,status,reserve_months_target,owner_pay_pct,tax_compliance_reserve_pct,operating_reserve_pct,long_term_investing_pct,opportunity_fund_pct,tax_reserve_verified,tax_reserve_evidence_ref,rationale,approved_at)
  VALUES(p_profile_id,next_version,COALESCE(NULLIF(btrim(p_name),''),'Treasury Policy'),'active',p_reserve_months,p_owner_pay,p_tax_reserve,p_operating_reserve,p_long_term_investing,p_opportunity,p_tax_verified,NULLIF(btrim(p_tax_evidence),''),NULLIF(btrim(p_rationale),''),now()) RETURNING id INTO new_id;
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.activate_finance_investment_policy(
  p_actor_id uuid,
  p_profile_id uuid,
  p_horizon_years integer,
  p_liquidity_months numeric,
  p_risk_capacity text,
  p_max_single_asset numeric,
  p_max_illiquid numeric,
  p_allowed text[],
  p_prohibited text[],
  p_notes text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE new_id uuid; next_version integer;
BEGIN
  IF COALESCE(auth.jwt()->>'role','') <> 'service_role' THEN RAISE EXCEPTION 'service_role required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.finance_profiles WHERE id=p_profile_id AND owner_id=p_actor_id) THEN RAISE EXCEPTION 'profile not found'; END IF;
  IF p_risk_capacity NOT IN('unassessed','low','moderate','high') THEN RAISE EXCEPTION 'invalid risk capacity'; END IF;
  SELECT COALESCE(max(version),0)+1 INTO next_version FROM public.finance_investment_policies WHERE profile_id=p_profile_id;
  UPDATE public.finance_investment_policies SET status='retired' WHERE profile_id=p_profile_id AND status='active';
  INSERT INTO public.finance_investment_policies(profile_id,version,status,horizon_years,liquidity_buffer_months,risk_capacity,max_single_asset_pct,max_illiquid_pct,allowed_asset_classes,prohibited_asset_classes,notes,approved_at)
  VALUES(p_profile_id,next_version,'active',p_horizon_years,p_liquidity_months,p_risk_capacity,p_max_single_asset,p_max_illiquid,COALESCE(p_allowed,ARRAY[]::text[]),COALESCE(p_prohibited,ARRAY[]::text[]),NULLIF(btrim(p_notes),''),now()) RETURNING id INTO new_id;
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.verify_finance_compliance_source(
  p_source_id uuid,
  p_note text,
  p_verified_by text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
  IF COALESCE(auth.jwt()->>'role','') <> 'service_role' THEN RAISE EXCEPTION 'service_role required'; END IF;
  IF p_verified_by IS NULL OR length(btrim(p_verified_by))=0 THEN RAISE EXCEPTION 'verified_by required'; END IF;
  UPDATE public.finance_compliance_sources
  SET verification_status='verified',verified_by=btrim(p_verified_by),verified_at=now(),verification_note=NULLIF(btrim(p_note),'')
  WHERE id=p_source_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'source not found'; END IF;
END $$;

-- New signatures are backend-only.
REVOKE ALL ON FUNCTION public.post_finance_transaction(uuid,timestamptz,text,uuid,uuid,bigint,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.void_finance_transaction(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.activate_finance_cash_policy(uuid,uuid,text,numeric,numeric,numeric,numeric,numeric,numeric,boolean,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.activate_finance_investment_policy(uuid,uuid,integer,numeric,text,numeric,numeric,text[],text[],text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_finance_compliance_source(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.post_finance_transaction(uuid,timestamptz,text,uuid,uuid,bigint,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.void_finance_transaction(uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_finance_cash_policy(uuid,uuid,text,numeric,numeric,numeric,numeric,numeric,numeric,boolean,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_finance_investment_policy(uuid,uuid,integer,numeric,text,numeric,numeric,text[],text[],text) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_finance_compliance_source(uuid,text,text) TO service_role;
