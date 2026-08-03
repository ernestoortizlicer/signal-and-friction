# Production Runbook — Signal & Friction

**Last regenerated:** 2026-08-11, as part of Phase 6.0 (Production Activation Pack).
This document describes the *current* system. If it drifts from reality, regenerate it — don't hand-edit it out of sync with the code.

Everything in this runbook was verified against the repository directly (grep, git history, actual test execution) at the time of writing. Nothing here is asserted from memory. Steps requiring dashboard/CLI access this environment does not have (Supabase SQL execution, Supabase Edge Function deploy, a real browser) are marked **OWNER ACTION** and were not performed by the agent that wrote this document — see the accompanying chat report for the exact reason each one couldn't be done here.

---

## 1. SQL migrations — **OWNER ACTION**, exact order

Two migrations are pending, additive-only, no destructive risk. Run in this order:

**1a.** `supabase/migrations/20260803000000_scaffold_reasoning_links.sql`
```sql
ALTER TABLE public.diagnostic_scaffolds
  ADD COLUMN IF NOT EXISTS reasoning_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS unknowns TEXT;
```

**1b.** `supabase/migrations/20260809000000_prospect_candidates_contact_discovery.sql`
```sql
ALTER TABLE public.prospect_candidates
  ADD COLUMN IF NOT EXISTS contact_discovery JSONB;
```

## 2. SQL verification — **OWNER ACTION**, required after each migration

Run immediately after 1a:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'diagnostic_scaffolds'
  AND column_name IN ('reasoning_links', 'unknowns')
ORDER BY column_name;
```
**Expected:** exactly 2 rows (`reasoning_links` type `jsonb`, `unknowns` type `text`).
**Failure state:** 0 or 1 rows returned. A migration reporting no visible error is *not* proof the columns exist — this codebase has a documented prior incident of exactly that (`20260808000000_reconcile_diagnostic_scaffolds_dosing_columns.sql`'s own header). If this query doesn't return 2 rows, do not proceed — the migration did not actually apply, re-run it and re-check before touching anything downstream.

Run immediately after 1b:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'prospect_candidates'
  AND column_name = 'contact_discovery';
```
**Expected:** exactly 1 row, type `jsonb`.
**Failure state:** 0 rows — same rule as above, do not proceed.

## 3. Secrets and environment checks — **OWNER ACTION**

See the regenerated `.env.example` (same commit as this file) for the full, classified inventory across all four credential stores. Before deploying:

