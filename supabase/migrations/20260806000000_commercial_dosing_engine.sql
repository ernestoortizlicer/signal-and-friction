-- ════════════════════════════════════════════════════════════
-- MIGRATION: Commercial dosing engine — schema for Parts 1 & 3b
-- Migration ID: 20260806000000_commercial_dosing_engine
--
-- Three independent additions, none of which change existing behavior on
-- their own — nothing reads these columns yet until the dosing engine code
-- (Part 1) and the dormant PostHog integration (Part 3b) are built and
-- explicitly wired, in a separate approval step.
-- ════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. diagnostic_scaffolds: companion enums for deterministic DWY
--        teaser redaction, plus DFY post-hoc delivery content ──
--
-- The 3 enums exist ONLY to make teaser redaction deterministic and
-- AI-free — see generateTeaser() design. They are filled once, in the
-- same sitting as the 7 judgment fields, by the human, never inferred.
--
-- The 3 dfy_* fields are honestly separate from the 7 judgment fields:
-- they describe work that hasn't happened yet at scaffold-fill time, so
-- they start NULL and stay NULL until real delivery work is done. A DFY
-- deliverable renders a NULL dfy_execution_summary as a clearly-labeled
-- "not yet delivered" placeholder — never fabricated, never silently
-- blank.

ALTER TABLE public.diagnostic_scaffolds
  ADD COLUMN IF NOT EXISTS funnel_stage TEXT
    CHECK (funnel_stage IN ('landing', 'pricing', 'signup', 'checkout', 'activation')),
  ADD COLUMN IF NOT EXISTS projected_impact_magnitude TEXT
    CHECK (projected_impact_magnitude IN ('low', 'moderate', 'high')),
  ADD COLUMN IF NOT EXISTS confidence_level TEXT
    CHECK (confidence_level IN ('low', 'moderate', 'high')),
  ADD COLUMN IF NOT EXISTS dfy_execution_summary TEXT,
  ADD COLUMN IF NOT EXISTS dfy_monitoring_findings TEXT,
  ADD COLUMN IF NOT EXISTS dfy_handoff_documentation TEXT;

-- 1b. Review gate for Part 1's auto-dosing. A purchase never writes to
-- `deliverables` directly (that table has no draft state of its own —
-- the moment a row exists there, it's live-readable via the client's
-- capability token). The webhook only flags a scaffold as "a purchase
-- landed, here's the dosed content, waiting on your push" — status stays
-- 'draft', nothing client-facing changes until the existing manual
-- publish step is used.
ALTER TABLE public.diagnostic_scaffolds
  ADD COLUMN IF NOT EXISTS pending_dosing_line TEXT
    CHECK (pending_dosing_line IN ('dwy', 'dfy')),
  ADD COLUMN IF NOT EXISTS pending_dosing_tier TEXT
    CHECK (pending_dosing_tier IN ('beta_diagnostic', 'intervention', 'monitoring', 'expansion', 'autonomy_kit')),
  ADD COLUMN IF NOT EXISTS pending_dosing_triggered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dosed_preview JSONB;

-- ── 2. stripe_payment_links: reliable purchase → line/tier routing ──
--
-- Replaces the webhook's current fragile approach (string-matching on
-- the Stripe product's human-readable NAME via inferSegment()) with a
-- lookup keyed on Stripe's own stable price ID. stripe_price_id starts
-- NULL for all rows — this migration only adds the column; a human (you,
-- from the Stripe dashboard) or an updated create-stripe-products.mjs
-- run populates the real values. Until populated, the webhook's new
-- lookup simply finds nothing and the dosing engine doesn't fire —
-- fails closed, not into a wrong guess.
--
-- line/tier ARE backfilled here for the existing 10 DFY/DWY rows,
-- parsed from their already-known price_id slugs (e.g.
-- 'price_dwy_beta_diagnostic' -> line='dwy', tier='beta_diagnostic').
-- The 2 'certified' segment rows are deliberately left NULL/NULL — they
-- aren't part of this 5-tier ladder at all, and NULL passes both CHECK
-- constraints (Postgres CHECK only evaluates non-null values), so they
-- stay correctly excluded from ladder routing rather than needing a
-- third dummy enum value.

ALTER TABLE public.stripe_payment_links
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS line TEXT
    CHECK (line IN ('dwy', 'dfy')),
  ADD COLUMN IF NOT EXISTS tier TEXT
    CHECK (tier IN ('beta_diagnostic', 'intervention', 'monitoring', 'expansion', 'autonomy_kit'));

UPDATE public.stripe_payment_links AS spl
SET line = mapping.line, tier = mapping.tier
FROM (VALUES
  ('price_dfy_beta_diagnostic', 'dfy', 'beta_diagnostic'),
  ('price_dfy_intervention',    'dfy', 'intervention'),
  ('price_dfy_monitoring',      'dfy', 'monitoring'),
  ('price_dfy_expansion',       'dfy', 'expansion'),
  ('price_dfy_autonomy',        'dfy', 'autonomy_kit'),
  ('price_dwy_beta_diagnostic', 'dwy', 'beta_diagnostic'),
  ('price_dwy_intervention',    'dwy', 'intervention'),
  ('price_dwy_monitoring',      'dwy', 'monitoring'),
  ('price_dwy_expansion',       'dwy', 'expansion'),
  ('price_dwy_autonomy',        'dwy', 'autonomy_kit')
) AS mapping(price_id, line, tier)
WHERE spl.price_id = mapping.price_id;

-- ── 3. clients: dormant PostHog grant (Part 3b) — no access by default ──
--
-- All three columns NULL by default = no grant, no data flow, nothing to
-- upgrade. The dormant integration (built, not activated, per Part 3)
-- only ever reads real PostHog data for a client where
-- posthog_access_granted_at IS NOT NULL. There is no code path that
-- upgrades a field to "measured" without this being genuinely set by a
-- real grant.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS posthog_project_id TEXT,
  ADD COLUMN IF NOT EXISTS posthog_api_key TEXT,
  ADD COLUMN IF NOT EXISTS posthog_access_granted_at TIMESTAMPTZ;

-- Sanity check: confirm the enum columns exist and the 10-row backfill
-- landed correctly (should show 10 non-null line/tier rows, 2 null rows
-- for the certified-segment entries).
SELECT price_id, line, tier FROM public.stripe_payment_links ORDER BY price_id;

COMMIT;
