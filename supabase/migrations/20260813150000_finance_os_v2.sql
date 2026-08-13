-- ═════════════════════════════════════════════════════════════════════════════
-- FINANCE OS v2 — ledger + compliance + treasury + wealth decision support
-- Migration ID: 20260813150000_finance_os_v2
--
-- Constitutional boundaries:
-- 1) Accounting truth is deterministic and append/reversal based.
-- 2) Compliance claims must point to a dated source/evidence record; an LLM is
--    never the source of a tax liability or legal filing requirement.
-- 3) Cash allocation is a versioned, human-approved policy.
-- 4) Investment support is policy/scenario education. No autonomous trading.
-- ═════════════════════════════════════════════════════════════════════════════

-- ── 1. Finance identity / least privilege ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.finance_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  SELECT lower(COALESCE(auth.jwt()->>'email','')) = ANY (
    ARRAY['ernestoortiz@gmail.com','ernestoortizlicer@gmail.com']::text[]
  );
$$;
REVOKE ALL ON FUNCTION public.finance_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finance_is_admin() TO authenticated;

CREATE TABLE IF NOT EXISTS public.finance_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('business','personal')),
  entity_name text,
  base_currency text NOT NULL DEFAULT 'USD',
  jurisdiction_code text,
  jurisdiction_status text NOT NULL DEFAULT 'self_reported' CHECK (jurisdiction_status IN ('self_reported','professional_verified','unknown')),
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  verified_by text,
  verified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, name)
);
ALTER TABLE public.finance_profiles ENABLE ROW LEVEL SECURITY;

-- Create one usable business scope for existing admins without guessing tax
-- residence or legal jurisdiction. Those fields remain explicitly unknown.
INSERT INTO public.finance_profiles(owner_id,name,scope,entity_name,base_currency,jurisdiction_status)
SELECT id,'Signal & Friction','business','Signal & Friction','USD','unknown'
FROM auth.users
ON CONFLICT(owner_id,name) DO NOTHING;

-- ── 2. Harden and enrich the existing ledger ───────────────────────────────
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.finance_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS liquidity_class text NOT NULL DEFAULT 'not_applicable',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

