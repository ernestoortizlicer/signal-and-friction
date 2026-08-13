-- Atomic policy activation for Finance OS v2.

CREATE OR REPLACE FUNCTION public.activate_finance_cash_policy(
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
  IF NOT public.finance_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.finance_profiles WHERE id=p_profile_id AND owner_id=auth.uid()) THEN
    RAISE EXCEPTION 'profile not found';
  END IF;
  IF round(p_owner_pay+p_tax_reserve+p_operating_reserve+p_long_term_investing+p_opportunity,2)<>100.00 THEN
    RAISE EXCEPTION 'allocation percentages must sum to 100';
  END IF;
  IF p_tax_verified AND (p_tax_evidence IS NULL OR length(btrim(p_tax_evidence))=0) THEN
    RAISE EXCEPTION 'verified tax reserve requires evidence';
  END IF;
  SELECT COALESCE(max(version),0)+1 INTO next_version FROM public.finance_cash_policies WHERE profile_id=p_profile_id;
  UPDATE public.finance_cash_policies SET status='retired' WHERE profile_id=p_profile_id AND status='active';
  INSERT INTO public.finance_cash_policies(
    profile_id,version,name,status,reserve_months_target,owner_pay_pct,
    tax_compliance_reserve_pct,operating_reserve_pct,long_term_investing_pct,
    opportunity_fund_pct,tax_reserve_verified,tax_reserve_evidence_ref,rationale,approved_at
  ) VALUES (
    p_profile_id,next_version,COALESCE(NULLIF(btrim(p_name),''),'Treasury Policy'),'active',
    p_reserve_months,p_owner_pay,p_tax_reserve,p_operating_reserve,p_long_term_investing,
    p_opportunity,p_tax_verified,NULLIF(btrim(p_tax_evidence),''),NULLIF(btrim(p_rationale),''),now()
  ) RETURNING id INTO new_id;
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.activate_finance_investment_policy(
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
  IF NOT public.finance_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.finance_profiles WHERE id=p_profile_id AND owner_id=auth.uid()) THEN
    RAISE EXCEPTION 'profile not found';
  END IF;
  IF p_risk_capacity NOT IN ('unassessed','low','moderate','high') THEN RAISE EXCEPTION 'invalid risk capacity'; END IF;
  SELECT COALESCE(max(version),0)+1 INTO next_version FROM public.finance_investment_policies WHERE profile_id=p_profile_id;
  UPDATE public.finance_investment_policies SET status='retired' WHERE profile_id=p_profile_id AND status='active';
  INSERT INTO public.finance_investment_policies(
    profile_id,version,status,horizon_years,liquidity_buffer_months,risk_capacity,
    max_single_asset_pct,max_illiquid_pct,allowed_asset_classes,prohibited_asset_classes,notes,approved_at
  ) VALUES (
    p_profile_id,next_version,'active',p_horizon_years,p_liquidity_months,p_risk_capacity,
    p_max_single_asset,p_max_illiquid,COALESCE(p_allowed,ARRAY[]::text[]),COALESCE(p_prohibited,ARRAY[]::text[]),
    NULLIF(btrim(p_notes),''),now()
  ) RETURNING id INTO new_id;
  RETURN new_id;
END $$;

REVOKE ALL ON FUNCTION public.activate_finance_cash_policy(uuid,text,numeric,numeric,numeric,numeric,numeric,numeric,boolean,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.activate_finance_investment_policy(uuid,integer,numeric,text,numeric,numeric,text[],text[],text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.activate_finance_cash_policy(uuid,text,numeric,numeric,numeric,numeric,numeric,numeric,boolean,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_finance_investment_policy(uuid,integer,numeric,text,numeric,numeric,text[],text[],text) TO authenticated;
