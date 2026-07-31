-- ════════════════════════════════════════════════════════════
-- MIGRATION: Wipe priority_tasks seed/test data to true zero
-- Migration ID: 20260804000000_wipe_priority_tasks_seed_data
--
-- Confirmed via a live SELECT that every row in priority_tasks is either:
--   - auto_generated from beta_projects/ai_incidents rows that have since
--     been deleted (orphaned, e.g. "Send outreach to Automation-live-test",
--     "Documenso"/"Formbricks"/"Featurebase" — all seed test companies), or
--   - one of the two hand-coded "manual" tasks the 2026-06-18
--     20260618000003_priority_engine.sql migration itself inserted
--     ("Review FIRE retirement projections...", "Reconcile AI API
--     subscriptions...") — seeded with auto_generated=false and
--     source_table='manual', the same signature a real manually-created
--     task would have, or
--   - "prueba" (2026-07-30), Ernesto's own throwaway test of the Add Task
--     form, explicitly requested to go too.
--
-- None of it is real work. priority_config (scoring weights) is NOT
-- touched — that's real configuration, not task data.
--
-- priority_scores_log is deleted explicitly before priority_tasks rather
-- than relied on to cascade (it does have ON DELETE CASCADE via task_id,
-- but this project's convention is to never depend on that silently).
--
-- Regeneration check: the only thing that writes a priority_tasks row
-- from beta_projects is trigger_sync_beta_project_priorities, which is
-- purely event-driven (AFTER INSERT OR UPDATE OF status ON beta_projects)
-- — no cron, no bulk resync. With beta_projects empty, nothing can fire
-- it until a real new beta_projects row exists, which is the correct,
-- intended behavior going forward.
-- ════════════════════════════════════════════════════════════

BEGIN;

DELETE FROM public.priority_scores_log;
DELETE FROM public.priority_tasks;

-- Sanity check: priority_tasks and priority_scores_log should be empty;
-- priority_config should be unchanged (15 scoring-weight rows).
SELECT 'priority_tasks' AS table_name, count(*) FROM public.priority_tasks
UNION ALL SELECT 'priority_scores_log', count(*) FROM public.priority_scores_log
UNION ALL SELECT 'priority_config (untouched)', count(*) FROM public.priority_config;

COMMIT;
