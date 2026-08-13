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

const page = read("src/app/admin/learning/page.tsx");
const daily = read("src/app/admin/learning/DailyTrainingPlan.tsx");
const api = read("functions/api/learning/daily.ts");
const migration = read("supabase/migrations/20260813140000_learning_os_v2.sql");
const training = read("src/lib/training-workflow.ts");

requireText(page, 'useState<Tab>("daily")', "Learning opens on the daily deliberate-practice control surface");
requireText(page, "DailyTrainingPlan", "Learning uses Daily Learning OS");
requireText(page, "DiagnosticCalibration", "Diagnostic Calibration remains the canonical diagnostic practice surface");
requireText(page, "ReasoningActivities", "Reasoning Lab remains available as a supporting practice surface");
requireText(page, "Legacy data preserved; legacy pedagogy retired", "Legacy learning is explicitly non-authoritative");
forbidText(page, "supabase.from(", "Learning shell does not directly mutate database state");

requireText(daily, "/api/learning/daily", "Daily practice state routes through the admin-gated Learning API");
requireText(daily, "evidenceRef", "Daily blocks can carry evidence references");
requireText(daily, "retrievalScore", "Active retrieval quality can be recorded");
requireText(daily, "Study → Retrieve → Diagnose → Apply", "Daily plan encodes deliberate practice rather than passive completion");
requireText(daily, "Course completion is input", "Course completion is not confused with certification evidence");

requireText(api, "requireAdmin", "Learning API is server-side admin gated");
requireText(api, "ensure_plan", "Learning API can materialize the daily plan deterministically");
requireText(api, "complete_session", "Learning API records completed evidence-bearing sessions");
requireText(api, "calibrationFocus", "Daily learning can target recent calibration failure modes");

requireText(migration, "learning_daily_settings", "Daily targets are persisted as explicit state");
requireText(migration, "learning_resources", "External courses/resources are tracked explicitly");
requireText(migration, "learning_sessions", "Deliberate-practice sessions are persisted explicitly");
requireText(migration, "linked_attempt_id", "Learning sessions can link to canonical diagnostic attempts without duplicating them");

for (const stage of ["observation","evidence_review","hypothesis","counter_hypothesis","socratic_challenge","revision","judgment","recommendation","verdict_revealed","reflection_complete"]) {
  requireText(training, `"${stage}"`, `Canonical diagnostic stage preserved: ${stage}`);
}

if (failed) {
  console.error("\nLearning OS truth guard failed. Keep daily study, practice evidence and Diagnostic Calibration authority aligned.");
  process.exit(1);
}
console.log("\nLearning OS authority contract passed.");
