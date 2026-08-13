#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(ROOT, p), "utf8");
let failed = false;
const fail = (m) => { failed = true; console.error(`✗ ${m}`); };
const ok = (m) => console.log(`✓ ${m}`);
const requireText = (body, needle, label) => body.includes(needle) ? ok(label) : fail(`${label}: missing ${needle}`);
const forbidText = (body, needle, label) => body.includes(needle) ? fail(`${label}: forbidden ${needle}`) : ok(label);

const page = read("src/app/admin/training/page.tsx");
const compatibility = read("src/app/admin/learning/page.tsx");
const daily = read("src/app/admin/learning/DailyTrainingPlanV3.tsx");
const api = read("functions/api/learning/daily.ts");
const baseMigration = read("supabase/migrations/20260813140000_learning_os_v2.sql");
const truthMigration = read("supabase/migrations/20260813183000_training_completion_truth.sql");
const training = read("src/lib/training-workflow.ts");

requireText(page, "Training OS v3", "Human learning is exposed as Training");
requireText(page, "DailyTrainingPlanV3", "Training uses the server-timed deliberate-practice surface");
requireText(page, "DiagnosticCalibration", "Diagnostic Calibration remains the canonical diagnostic practice surface");
requireText(page, "ReasoningActivities", "Reasoning Lab remains available as supporting practice");
forbidText(page, "supabase.from(", "Training shell does not directly mutate database state");
requireText(compatibility, '../training/page', "Legacy Learning route aliases the canonical Training surface");

requireText(daily, "/api/learning/daily", "Daily Training state routes through the admin-gated API");
requireText(daily, "Start Training", "A block has an explicit start before completion");
requireText(daily, "complete_session", "Training UI completes only through the server contract");
requireText(daily, "evidenceRef", "Daily blocks can carry evidence references");
requireText(daily, "retrievalScore", "Active retrieval quality can be recorded");
requireText(daily, "Start → Practice → Evidence → Validate", "Daily Training encodes deliberate practice rather than passive completion");

requireText(api, "requireAdmin", "Training API is server-side admin gated");
requireText(api, "ensure_plan", "Training API can materialize the daily plan deterministically");
requireText(api, "start_session", "Training API records a server-authoritative start");
requireText(api, "complete_session", "Training API records completed evidence-bearing sessions");
requireText(api, "actual_seconds", "Training API persists server-derived elapsed time");
requireText(api, "session.status !== 'in_progress'", "Completion requires an in-progress session");
forbidText(api, "body.actualMinutes", "Client cannot assert actual training time");
requireText(api, "calibrationFocus", "Daily Training can target recent calibration failure modes");

requireText(baseMigration, "learning_daily_settings", "Daily targets are persisted as explicit state");
requireText(baseMigration, "learning_resources", "External courses/resources are tracked explicitly");
requireText(baseMigration, "learning_sessions", "Deliberate-practice sessions are persisted explicitly");
requireText(baseMigration, "linked_attempt_id", "Training sessions can link to canonical diagnostic attempts without duplicating them");
requireText(truthMigration, "learning_sessions_completed_truth_check", "Database rejects false completed Training state");
requireText(truthMigration, "actual_seconds", "Database stores elapsed seconds separately from planned minutes");
requireText(truthMigration, "v_learning_session_performance", "Training performance projection supports pace analysis");

for (const stage of ["observation","evidence_review","hypothesis","counter_hypothesis","socratic_challenge","revision","judgment","recommendation","verdict_revealed","reflection_complete"]) {
  requireText(training, `"${stage}"`, `Canonical diagnostic stage preserved: ${stage}`);
}

if (failed) {
  console.error("\nTraining OS truth guard failed. Keep timing, evidence, Diagnostic Calibration and premium-readiness authority aligned.");
  process.exit(1);
}
console.log("\nTraining OS authority contract passed.");
