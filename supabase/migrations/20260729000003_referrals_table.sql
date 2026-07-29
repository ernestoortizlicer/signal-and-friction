-- ════════════════════════════════════════════════════════════
-- MIGRATION: REFERRALS TABLE (fresh — proportional credit, correct RLS)
-- Migration ID: 20260729000003_referrals_table
--
-- Replaces two prior migrations for this table, both deleted:
--   - 20260620000000_referrals_table.sql — defined the table with a flat
--     $500 default coupon and an anon-INSERT policy, but per direct
--     inspection of pg_policies / the public schema on 2026-07-29, this
--     never actually ran against the live database. No table, no
--     policies — the drift was real, not just a stale doc.
--   - 20260729000002_referral_proportional_credit.sql — an ALTER TABLE
--     meant to patch that table onto the proportional-credit model. It
--     would fail outright on this database, since the table it ALTERs
--     never existed to begin with.
-- Since neither file ever executed anywhere, deleting them destroys no
-- applied state — unlike the documented set_updated_at trigger drift
-- elsewhere in this repo, which reflects a migration that DID run and
-- must be preserved as history. This is the opposite case: nothing to
-- preserve, and leaving both stale files in place would have silently
-- diverged fresh-install behavior from this live database's behavior
-- (a fresh install replaying 000000 then 000002 ends up with the old
-- anon-INSERT policy still present; this database does not).
--
-- Design here, in one CREATE:
--   - referred_amount_cents / credit_owed_cents built in from the start
--     (20% of the referred purchase — see src/lib/referral-credit.ts /
--     functions/api/_referral-credit.ts). No flat-amount column or
--     default anywhere.
--   - stripe_coupon_id is nullable, no default — filled in by hand only
--     when an admin actually issues a one-off coupon sized to
--     credit_owed_cents.
--   - RLS: authenticated-only (admin) + service_role, matching this
--     app's established pattern (prospect_candidates, diagnostic_scaffolds).
--     NO anon policy of any kind — the only prior writer of this table
--     was a client-side anon insert on src/app/confirmed/success/page.tsx,
--     already removed. functions/api/stripe/webhook.ts, the sole writer
--     now, uses SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS regardless
--     of policy.
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.referrals (
    id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ref_code               TEXT        NOT NULL,
    referrer_email         TEXT,
    referred_email         TEXT,
    referred_product       TEXT,
    referred_amount_cents  INT,
    credit_owed_cents      INT,
    status                 TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'credit_issued', 'expired')),
    stripe_coupon_id       TEXT,
    notes                  TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    credit_issued_at       TIMESTAMPTZ
);

-- Prevent duplicate referral rows for the same ref_code + referred_email pair
-- (the webhook looks this pair up before deciding insert vs. update).
CREATE UNIQUE INDEX IF NOT EXISTS referrals_ref_email_unique
    ON public.referrals (ref_code, referred_email)
    WHERE referred_email IS NOT NULL;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all_referrals ON public.referrals
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- service_role bypasses RLS entirely regardless of policy, but an explicit
-- grant keeps this table's policy set self-documenting in pg_policies
-- instead of relying on that implicit bypass, matching how this app treats
-- every other service-role-written table.
CREATE POLICY service_role_all_referrals ON public.referrals
    FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON COLUMN public.referrals.referred_amount_cents IS
    'Amount actually paid by the referred person (Stripe session.amount_total), in cents.';
COMMENT ON COLUMN public.referrals.credit_owed_cents IS
    'REFERRAL_CREDIT_RATE (20%) of referred_amount_cents — see src/lib/referral-credit.ts. Never a flat amount.';
COMMENT ON COLUMN public.referrals.stripe_coupon_id IS
    'One-off Stripe Coupon ID created manually by the admin when the credit is actually issued, sized to credit_owed_cents. NULL until issued.';
