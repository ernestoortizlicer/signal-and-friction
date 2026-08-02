-- ════════════════════════════════════════════════════════════
-- MIGRATION: Correct stripe_payment_links to match real Stripe state
-- Migration ID: 20260807000000_fix_stripe_payment_links_ids
--
-- Stripe is the source of truth — it's what a customer actually pays.
-- The backfill script (backfill-stripe-price-ids.mjs) matched 6/12 rows
-- by exact name+amount; these 4 didn't match:
--   - dwy/dfy monitoring: name-suffix drift only, price already correct
--     — pure ID backfill, no amount change.
--   - dwy/dfy expansion: price was manually edited in Stripe after
--     creation ($350 -> $500 DWY, $350 -> $2500 DFY) — the DB's amount
--     column is stale. Corrected here so the ID and the amount both
--     reflect reality, not just the ID.
-- The 2 'certified' rows are archived (not part of the active 5-tier
-- ladder) and only existed here as backfill noise — removed entirely.
-- ════════════════════════════════════════════════════════════

BEGIN;

-- a) Monitoring — pure ID backfill, price already matched
UPDATE public.stripe_payment_links
SET stripe_price_id = 'price_1Tk847Hv7TExyozUD2Lo03I4'
WHERE price_id = 'price_dwy_monitoring';

UPDATE public.stripe_payment_links
SET stripe_price_id = 'price_1Tk843Hv7TExyozUp542tabp'
WHERE price_id = 'price_dfy_monitoring';

-- b) Expansion — real ID + corrected amount (DB was stale, not Stripe)
UPDATE public.stripe_payment_links
SET stripe_price_id = 'price_1TyZ5IHv7TExyozUbYL6e7jv',
    amount = 50000  -- $500.00
WHERE price_id = 'price_dwy_expansion';

UPDATE public.stripe_payment_links
SET stripe_price_id = 'price_1TyZ99Hv7TExyozUNX1uHrUR',
    amount = 250000  -- $2,500.00
WHERE price_id = 'price_dfy_expansion';

-- c) Certified rows — archived, not part of the active ladder, remove
-- entirely rather than leave as permanent backfill noise.
DELETE FROM public.stripe_payment_links
WHERE price_id IN ('price_certified_agency', 'price_certified_practitioner');

-- Sanity check: should show exactly 10 rows, all with a non-null
-- stripe_price_id, and the expansion amounts should read 50000/250000.
SELECT price_id, product_name, amount, stripe_price_id, line, tier
FROM public.stripe_payment_links
ORDER BY line, tier;

COMMIT;