- [ ] Confirm `TAVILY_API_KEY` is actually set in Supabase Edge Function secrets — it is a real, load-bearing dependency of both `prospecting-suggest-leads` and `prospecting-discover-contact`, and was **missing from the previous version of `.env.example`**, so there's a real chance it was never explicitly verified.
- [ ] Confirm the Supabase Vault secret behind `get_anthropic_key()` is independently live — it is a *separate* store from the Edge Function secret of the same name, with no automatic sync.
- [ ] Confirm `NEXT_PUBLIC_ALLOWED_ADMIN_EMAIL` is explicitly set in Cloudflare Pages' build-time env — if unset, the admin UI's client-side email allowlist silently falls back to two hardcoded addresses baked into `src/app/admin/layout.tsx` and `src/components/PostHogProvider.tsx`. This is a UI convenience gate only (not the real security boundary — that's the server-side `ADMIN_EMAILS` in Cloudflare Functions secrets), but the fallback should not be the one actually in effect in production.

## 4. Edge Function deployment — **OWNER ACTION**

Checked precisely against git history for this session's work (not assumed):

- **`prospecting-discover-contact`** — brand new this session, has never been deployed. **Requires a first-time deploy.**
  ```
  supabase functions deploy prospecting-discover-contact
  ```
- **`_shared/reasoning/*.ts`** — changed this session, but confirmed via direct grep that **no currently-existing Edge Function imports these files**. They exist for future use. No redeploy is triggered by this change; nothing to do today, but note it for whenever a function first starts importing them.
- **`_shared/dosing.ts`** — confirmed via `git show --stat` on every Phase 4 commit that this file was **not touched** this session (all Phase 4.0–4.4 work lived in the Next.js-only, non-mirrored section of `src/lib/dosing.ts`). No redeploy needed for this reason.
- **`prospecting-suggest-leads`** — updated during Phase 6.1 (identity migration): one word changed in its synthesis system prompt ("conversion/friction diagnostics" -> "behavioral conversion diagnostics"), purely a self-description consistency fix, no behavior change. **Now also needs redeploy**, in addition to `prospecting-discover-contact` above:
  ```
  supabase functions deploy prospecting-suggest-leads
  ```
- All other Edge Functions (`certification-onboarding`, `finance-advisor-prompt`, `learning-socratic-tutor`, `outreach-scanner`, `stripe-invoice`, `stripe-refund`) — **unchanged this session**, no redeploy required.

This CLI (`supabase` v2.107.0) is installed in the build environment but **not authenticated** — deploys must be run from a machine with `supabase login` completed or `SUPABASE_ACCESS_TOKEN` set.

## 5. Git push

The 8 unpushed commits are already in correct dependency order on `main`. A single push ships all of them in order — no reordering needed:
```
17caac8 → a3a2e3e → 391aab6 → 27ca553 → 3770812 → 0506352 → ad8f423 → 625a294 → 0afc924
```
Do this only **after** steps 1–4 above are complete and verified. Pushing before the migrations are applied doesn't break the build (no build-time DB dependency) — it will just make the reasoning-panel and contact-discovery admin features error at runtime until the migrations catch up.

## 6. Cloudflare deployment verification

Cloudflare Pages auto-deploys on push to `main` (confirmed empirically earlier this session). After pushing:
- [ ] Confirm the deploy shows green in the Cloudflare Pages dashboard.
- [ ] Confirm build logs show no errors (mirrors the local `npm run build` output already verified clean in this session).

## 7. Browser smoke tests — **OWNER ACTION** (this environment has no browser)

1. Open an existing scaffold, confirm the five reasoning layers render in order and mechanism candidates show no evidence-strength badge before evaluation.
2. Attach a hypothesis, confirm it requires a rationale; revise it, confirm it updates in place rather than duplicating.
3. Run "Challenge this reasoning," confirm it returns critique without persisting or attaching anything.
4. Run "Discover Contact" on a prospect, confirm people/LinkedIn/email results show provenance and status, source links work, and no-result states read differently from provider/configuration errors.
5. Publish one real DWY deliverable and one real DFY deliverable; confirm the new service-aware modules render in the right place for that tier.
6. Load a historical deliverable URL (e.g. `/deliverable/acme-corp`) and confirm it renders exactly as before — no new sections appear.
7. Confirm Save Draft and the legacy manual-publish path still work unchanged.

## 8. Rollback

All schema changes this session are additive-only (`ADD COLUMN IF NOT EXISTS`) — there is no destructive migration to roll back. Every new client-facing rendering path is presence/policy-gated and falls back to unchanged legacy behavior when its new fields are absent, so a partial rollback of code without a DB rollback is safe. If a Cloudflare deploy needs reverting, use Cloudflare Pages' own deployment history for an instant revert — independent of DB state. Edge Function rollback: redeploy the previous version of the function from git history via the same `supabase functions deploy` command.

## 9. Post-deploy validation

Re-run the automated suite against the deployed state where applicable (the Node-based tests are local-only and don't need re-running post-deploy unless code changed again). Confirm via the Supabase dashboard that both new columns are visible in the table editor. Confirm one real end-to-end publish (§7.5) before considering any given service line live for real client acquisition.

---

## Automated test status (this session, this environment)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ clean |
| `npx eslint .` (full project) | 3 pre-existing errors, 12 warnings — **none in files touched this session** (verified via git diff) |
| `npm run build` | ✅ clean (see accompanying chat report for this run's output) |
| `node scripts/check-domain-drift.mjs` | ✅ no drift |
| `node scratch/verify-registry.mjs` | ✅ 21/21 mechanisms structurally complete |
| `node src/lib/dosing.publish.test.mjs` | ✅ 14/14 |
| `node src/lib/hypothesis-translation.test.mjs` | ✅ 16/16 |
| `node src/lib/delivery-policy.test.mjs` | ✅ 69/69 |
| `deno test supabase/functions/_shared/dosing.test.ts` | **not run — no `deno` binary in this environment.** Run this exact command on a machine with Deno installed before relying on it. |
| `deno test supabase/functions/prospecting-discover-contact/index.test.ts` | **not run — same reason.** Run with `deno test --allow-net --allow-env supabase/functions/prospecting-discover-contact/index.test.ts` (needs env/net permissions since it exercises real `Deno.env.get` calls and mocked `fetch`). |
