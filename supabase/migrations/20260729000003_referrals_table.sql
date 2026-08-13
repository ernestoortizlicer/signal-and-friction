CREATE TABLE IF NOT EXISTS public.referral_codes (
    code TEXT PRIMARY KEY CHECK (code ~ '^[A-Z0-9]{8,12}$'),
    referrer_email TEXT NOT NULL,
    referrer_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    referrer_stripe_customer_id TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS referral_codes_referrer_email_unique
    ON public.referral_codes (lower(referrer_email));

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ref_code TEXT NOT NULL REFERENCES public.referral_codes(code),
    referrer_email TEXT NOT NULL,
    referred_email TEXT NOT NULL,
    referred_product TEXT,
    referred_amount_cents INT NOT NULL CHECK (referred_amount_cents >= 0),
    qualifying_amount_cents INT NOT NULL CHECK (qualifying_amount_cents >= 0),
    credit_owed_cents INT NOT NULL CHECK (credit_owed_cents >= 0),
    qualifying_minimum_cents INT NOT NULL DEFAULT 100000,
    credit_cap_cents INT NOT NULL DEFAULT 100000,
    source_stripe_session_id TEXT NOT NULL UNIQUE,
    source_stripe_payment_intent TEXT,
    source_stripe_customer_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','credit_issued','redeemed','expired','revoked')),
    stripe_coupon_id TEXT,
    notes TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    credit_issued_at TIMESTAMPTZ,
    redeemed_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS referrals_ref_email_unique
    ON public.referrals (ref_code, lower(referred_email));
CREATE INDEX IF NOT EXISTS referrals_payment_intent_idx
    ON public.referrals (source_stripe_payment_intent)
    WHERE source_stripe_payment_intent IS NOT NULL;
CREATE INDEX IF NOT EXISTS referrals_status_expires_idx
    ON public.referrals (status, expires_at);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
