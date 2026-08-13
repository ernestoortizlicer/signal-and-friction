#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const pass = (label) => console.log(`✓ ${label}`);
const fail = (label) => failures.push(label);
const need = (body, needle, label) => body.includes(needle) ? pass(label) : fail(`${label} — missing ${JSON.stringify(needle)}`);
const avoid = (body, needle, label) => !body.includes(needle) ? pass(label) : fail(`${label} — forbidden ${JSON.stringify(needle)}`);

console.log("Prospect promotion authority contract\n");

const page = read("src/app/admin/prospecting/page.tsx");
const migration = read("supabase/migrations/20260813213000_atomic_prospect_promotion.sql");

need(page, "/rest/v1/rpc/promote_prospect_candidate", "Prospecting uses one promotion command");
need(page, "promotion?.client_id", "Frontend requires committed client confirmation");
need(page, "promotion?.project_id", "Frontend requires committed project confirmation");
avoid(page, "`${SUPABASE_URL}/rest/v1/clients`", "Prospecting no longer creates clients directly");
avoid(page, "`${SUPABASE_URL}/rest/v1/beta_projects`", "Prospecting no longer creates beta_projects directly");

need(migration, "CREATE OR REPLACE FUNCTION public.promote_prospect_candidate", "Atomic promotion RPC exists");
need(migration, "FOR UPDATE", "Promotion serializes concurrent/retried attempts");
need(migration, "IF v_candidate.status = 'promoted'", "Promotion is idempotent for an already-promoted prospect");
need(migration, "trigger_client_created is the one beta_project provisioning authority", "beta_project provisioning has one declared authority");
need(migration, "IF v_candidate.status <> 'scanned'", "Promotion fails closed for non-scanned prospects");
need(migration, "REVOKE ALL ON FUNCTION", "Promotion RPC does not inherit broad public execution");
need(migration, "GRANT EXECUTE ON FUNCTION", "Promotion RPC explicitly grants authenticated execution");

if (failures.length) {
  console.error("\nProspect promotion authority contract FAILED:\n");
  for (const item of failures) console.error(`✗ ${item}`);
  process.exit(1);
}

console.log("\nProspect promotion authority contract passed.");
