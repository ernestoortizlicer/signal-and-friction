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

const page = read("src/app/admin/finance/page.tsx");
const api = read("functions/api/finance/index.ts");
const advisorApi = read("functions/api/finance/advisor.ts");
const advisorEdge = read("supabase/functions/finance-advisor-prompt/index.ts");
const baseMigration = read("supabase/migrations/20260813150000_finance_os_v2.sql");
const policyMigration = read("supabase/migrations/20260813151000_finance_policy_activation.sql");
const sourceMigration = read("supabase/migrations/20260813151100_finance_compliance_source_verification.sql");

forbidText(page, "NEXT_PUBLIC_SUPABASE_ANON_KEY", "Finance UI does not authenticate the advisor with an anon key");
forbidText(page, "/rest/v1/transactions", "Finance UI does not write/read the ledger via raw REST");
forbidText(page, ".from(\"transactions\")", "Finance UI has no direct transactions table authority");
forbidText(page, ".delete()", "Finance UI exposes no destructive generic delete path");
requireText(page, "/api/finance/advisor", "Finance UI routes model analysis through the admin-gated server API");
requireText(page, "Finance OS v2", "Finance UI declares the v2 control plane");
requireText(page, "Approval records your decision only", "Finance UI states approval is not execution");

requireText(api, "requireAdmin", "Finance API is server-side admin gated");
requireText(api, "post_finance_transaction", "Finance API posts through the atomic ledger RPC");
requireText(api, "void_finance_transaction", "Finance API corrects ledger history with reversals");
forbidText(api, ".from('transactions').delete", "Finance API never hard-deletes transactions");
requireText(api, "mixedCurrencyWarning", "Finance API refuses silent multi-currency consolidation");

requireText(advisorApi, "buildAuthoritativeContext", "Finance Agent context is built server-side");
requireText(advisorApi, "input_snapshot_hash", "Finance Agent records an input snapshot hash");
requireText(advisorApi, "requires_human_approval: true", "Finance Agent recommendations are persisted as approval-required");
forbidText(advisorApi, "body.context", "Finance Agent API does not trust caller-supplied financial context");

requireText(advisorEdge, "claims?.role !== \"service_role\"", "Finance model function is internal service-role only");
requireText(advisorEdge, "verifiedComplianceSources", "Finance model receives only verified compliance sources as authority context");
requireText(advisorEdge, "Never calculate or estimate tax liability", "Finance model has a hard tax/residency epistemic boundary");
requireText(advisorEdge, "Never place trades", "Finance model has no autonomous investing/money-movement authority");
requireText(advisorEdge, "Return JSON only", "Finance model output is structured and machine-reviewable");

requireText(baseMigration, "REVOKE INSERT,UPDATE,DELETE ON public.transactions,public.transaction_entries", "Ledger direct authenticated writes are revoked");
requireText(baseMigration, "post_finance_transaction", "Atomic posting function is versioned");
requireText(baseMigration, "void_finance_transaction", "Reversal function is versioned");
requireText(baseMigration, "finance_cash_policies", "Treasury policy state is versioned in the database");
requireText(baseMigration, "finance_investment_policies", "Investment Policy Statement state is versioned in the database");
requireText(policyMigration, "allocation percentages must sum to 100", "Treasury policy activation enforces a complete allocation");
requireText(sourceMigration, "verification_status", "Compliance source evidence has explicit verification state");

if (failed) {
  console.error("\nFinance OS truth guard failed. Do not ship a finance change that bypasses ledger, evidence, policy, or approval authority.");
  process.exit(1);
}
console.log("\nFinance OS authority contract passed.");
