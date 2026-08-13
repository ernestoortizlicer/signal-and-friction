-- Finance OS v2.1 — covering indexes for operational foreign keys.
-- Added after Supabase performance-advisor review on 2026-08-13.

CREATE INDEX IF NOT EXISTS idx_accounts_profile_id
  ON public.accounts(profile_id);

CREATE INDEX IF NOT EXISTS idx_finance_agent_runs_profile_id
  ON public.finance_agent_runs(profile_id);

CREATE INDEX IF NOT EXISTS idx_finance_obligations_source_id
  ON public.finance_obligations(source_id)
  WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_profile_jurisdictions_source_id
  ON public.finance_profile_jurisdictions(source_id)
  WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_recommendations_profile_id
  ON public.finance_recommendations(profile_id);

CREATE INDEX IF NOT EXISTS idx_finance_recommendations_run_id
  ON public.finance_recommendations(run_id);

CREATE INDEX IF NOT EXISTS idx_financial_goals_profile_id
  ON public.financial_goals(profile_id);

CREATE INDEX IF NOT EXISTS idx_investments_profile_id
  ON public.investments(profile_id);

CREATE INDEX IF NOT EXISTS idx_investments_account_id
  ON public.investments(account_id);
