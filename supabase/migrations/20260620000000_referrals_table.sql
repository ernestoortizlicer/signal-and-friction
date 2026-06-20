-- ── REFERRAL LOYALTY PROGRAM — TABLE DEFINITION ──

CREATE TABLE IF NOT EXISTS public.referrals (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    ref_code        TEXT         NOT NULL,           -- Random refId from /confirmed widget
    referrer_email  TEXT,                            -- Email of referrer (if known)
    referred_email  TEXT,                            -- Email of referred client (from /confirmed/success)
    referred_product TEXT,                           -- Product they purchased
    status          TEXT         NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'credit_issued', 'expired')),
    stripe_coupon_id TEXT        DEFAULT 'SFREF500', -- Coupon to send the referrer
    notes           TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    credit_issued_at TIMESTAMPTZ
);

-- Prevent duplicate referrals for the same ref_code + referred_email pair
CREATE UNIQUE INDEX IF NOT EXISTS referrals_ref_email_unique
    ON public.referrals (ref_code, referred_email)
    WHERE referred_email IS NOT NULL;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Anyone (anon) can INSERT — the /confirmed/success page records referrals
CREATE POLICY "Allow insert anon" ON public.referrals
    FOR INSERT WITH CHECK (true);

-- Authenticated admins can read and update
CREATE POLICY "Allow select authenticated" ON public.referrals
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow update authenticated" ON public.referrals
    FOR UPDATE TO authenticated USING (true);

-- Service role has full access
CREATE POLICY "Allow all service_role" ON public.referrals
    FOR ALL TO service_role USING (true);
