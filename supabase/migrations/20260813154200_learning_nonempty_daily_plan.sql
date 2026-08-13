-- Learning OS v2 — a daily target configuration may disable individual blocks,
-- but cannot disable the entire deliberate-practice operating loop.

DO $$ BEGIN
  ALTER TABLE public.learning_daily_settings
    ADD CONSTRAINT learning_daily_settings_nonempty_plan
    CHECK (
      course_study_target_min
      + diagnostic_practice_target_min
      + active_recall_target_min
      + build_application_target_min > 0
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