DO $$ BEGIN
  ALTER TABLE public.accounts ADD CONSTRAINT accounts_liquidity_class_check
    CHECK (liquidity_class IN ('cash','cash_equivalent','investment','illiquid','not_applicable'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

UPDATE public.accounts SET liquidity_class='cash' WHERE name='Signal & Friction Checking';
UPDATE public.accounts SET liquidity_class='investment' WHERE name IN ('Investment Account','Roth IRA Account');
UPDATE public.accounts SET liquidity_class='illiquid' WHERE name='Hardware Assets';
UPDATE public.accounts a SET profile_id=p.id
FROM public.finance_profiles p
WHERE a.profile_id IS NULL AND p.name='Signal & Friction';

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.finance_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'posted',
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS void_reason text,
  ADD COLUMN IF NOT EXISTS reversal_transaction_id uuid REFERENCES public.transactions(id),
  ADD COLUMN IF NOT EXISTS reverses_transaction_id uuid REFERENCES public.transactions(id),
  ADD COLUMN IF NOT EXISTS external_source text,
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS created_by uuid;

DO $$ BEGIN
  ALTER TABLE public.transactions ADD CONSTRAINT transactions_status_check
    CHECK (status IN ('posted','voided'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_external_transaction
  ON public.transactions(external_source,external_id)
  WHERE external_source IS NOT NULL AND external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finance_transactions_profile_date
  ON public.transactions(profile_id,date DESC);

ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.finance_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_note text;
ALTER TABLE public.financial_goals
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.finance_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

UPDATE public.investments i SET profile_id=p.id FROM public.finance_profiles p WHERE i.profile_id IS NULL AND p.name='Signal & Friction';
UPDATE public.financial_goals g SET profile_id=p.id FROM public.finance_profiles p WHERE g.profile_id IS NULL AND p.name='Signal & Friction';

-- Atomic posting: header and both double-entry legs are one DB transaction.
CREATE OR REPLACE FUNCTION public.post_finance_transaction(
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
BEGIN
  IF NOT public.finance_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
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

  SELECT profile_id INTO debit_profile FROM public.accounts WHERE id=p_debit_account AND is_active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'debit account not found or inactive'; END IF;
  SELECT profile_id INTO credit_profile FROM public.accounts WHERE id=p_credit_account AND is_active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'credit account not found or inactive'; END IF;
  IF debit_profile IS NOT NULL AND credit_profile IS NOT NULL AND debit_profile<>credit_profile THEN
    RAISE EXCEPTION 'cross-profile journal entry requires an explicit intercompany/interprofile workflow';
  END IF;

  INSERT INTO public.transactions(
    date,description,profile_id,status,external_source,external_id,created_by
  ) VALUES (
    COALESCE(p_date,now()),btrim(p_description),COALESCE(debit_profile,credit_profile),'posted',
    p_external_source,p_external_id,auth.uid()
  ) RETURNING id INTO tx_id;

  INSERT INTO public.transaction_entries(transaction_id,account_id,amount)
  VALUES
    (tx_id,p_debit_account,p_amount_cents),
    (tx_id,p_credit_account,-p_amount_cents);

  RETURN tx_id;
END $$;

-- Accounting history is reversed, never deleted or silently rewritten.
CREATE OR REPLACE FUNCTION public.void_finance_transaction(
  p_transaction_id uuid,
  p_reason text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  original record;
  reversal_id uuid;
BEGIN
  IF NOT public.finance_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_reason IS NULL OR length(btrim(p_reason))<3 THEN RAISE EXCEPTION 'void reason is required'; END IF;

  SELECT * INTO original FROM public.transactions WHERE id=p_transaction_id FOR UPDATE;
  IF original.id IS NULL THEN RAISE EXCEPTION 'transaction not found'; END IF;
  IF original.reverses_transaction_id IS NOT NULL THEN RAISE EXCEPTION 'a reversal transaction cannot itself be voided; reverse with a new explicit correction'; END IF;
  IF original.status='voided' THEN RETURN original.reversal_transaction_id; END IF;

  INSERT INTO public.transactions(
    date,description,profile_id,status,reverses_transaction_id,created_by
  ) VALUES (
    now(),'REVERSAL — '||original.description,original.profile_id,'posted',original.id,auth.uid()
  ) RETURNING id INTO reversal_id;

  INSERT INTO public.transaction_entries(transaction_id,account_id,category_id,amount)
  SELECT reversal_id,account_id,category_id,-amount
  FROM public.transaction_entries WHERE transaction_id=original.id;

  UPDATE public.transactions
  SET status='voided',voided_at=now(),void_reason=btrim(p_reason),reversal_transaction_id=reversal_id
  WHERE id=original.id;

  RETURN reversal_id;
END $$;

REVOKE ALL ON FUNCTION public.post_finance_transaction(timestamptz,text,uuid,uuid,bigint,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.void_finance_transaction(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_finance_transaction(timestamptz,text,uuid,uuid,bigint,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_finance_transaction(uuid,text) TO authenticated;

-- Force browser clients through the atomic RPC for ledger mutation.
REVOKE INSERT,UPDATE,DELETE ON public.transactions,public.transaction_entries FROM authenticated,anon;
GRANT SELECT ON public.transactions,public.transaction_entries TO authenticated;

-- ── 3. Compliance evidence store ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.finance_compliance_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_code text NOT NULL,
  authority text NOT NULL,
  topic text NOT NULL,
  source_title text NOT NULL,
  source_url text NOT NULL,
  valid_from date,
  valid_to date,
  checked_at timestamptz NOT NULL DEFAULT now(),
  content_hash text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(jurisdiction_code,topic,source_url,checked_at)
);
ALTER TABLE public.finance_compliance_sources ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.finance_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.finance_profiles(id) ON DELETE CASCADE,
  jurisdiction_code text NOT NULL,
  obligation_type text NOT NULL,
  period_label text,
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','scheduled','filed','paid','not_applicable','needs_review')),
  amount_cents bigint,
  amount_currency text,
  amount_source text CHECK (amount_source IS NULL OR amount_source IN ('manual','authority_import','professional_verified')),
  source_id uuid REFERENCES public.finance_compliance_sources(id) ON DELETE SET NULL,
  evidence_ref text,
  requires_professional_review boolean NOT NULL DEFAULT true,
  notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (amount_cents IS NULL OR (amount_source IS NOT NULL AND amount_currency IS NOT NULL))
);
ALTER TABLE public.finance_obligations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_finance_obligations_profile_due ON public.finance_obligations(profile_id,status,due_date);

-- ── 4. Human-approved treasury allocation policy ────────────────────────────
CREATE TABLE IF NOT EXISTS public.finance_cash_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.finance_profiles(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  name text NOT NULL DEFAULT 'Treasury Policy',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','retired')),
  reserve_months_target numeric(6,2) NOT NULL DEFAULT 6 CHECK (reserve_months_target BETWEEN 0 AND 60),
  owner_pay_pct numeric(5,2) NOT NULL DEFAULT 0 CHECK (owner_pay_pct BETWEEN 0 AND 100),
  tax_compliance_reserve_pct numeric(5,2) NOT NULL DEFAULT 0 CHECK (tax_compliance_reserve_pct BETWEEN 0 AND 100),
  operating_reserve_pct numeric(5,2) NOT NULL DEFAULT 0 CHECK (operating_reserve_pct BETWEEN 0 AND 100),
  long_term_investing_pct numeric(5,2) NOT NULL DEFAULT 0 CHECK (long_term_investing_pct BETWEEN 0 AND 100),
  opportunity_fund_pct numeric(5,2) NOT NULL DEFAULT 0 CHECK (opportunity_fund_pct BETWEEN 0 AND 100),
  tax_reserve_verified boolean NOT NULL DEFAULT false,
  tax_reserve_evidence_ref text,
  rationale text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (round(owner_pay_pct+tax_compliance_reserve_pct+operating_reserve_pct+long_term_investing_pct+opportunity_fund_pct,2)=100.00),
  CHECK (tax_reserve_verified=false OR tax_reserve_evidence_ref IS NOT NULL)
);
ALTER TABLE public.finance_cash_policies ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_active_cash_policy
  ON public.finance_cash_policies(profile_id) WHERE status='active';

-- ── 5. Investment Policy Statement (IPS), not a trading bot ────────────────
CREATE TABLE IF NOT EXISTS public.finance_investment_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.finance_profiles(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','retired')),
  horizon_years integer NOT NULL DEFAULT 10 CHECK (horizon_years BETWEEN 1 AND 80),
  liquidity_buffer_months numeric(6,2) NOT NULL DEFAULT 6 CHECK (liquidity_buffer_months BETWEEN 0 AND 60),
  risk_capacity text NOT NULL DEFAULT 'unassessed' CHECK (risk_capacity IN ('unassessed','low','moderate','high')),
  max_single_asset_pct numeric(5,2) NOT NULL DEFAULT 20 CHECK (max_single_asset_pct BETWEEN 0 AND 100),
  max_illiquid_pct numeric(5,2) NOT NULL DEFAULT 30 CHECK (max_illiquid_pct BETWEEN 0 AND 100),
  allowed_asset_classes text[] NOT NULL DEFAULT ARRAY['cash','broad_public_markets']::text[],
  prohibited_asset_classes text[] NOT NULL DEFAULT ARRAY[]::text[],
  notes text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_investment_policies ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_active_investment_policy
  ON public.finance_investment_policies(profile_id) WHERE status='active';

-- ── 6. Agent evidence / recommendations ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.finance_agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analyst_id uuid NOT NULL,
  profile_id uuid REFERENCES public.finance_profiles(id) ON DELETE SET NULL,
  question text NOT NULL,
  input_snapshot_hash text,
  model text,
  prompt_version text NOT NULL,
  status text NOT NULL DEFAULT 'started' CHECK (status IN ('started','completed','failed')),
  output_json jsonb,
  trace_json jsonb,
  estimated_cost_usd numeric,
  latency_ms integer,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.finance_agent_runs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.finance_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.finance_agent_runs(id) ON DELETE SET NULL,
  profile_id uuid REFERENCES public.finance_profiles(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('bookkeeping','compliance','treasury','wealth','education')),
  title text NOT NULL,
  rationale text NOT NULL,
  assumptions jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_level text NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low','medium','high')),
  requires_human_approval boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','rejected','implemented','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
ALTER TABLE public.finance_recommendations ENABLE ROW LEVEL SECURITY;

-- ── 7. Replace broad authenticated=true RLS with finance-admin semantics ────
DO $$
DECLARE tbl text; pol record;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'accounts','categories','investments','net_worth_snapshots','education_content',
    'financial_goals','financial_incidents','finance_profiles','finance_compliance_sources',
    'finance_obligations','finance_cash_policies','finance_investment_policies',
    'finance_agent_runs','finance_recommendations'
  ] LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=tbl LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',pol.policyname,tbl);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',tbl);
    EXECUTE format('CREATE POLICY finance_admin_all ON public.%I FOR ALL TO authenticated USING (public.finance_is_admin()) WITH CHECK (public.finance_is_admin())',tbl);
  END LOOP;

  FOREACH tbl IN ARRAY ARRAY['transactions','transaction_entries'] LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=tbl LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',pol.policyname,tbl);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',tbl);
    EXECUTE format('CREATE POLICY finance_admin_read ON public.%I FOR SELECT TO authenticated USING (public.finance_is_admin())',tbl);
  END LOOP;
END $$;

REVOKE ALL ON public.finance_profiles,public.finance_compliance_sources,public.finance_obligations,
  public.finance_cash_policies,public.finance_investment_policies,public.finance_agent_runs,
  public.finance_recommendations FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.finance_profiles,public.finance_compliance_sources,public.finance_obligations,
  public.finance_cash_policies,public.finance_investment_policies,public.finance_agent_runs,
  public.finance_recommendations TO authenticated;

-- Existing finance tables stay available to the single admin through RLS;
-- transaction/entry writes remain RPC-only as revoked above.
