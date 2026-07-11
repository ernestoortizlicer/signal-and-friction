-- ── STRIPE PAYMENT LINKS SCHEMA DEFINITION ──

CREATE TABLE IF NOT EXISTS public.stripe_payment_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL,
    price_id TEXT NOT NULL UNIQUE,
    amount INT NOT NULL, -- Amount in cents
    payment_link_url TEXT NOT NULL,
    segment TEXT NOT NULL CHECK (segment IN ('high_ticket', 'microdosing', 'certified')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.stripe_payment_links ENABLE ROW LEVEL SECURITY;

-- Select policy: Allow anyone (anon, authenticated, service_role) to read payment links
CREATE POLICY "Allow select for all" ON public.stripe_payment_links
    FOR SELECT USING (true);

-- Rest of actions: Allow only service_role
CREATE POLICY "Allow all for service_role" ON public.stripe_payment_links
    FOR ALL TO service_role USING (true);

-- Seed mockup payment links for sandbox testing
INSERT INTO public.stripe_payment_links (product_name, price_id, amount, payment_link_url, segment)
VALUES 
    ('DFY Beta Diagnostic', 'price_dfy_beta_diagnostic', 200000, 'https://buy.stripe.com/mock_dfy_beta_diagnostic', 'high_ticket'),
    ('DFY Intervention', 'price_dfy_intervention', 300000, 'https://buy.stripe.com/mock_dfy_intervention', 'high_ticket'),
    ('DFY Monitoring (monthly)', 'price_dfy_monitoring', 250000, 'https://buy.stripe.com/mock_dfy_monitoring', 'high_ticket'),
    ('DFY Expansion', 'price_dfy_expansion', 200000, 'https://buy.stripe.com/mock_dfy_expansion', 'high_ticket'),
    ('DFY Autonomy Kit', 'price_dfy_autonomy', 500000, 'https://buy.stripe.com/mock_dfy_autonomy', 'high_ticket'),
    ('DWY Beta Diagnostic', 'price_dwy_beta_diagnostic', 35000, 'https://buy.stripe.com/mock_dwy_beta_diagnostic', 'microdosing'),
    ('DWY Intervention', 'price_dwy_intervention', 75000, 'https://buy.stripe.com/mock_dwy_intervention', 'microdosing'),
    ('DWY Monitoring (monthly)', 'price_dwy_monitoring', 50000, 'https://buy.stripe.com/mock_dwy_monitoring', 'microdosing'),
    ('DWY Expansion', 'price_dwy_expansion', 35000, 'https://buy.stripe.com/mock_dwy_expansion', 'microdosing'),
    ('DWY Autonomy Kit', 'price_dwy_autonomy', 150000, 'https://buy.stripe.com/mock_dwy_autonomy', 'microdosing'),
    ('Certified Practitioner', 'price_certified_practitioner', 250000, 'https://buy.stripe.com/mock_certified_practitioner', 'certified'),
    ('Certified Agency', 'price_certified_agency', 500000, 'https://buy.stripe.com/mock_certified_agency', 'certified')
-- DO NOTHING, not DO UPDATE: the live table has real buy.stripe.com URLs
-- for every row here (set directly, out of band, after this migration
-- first ran). If this migration is ever replayed — a fresh environment
-- sync, a migration-history mismatch, anything — it must not be able to
-- stomp real links back to these mock placeholders.
ON CONFLICT (price_id) DO NOTHING;
