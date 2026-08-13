-- Safe performance hardening for the 2026-08-13 Learning/Training/Finance scope.
-- Adds covering indexes for FK paths identified by Supabase Advisor and avoids
-- per-row auth.uid() re-evaluation in owner RLS policies.

CREATE INDEX IF NOT EXISTS idx_answer_key_revisions_case_id ON public.answer_key_revisions(case_id);
CREATE INDEX IF NOT EXISTS idx_case_verification_case_id ON public.case_verification(case_id);
CREATE INDEX IF NOT EXISTS idx_training_adjudications_attempt_id ON public.training_adjudications(attempt_id);
CREATE INDEX IF NOT EXISTS idx_training_attempts_adjudication_id ON public.training_attempts(adjudication_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_resource_id ON public.learning_sessions(resource_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_linked_attempt_id ON public.learning_sessions(linked_attempt_id);
CREATE INDEX IF NOT EXISTS idx_transaction_entries_category_id ON public.transaction_entries(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reversal_transaction_id ON public.transactions(reversal_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reverses_transaction_id ON public.transactions(reverses_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_source_project_id ON public.transactions(source_project_id);

DROP POLICY IF EXISTS ta_select ON public.training_attempts;
DROP POLICY IF EXISTS ta_insert ON public.training_attempts;
DROP POLICY IF EXISTS ta_update ON public.training_attempts;
CREATE POLICY ta_select ON public.training_attempts FOR SELECT TO authenticated
  USING (analyst_id = (SELECT auth.uid()));
CREATE POLICY ta_insert ON public.training_attempts FOR INSERT TO authenticated
  WITH CHECK (analyst_id = (SELECT auth.uid()));
CREATE POLICY ta_update ON public.training_attempts FOR UPDATE TO authenticated
  USING (analyst_id = (SELECT auth.uid())) WITH CHECK (analyst_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS learning_daily_settings_owner ON public.learning_daily_settings;
CREATE POLICY learning_daily_settings_owner ON public.learning_daily_settings FOR ALL TO authenticated
  USING (analyst_id = (SELECT auth.uid())) WITH CHECK (analyst_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS learning_resources_owner ON public.learning_resources;
CREATE POLICY learning_resources_owner ON public.learning_resources FOR ALL TO authenticated
  USING (analyst_id = (SELECT auth.uid())) WITH CHECK (analyst_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS learning_sessions_owner ON public.learning_sessions;
CREATE POLICY learning_sessions_owner ON public.learning_sessions FOR ALL TO authenticated
  USING (analyst_id = (SELECT auth.uid())) WITH CHECK (analyst_id = (SELECT auth.uid()));
