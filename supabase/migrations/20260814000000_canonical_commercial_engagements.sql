-- ═════════════════════════════════════════════════════════════════════════════
-- CANONICAL COMMERCIAL ENGAGEMENTS
-- Migration ID: 20260814000000_canonical_commercial_engagements
--
-- This migration establishes a fail-closed commercial aggregate. A Stripe
-- object is never an entitlement by itself: an immutable engagement must exist
-- first, have exactly one analyst, and carry the canonical offer and real
-- intake facts that the verified webhook later proves again.
--
-- The historical public.payments rows are copied verbatim into an explicit
-- reconciliation queue and are never guessed into a current engagement or
-- transaction. New canonical payments are projected back only for the legacy
-- admin read model; that projection is never commercial truth.
-- ═════════════════════════════════════════════════════════════════════════════

BEGIN;

-- The tracked payments migration explicitly records that its live types and
-- nullability were not verified. This compatibility boundary must therefore
-- prove every legacy column it reads or writes before making any DDL change.
DO $$
DECLARE
  v_shape_issues TEXT;
  v_blocking_extra_columns TEXT;
BEGIN
  WITH expected(column_name, udt_name, is_nullable, needs_default) AS (
    VALUES
      ('id',                        'uuid',        'NO',  true),
      ('stripe_session_id',         'text',        'NO',  false),
      ('stripe_customer_id',        'text',        'YES', false),
      ('stripe_payment_intent',     'text',        'YES', false),
      ('email',                     'text',        'YES', false),
      ('amount_total',              'int4',        'YES', false),
      ('currency',                  'text',        'YES', false),
      ('product_name',              'text',        'YES', false),
      ('segment',                   'text',        'YES', false),
      ('referral_code',             'text',        'YES', false),
      ('raw_event',                 'jsonb',       'YES', false),
      ('lead_id',                   'uuid',        'YES', false),
      ('created_at',                'timestamptz', 'NO',  true)
  )
  SELECT string_agg(
    format(
      '%s expected %s/%s%s, found %s',
      expected.column_name,
      expected.udt_name,
      expected.is_nullable,
      CASE WHEN expected.needs_default THEN ' with default' ELSE '' END,
      coalesce(
        actual.udt_name || '/' || actual.is_nullable
          || CASE WHEN actual.column_default IS NOT NULL THEN ' with default' ELSE '' END,
        'missing'
      )
    ),
    '; ' ORDER BY expected.column_name
  ) INTO v_shape_issues
  FROM expected
  LEFT JOIN information_schema.columns AS actual
    ON actual.table_schema = 'public'
   AND actual.table_name = 'payments'
   AND actual.column_name = expected.column_name
  WHERE actual.column_name IS NULL
     OR actual.udt_name IS DISTINCT FROM expected.udt_name
     OR actual.is_nullable IS DISTINCT FROM expected.is_nullable
     OR (expected.needs_default AND actual.column_default IS NULL);

  SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
  INTO v_blocking_extra_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'payments'
    AND column_name NOT IN (
      'id', 'stripe_session_id', 'stripe_customer_id',
      'stripe_payment_intent', 'email', 'amount_total', 'currency',
      'product_name', 'segment', 'referral_code', 'raw_event',
      'lead_id', 'created_at'
    )
    AND is_nullable = 'NO'
    AND column_default IS NULL
    AND is_identity = 'NO'
    AND is_generated = 'NEVER';

  IF v_shape_issues IS NOT NULL OR v_blocking_extra_columns IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = format(
        'public.payments schema preflight failed: %s%s. Inspect information_schema.columns and explicitly reconcile the live payments read model before retrying migration 20260814000000.',
        coalesce(v_shape_issues, 'documented columns match'),
        CASE
          WHEN v_blocking_extra_columns IS NULL THEN ''
          ELSE '; extra required columns without defaults: ' || v_blocking_extra_columns
        END
      );
  END IF;
END;
$$;

-- ── 1. Harden the provider binding table ─────────────────────────────────────

ALTER TABLE public.stripe_payment_links
  ALTER COLUMN payment_link_url DROP NOT NULL,
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN is_public_entry BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN billing_interval TEXT,
  ADD COLUMN currency TEXT,
  ADD COLUMN service_scope TEXT,
  ADD COLUMN stripe_payment_link_id TEXT,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Canonical bindings are explicit. A row without a real immutable Stripe Price
-- remains inactive, including on a fresh database where out-of-band production
-- IDs have not been reconciled yet.
UPDATE public.stripe_payment_links AS spl
SET
  amount = canonical.amount,
  line = canonical.line,
  tier = canonical.tier,
  billing_interval = canonical.billing_interval,
  currency = 'usd',
  service_scope = canonical.service_scope,
  is_active = (spl.stripe_price_id IS NOT NULL),
  -- Release remains fail-closed until activate_commercial_checkout verifies
  -- the complete provider catalog and analyst registry after code cutover.
  is_public_entry = false,
  payment_link_url = CASE canonical.price_id
    WHEN 'price_dwy_beta_diagnostic' THEN '/checkout/price_dwy_beta_diagnostic'
    WHEN 'price_dfy_beta_diagnostic' THEN '/checkout/price_dfy_beta_diagnostic'
    ELSE NULL
  END,
  updated_at = now()
FROM (VALUES
  ('price_dwy_beta_diagnostic', 'dwy', 'beta_diagnostic',  35000, 'one_time', 'Full diagnosis of ONE dominant friction: evidence tiered measured/modeled/pending, why it blocks conversion, and the recommended decision. Delivered as a web page plus a short Loom walkthrough.'),
  ('price_dwy_intervention',    'dwy', 'intervention',     75000, 'one_time', 'Step-by-step implementation plan for the diagnosed fix, guiding the founder to execute it themselves, with expected before/after.'),
  ('price_dwy_monitoring',      'dwy', 'monitoring',       50000, 'monthly',  'Monthly: measure the fix''s effect, report signal movement, and surface the next friction point.'),
  ('price_dwy_expansion',       'dwy', 'expansion',        50000, 'one_time', 'The diagnostic repeated on another funnel area.'),
  ('price_dwy_autonomy',        'dwy', 'autonomy_kit',    150000, 'one_time', 'The method packaged — framework, checklist, and templates — so the founder can run future diagnostics solo.'),
  ('price_dfy_beta_diagnostic', 'dfy', 'beta_diagnostic', 200000, 'one_time', 'Full diagnosis of ONE dominant friction: evidence tiered measured/modeled/pending, why it blocks conversion, and the recommended decision. Delivered as a web page plus a short Loom walkthrough.'),
  ('price_dfy_intervention',    'dfy', 'intervention',    300000, 'one_time', 'S&F implements the diagnosed fix directly, with measured before/after.'),
  ('price_dfy_monitoring',      'dfy', 'monitoring',      250000, 'monthly',  'Monthly: measure the fix''s effect, report signal movement, and surface the next friction point.'),
  ('price_dfy_expansion',       'dfy', 'expansion',       250000, 'one_time', 'The diagnostic repeated on another funnel area, with S&F implementing the fix directly.'),
  ('price_dfy_autonomy',        'dfy', 'autonomy_kit',    500000, 'one_time', 'The method packaged — framework, checklist, and templates — handed to your team to run future diagnostics in-house.')
) AS canonical(price_id, line, tier, amount, billing_interval, service_scope)
WHERE spl.price_id = canonical.price_id;

-- Any historical or unknown row is fail-closed. This deliberately includes a
-- Certified row if migration/live-state drift caused it to survive archival.
UPDATE public.stripe_payment_links
SET is_active = false,
    is_public_entry = false,
    payment_link_url = NULL,
    updated_at = now()
WHERE price_id NOT IN (
  'price_dwy_beta_diagnostic', 'price_dwy_intervention',
  'price_dwy_monitoring', 'price_dwy_expansion', 'price_dwy_autonomy',
  'price_dfy_beta_diagnostic', 'price_dfy_intervention',
  'price_dfy_monitoring', 'price_dfy_expansion', 'price_dfy_autonomy'
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.stripe_payment_links
    WHERE stripe_price_id IS NOT NULL
    GROUP BY stripe_price_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = 'Duplicate stripe_payment_links.stripe_price_id values require explicit reconciliation';
  END IF;
END;
$$;

CREATE UNIQUE INDEX uq_stripe_payment_links_provider_price
  ON public.stripe_payment_links (stripe_price_id)
  WHERE stripe_price_id IS NOT NULL;

CREATE UNIQUE INDEX uq_stripe_payment_links_provider_link
  ON public.stripe_payment_links (stripe_payment_link_id)
  WHERE stripe_payment_link_id IS NOT NULL;

ALTER TABLE public.stripe_payment_links
  DROP CONSTRAINT IF EXISTS stripe_payment_links_positive_amount,
  DROP CONSTRAINT IF EXISTS stripe_payment_links_provider_price_shape,
  DROP CONSTRAINT IF EXISTS stripe_payment_links_provider_link_shape,
  DROP CONSTRAINT IF EXISTS stripe_payment_links_currency_shape,
  DROP CONSTRAINT IF EXISTS stripe_payment_links_billing_shape,
  DROP CONSTRAINT IF EXISTS stripe_payment_links_active_provider_ready,
  DROP CONSTRAINT IF EXISTS stripe_payment_links_public_entry_shape,
  DROP CONSTRAINT IF EXISTS stripe_payment_links_active_catalog;

ALTER TABLE public.stripe_payment_links
  ADD CONSTRAINT stripe_payment_links_positive_amount
    CHECK (amount > 0),
  ADD CONSTRAINT stripe_payment_links_provider_price_shape
    CHECK (stripe_price_id IS NULL OR stripe_price_id ~ '^price_[A-Za-z0-9]+$'),
  ADD CONSTRAINT stripe_payment_links_provider_link_shape
    CHECK (stripe_payment_link_id IS NULL OR stripe_payment_link_id ~ '^plink_[A-Za-z0-9]+$'),
  ADD CONSTRAINT stripe_payment_links_currency_shape
    CHECK (currency IS NULL OR currency ~ '^[a-z]{3}$'),
  ADD CONSTRAINT stripe_payment_links_billing_shape
    CHECK (billing_interval IS NULL OR billing_interval IN ('one_time', 'monthly')),
  ADD CONSTRAINT stripe_payment_links_active_provider_ready
    CHECK (
      NOT is_active OR (
        stripe_price_id IS NOT NULL
        AND line IS NOT NULL
        AND line IN ('dwy', 'dfy')
        AND tier IS NOT NULL
        AND tier IN ('beta_diagnostic', 'intervention', 'monitoring', 'expansion', 'autonomy_kit')
        AND billing_interval IS NOT NULL
        AND billing_interval IN ('one_time', 'monthly')
        AND currency IS NOT NULL
        AND currency = 'usd'
        AND service_scope IS NOT NULL
        AND btrim(service_scope) <> ''
      )
    ),
  ADD CONSTRAINT stripe_payment_links_public_entry_shape
    CHECK (
      NOT is_public_entry OR (
        is_active
        AND price_id IN ('price_dwy_beta_diagnostic', 'price_dfy_beta_diagnostic')
        AND tier = 'beta_diagnostic'
        AND payment_link_url = '/checkout/' || price_id
      )
    ),
  ADD CONSTRAINT stripe_payment_links_active_catalog
    CHECK (
      NOT is_active OR (price_id, line, tier, amount, billing_interval) IN (
        ('price_dwy_beta_diagnostic', 'dwy', 'beta_diagnostic',  35000, 'one_time'),
        ('price_dwy_intervention',    'dwy', 'intervention',     75000, 'one_time'),
        ('price_dwy_monitoring',      'dwy', 'monitoring',       50000, 'monthly'),
        ('price_dwy_expansion',       'dwy', 'expansion',        50000, 'one_time'),
        ('price_dwy_autonomy',        'dwy', 'autonomy_kit',    150000, 'one_time'),
        ('price_dfy_beta_diagnostic', 'dfy', 'beta_diagnostic', 200000, 'one_time'),
        ('price_dfy_intervention',    'dfy', 'intervention',    300000, 'one_time'),
        ('price_dfy_monitoring',      'dfy', 'monitoring',      250000, 'monthly'),
        ('price_dfy_expansion',       'dfy', 'expansion',       250000, 'one_time'),
        ('price_dfy_autonomy',        'dfy', 'autonomy_kit',    500000, 'one_time')
      )
    );

ALTER TABLE public.stripe_payment_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for all" ON public.stripe_payment_links;
DROP POLICY IF EXISTS "Allow all for service_role" ON public.stripe_payment_links;
DROP POLICY IF EXISTS commercial_public_diagnostic_links ON public.stripe_payment_links;
DROP POLICY IF EXISTS commercial_service_payment_links ON public.stripe_payment_links;

-- Production policy names have drifted before. Remove every remaining policy
-- so an out-of-band permissive rule cannot OR around the two-row release gate.
DO $$
DECLARE
  v_policy RECORD;
BEGIN
  FOR v_policy IN
    SELECT policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'stripe_payment_links'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.stripe_payment_links', v_policy.policyname);
  END LOOP;
END;
$$;

CREATE POLICY commercial_public_diagnostic_links
  ON public.stripe_payment_links
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active
    AND is_public_entry
    AND (
      (price_id = 'price_dwy_beta_diagnostic'
       AND payment_link_url = '/checkout/price_dwy_beta_diagnostic')
      OR
      (price_id = 'price_dfy_beta_diagnostic'
       AND payment_link_url = '/checkout/price_dfy_beta_diagnostic')
    )
  );

CREATE POLICY commercial_service_payment_links
  ON public.stripe_payment_links
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.stripe_payment_links FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.stripe_payment_links TO anon, authenticated;
GRANT ALL ON TABLE public.stripe_payment_links TO service_role;

-- ── 2. Canonical commercial aggregate ────────────────────────────────────────

CREATE TABLE public.commercial_analysts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,
  display_name TEXT NOT NULL CHECK (btrim(display_name) <> ''),
  notification_email TEXT NOT NULL
    CHECK (notification_email = lower(btrim(notification_email)) AND position('@' IN notification_email) > 1),
  is_active BOOLEAN NOT NULL DEFAULT true,
  accepts_new_engagements BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT commercial_analyst_default_available CHECK (
    NOT is_default OR (is_active AND accepts_new_engagements)
  )
);

CREATE UNIQUE INDEX uq_commercial_analysts_single_default
  ON public.commercial_analysts (is_default)
  WHERE is_default;

CREATE TABLE public.commercial_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_key UUID NOT NULL UNIQUE,

  -- Immutable canonical offer snapshot.
  catalog_version TEXT NOT NULL CHECK (catalog_version = '2026-08-14'),
  offer_price_id TEXT NOT NULL,
  offer_name TEXT NOT NULL CHECK (btrim(offer_name) <> ''),
  offer_scope TEXT NOT NULL CHECK (btrim(offer_scope) <> ''),
  offer_line TEXT NOT NULL CHECK (offer_line IN ('dwy', 'dfy')),
  offer_tier TEXT NOT NULL
    CHECK (offer_tier IN ('beta_diagnostic', 'intervention', 'monitoring', 'expansion', 'autonomy_kit')),
  offer_phase TEXT NOT NULL
    CHECK (offer_phase IN ('diagnostic', 'intervention', 'monitoring', 'expansion', 'autonomy')),
  phase_order SMALLINT NOT NULL CHECK (phase_order BETWEEN 1 AND 5),
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL CHECK (currency ~ '^[a-z]{3}$'),
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('one_time', 'monthly')),
  stripe_price_id TEXT NOT NULL CHECK (stripe_price_id ~ '^price_[A-Za-z0-9]+$'),

  -- Durable ownership and lifecycle authorization.
  authorization_kind TEXT NOT NULL
    CHECK (authorization_kind IN ('public_diagnostic', 'operator_lifecycle')),
  client_id UUID REFERENCES public.clients(id) ON DELETE RESTRICT,
  predecessor_engagement_id UUID REFERENCES public.commercial_engagements(id) ON DELETE RESTRICT DEFERRABLE INITIALLY IMMEDIATE,
  assigned_analyst_id UUID NOT NULL REFERENCES public.commercial_analysts(id) ON DELETE RESTRICT,
  authorized_by_analyst_id UUID REFERENCES public.commercial_analysts(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Real, user/operator-supplied intake; no hostname/email-derived placeholders.
  intake_company_name TEXT NOT NULL CHECK (btrim(intake_company_name) <> ''),
  intake_contact_name TEXT NOT NULL CHECK (btrim(intake_contact_name) <> ''),
  intake_email TEXT NOT NULL
    CHECK (intake_email = lower(btrim(intake_email)) AND position('@' IN intake_email) > 1),
  intake_industry TEXT NOT NULL CHECK (btrim(intake_industry) <> ''),
  target_url TEXT NOT NULL CHECK (target_url ~ '^https://[^[:space:]]+$'),
  scope_brief TEXT NOT NULL CHECK (btrim(scope_brief) <> ''),
  intake_submitted_at TIMESTAMPTZ NOT NULL,

  -- Payment and delivery are deliberately orthogonal.
  billing_state TEXT NOT NULL DEFAULT 'checkout_pending'
    CHECK (billing_state IN (
      'checkout_pending', 'payment_pending', 'paid', 'payment_failed',
      'past_due', 'refund_pending', 'refunded', 'disputed',
      'cancelled', 'needs_review'
    )),
  delivery_state TEXT NOT NULL DEFAULT 'blocked'
    CHECK (delivery_state IN (
      'blocked', 'ready', 'in_progress', 'active', 'paused',
      'delivered', 'cancelled', 'needs_review'
    )),
  state_reason TEXT,

  stripe_checkout_session_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  checkout_session_attached_at TIMESTAMPTZ,
  checkout_expires_at TIMESTAMPTZ,
  checkout_cancelled_at TIMESTAMPTZ,
  checkout_cancellation_reason TEXT,
  paid_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,

  -- Exact fulfillment anchors; populated by the later delivery boundary.
  scaffold_id UUID REFERENCES public.diagnostic_scaffolds(id) ON DELETE RESTRICT,
  deliverable_key TEXT,
  first_delivery_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT commercial_engagement_offer_phase_map CHECK (
    (offer_tier = 'beta_diagnostic' AND offer_phase = 'diagnostic' AND phase_order = 1 AND billing_interval = 'one_time') OR
    (offer_tier = 'intervention'    AND offer_phase = 'intervention' AND phase_order = 2 AND billing_interval = 'one_time') OR
    (offer_tier = 'monitoring'      AND offer_phase = 'monitoring' AND phase_order = 3 AND billing_interval = 'monthly') OR
    (offer_tier = 'expansion'       AND offer_phase = 'expansion' AND phase_order = 4 AND billing_interval = 'one_time') OR
    (offer_tier = 'autonomy_kit'    AND offer_phase = 'autonomy' AND phase_order = 5 AND billing_interval = 'one_time')
  ),
  CONSTRAINT commercial_engagement_authorization_shape CHECK (
    (
      authorization_kind = 'public_diagnostic'
      AND phase_order = 1
      AND predecessor_engagement_id IS NULL
      AND authorized_by_analyst_id IS NULL
    ) OR (
      authorization_kind = 'operator_lifecycle'
      AND phase_order BETWEEN 2 AND 5
      AND client_id IS NOT NULL
      AND predecessor_engagement_id IS NOT NULL
      AND authorized_by_analyst_id IS NOT NULL
    )
  ),
  CONSTRAINT commercial_engagement_client_shape CHECK (
    client_id IS NOT NULL OR (
      authorization_kind = 'public_diagnostic'
      AND billing_state IN ('checkout_pending', 'payment_pending', 'payment_failed', 'cancelled', 'needs_review')
    )
  ),
  CONSTRAINT commercial_engagement_paid_timestamp CHECK (
    (billing_state IN ('paid', 'past_due', 'refund_pending', 'refunded', 'disputed')) = (paid_at IS NOT NULL)
  ),
  CONSTRAINT commercial_engagement_delivery_billing CHECK (
    (delivery_state NOT IN ('ready', 'in_progress', 'active') OR billing_state = 'paid')
    AND (delivery_state <> 'paused' OR billing_state IN ('past_due', 'disputed'))
    AND (delivery_state <> 'delivered' OR billing_state IN ('paid', 'past_due', 'refund_pending', 'refunded', 'disputed'))
    AND (billing_state NOT IN ('checkout_pending', 'payment_pending', 'payment_failed') OR delivery_state IN ('blocked', 'needs_review'))
    AND (billing_state <> 'cancelled' OR delivery_state = 'cancelled')
  ),
  CONSTRAINT commercial_engagement_monitoring_state CHECK (
    delivery_state NOT IN ('active', 'paused') OR offer_phase = 'monitoring'
  ),
  CONSTRAINT commercial_engagement_subscription_shape CHECK (
    stripe_subscription_id IS NULL OR billing_interval = 'monthly'
  ),
  CONSTRAINT commercial_engagement_checkout_expiry_shape CHECK (
    checkout_expires_at IS NULL OR (
      stripe_checkout_session_id IS NOT NULL
      AND (
        checkout_session_attached_at IS NULL
        OR checkout_expires_at > checkout_session_attached_at
      )
    )
  ),
  CONSTRAINT commercial_engagement_current_period_shape CHECK (
    (current_period_start IS NULL AND current_period_end IS NULL)
    OR (
      current_period_start IS NOT NULL
      AND current_period_end > current_period_start
    )
  ),
  CONSTRAINT commercial_engagement_delivery_timestamps CHECK (
    (first_delivery_at IS NULL OR client_id IS NOT NULL)
    AND (delivery_state <> 'active' OR first_delivery_at IS NOT NULL)
    AND (
      delivery_state <> 'delivered'
      OR (first_delivery_at IS NOT NULL AND delivered_at IS NOT NULL)
    )
    AND (delivered_at IS NULL OR delivery_state = 'delivered')
  )
);

CREATE INDEX idx_commercial_engagements_client
  ON public.commercial_engagements (client_id, phase_order, created_at DESC);
CREATE INDEX idx_commercial_engagements_predecessor
  ON public.commercial_engagements (predecessor_engagement_id);
-- A failed or explicitly cancelled Checkout Session is a terminal attempt. A
-- new request key may create the next attempt, but the immutable failed row and
-- its provider-event history remain available for reconciliation.
CREATE UNIQUE INDEX uq_commercial_engagements_adjacent_offer
  ON public.commercial_engagements (predecessor_engagement_id, offer_price_id)
  WHERE predecessor_engagement_id IS NOT NULL
    AND billing_state NOT IN ('cancelled', 'payment_failed');
CREATE INDEX idx_commercial_engagements_analyst
  ON public.commercial_engagements (assigned_analyst_id, delivery_state, created_at);
CREATE INDEX idx_commercial_engagements_operations
  ON public.commercial_engagements (billing_state, delivery_state, created_at);
CREATE UNIQUE INDEX uq_commercial_engagements_scaffold
  ON public.commercial_engagements (scaffold_id)
  WHERE scaffold_id IS NOT NULL;

CREATE TABLE public.commercial_webhook_events (
  event_id TEXT PRIMARY KEY CHECK (btrim(event_id) <> ''),
  event_type TEXT NOT NULL CHECK (btrim(event_type) <> ''),
  livemode BOOLEAN NOT NULL,
  provider_object_id TEXT NOT NULL CHECK (btrim(provider_object_id) <> ''),
  engagement_id UUID REFERENCES public.commercial_engagements(id) ON DELETE RESTRICT,
  processing_state TEXT NOT NULL DEFAULT 'processing'
    CHECK (processing_state IN ('processing', 'processed', 'needs_review')),
  attempt_count INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count > 0),
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  result JSONB CHECK (result IS NULL OR jsonb_typeof(result) = 'object'),
  last_error TEXT,
  event_created_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_commercial_webhook_events_state
  ON public.commercial_webhook_events (processing_state, received_at);
CREATE INDEX idx_commercial_webhook_events_engagement
  ON public.commercial_webhook_events (engagement_id, event_created_at DESC);

CREATE TABLE public.commercial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.commercial_engagements(id) ON DELETE RESTRICT,
  stripe_event_id TEXT NOT NULL UNIQUE REFERENCES public.commercial_webhook_events(event_id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('checkout', 'renewal', 'refund', 'dispute')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded', 'disputed')),
  offer_price_id TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL CHECK (stripe_price_id ~ '^price_[A-Za-z0-9]+$'),
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL CHECK (currency ~ '^[a-z]{3}$'),
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  stripe_charge_id TEXT,
  stripe_refund_id TEXT,
  related_transaction_id UUID REFERENCES public.commercial_transactions(id) ON DELETE RESTRICT,
  billing_period_start TIMESTAMPTZ,
  billing_period_end TIMESTAMPTZ,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT commercial_transaction_period CHECK (
    (billing_period_start IS NULL AND billing_period_end IS NULL)
    OR (billing_period_start IS NOT NULL AND billing_period_end > billing_period_start)
  ),
  CONSTRAINT commercial_transaction_provider_shape CHECK (
    (kind = 'checkout' AND stripe_checkout_session_id IS NOT NULL AND stripe_invoice_id IS NULL)
    OR (kind = 'renewal' AND stripe_invoice_id IS NOT NULL)
    OR (kind = 'refund' AND stripe_refund_id IS NOT NULL AND related_transaction_id IS NOT NULL)
    OR (kind = 'dispute' AND stripe_charge_id IS NOT NULL AND related_transaction_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX uq_commercial_transaction_successful_checkout
  ON public.commercial_transactions (stripe_checkout_session_id)
  WHERE kind = 'checkout' AND status = 'succeeded';
CREATE UNIQUE INDEX uq_commercial_transaction_successful_invoice
  ON public.commercial_transactions (stripe_invoice_id)
  WHERE kind = 'renewal' AND status = 'succeeded';
CREATE UNIQUE INDEX uq_commercial_transaction_successful_payment_intent
  ON public.commercial_transactions (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL AND status = 'succeeded';
CREATE UNIQUE INDEX uq_commercial_transaction_refund
  ON public.commercial_transactions (stripe_refund_id)
  WHERE stripe_refund_id IS NOT NULL;
CREATE INDEX idx_commercial_transactions_engagement
  ON public.commercial_transactions (engagement_id, occurred_at DESC);

-- public.payments remains the dashboard compatibility read model. These
-- columns identify rows projected from canonical transactions; no webhook may
-- use this table for idempotency, entitlement, or lifecycle truth.
ALTER TABLE public.payments
  ADD COLUMN commercial_transaction_id UUID
    REFERENCES public.commercial_transactions(id) ON DELETE RESTRICT,
  ADD COLUMN commercial_engagement_id UUID
    REFERENCES public.commercial_engagements(id) ON DELETE RESTRICT,
  ADD COLUMN offer_price_id TEXT,
  ADD COLUMN is_canonical_projection BOOLEAN NOT NULL DEFAULT false,
  ADD CONSTRAINT payments_canonical_projection_shape CHECK (
    (
      is_canonical_projection
      AND commercial_transaction_id IS NOT NULL
      AND commercial_engagement_id IS NOT NULL
      AND offer_price_id IS NOT NULL
    ) OR (
      NOT is_canonical_projection
      AND commercial_transaction_id IS NULL
      AND commercial_engagement_id IS NULL
      AND offer_price_id IS NULL
    )
  );

CREATE UNIQUE INDEX uq_payments_commercial_transaction
  ON public.payments (commercial_transaction_id)
  WHERE commercial_transaction_id IS NOT NULL;

CREATE UNIQUE INDEX uq_payments_canonical_session
  ON public.payments (stripe_session_id)
  WHERE commercial_transaction_id IS NOT NULL;

CREATE TABLE public.commercial_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_event_id TEXT NOT NULL REFERENCES public.commercial_webhook_events(event_id) ON DELETE RESTRICT,
  engagement_id UUID NOT NULL REFERENCES public.commercial_engagements(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN (
    'checkout_confirmation', 'monitoring_renewal_confirmation',
    'checkout_payment_failed', 'monitoring_payment_failed',
    'operator_exception'
  )),
  template_key TEXT NOT NULL CHECK (btrim(template_key) <> ''),
  idempotency_key TEXT NOT NULL UNIQUE CHECK (btrim(idempotency_key) <> ''),
  recipient_email TEXT NOT NULL
    CHECK (recipient_email = lower(btrim(recipient_email)) AND position('@' IN recipient_email) > 1),
  offer_price_id TEXT NOT NULL,
  offer_name TEXT NOT NULL,
  offer_line TEXT NOT NULL CHECK (offer_line IN ('dwy', 'dfy')),
  offer_phase TEXT NOT NULL CHECK (offer_phase IN ('diagnostic', 'intervention', 'monitoring', 'expansion', 'autonomy')),
  authorization_kind TEXT NOT NULL CHECK (authorization_kind IN ('public_diagnostic', 'operator_lifecycle')),
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL CHECK (currency ~ '^[a-z]{3}$'),
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('one_time', 'monthly')),
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'failed', 'sent', 'dead_letter')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 10 CHECK (max_attempts > 0),
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  last_error TEXT,
  provider_message_id TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (webhook_event_id, kind),
  CONSTRAINT commercial_outbox_attempt_bounds CHECK (
    attempt_count <= max_attempts
  ),
  CONSTRAINT commercial_outbox_state_shape CHECK (
    (status <> 'processing' OR locked_at IS NOT NULL)
    AND (status <> 'sent' OR (sent_at IS NOT NULL AND provider_message_id IS NOT NULL))
  )
);

CREATE INDEX idx_commercial_outbox_dispatch
  ON public.commercial_outbox (status, available_at, created_at)
  WHERE status IN ('pending', 'failed', 'processing');

CREATE TABLE public.legacy_payment_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_payment_id UUID NOT NULL UNIQUE,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  payer_email TEXT,
  amount_total BIGINT,
  currency TEXT,
  product_name TEXT,
  segment TEXT,
  referral_code TEXT,
  legacy_lead_id UUID,
  original_created_at TIMESTAMPTZ,
  original_row JSONB NOT NULL CHECK (jsonb_typeof(original_row) = 'object'),
  reconciliation_state TEXT NOT NULL DEFAULT 'unreviewed'
    CHECK (reconciliation_state IN ('unreviewed', 'matched', 'ambiguous', 'invalid', 'ignored')),
  reconciled_engagement_id UUID REFERENCES public.commercial_engagements(id) ON DELETE RESTRICT,
  reconciled_transaction_id UUID REFERENCES public.commercial_transactions(id) ON DELETE RESTRICT,
  reconciliation_note TEXT,
  reconciled_by_analyst_id UUID REFERENCES public.commercial_analysts(id) ON DELETE RESTRICT,
  reconciled_at TIMESTAMPTZ,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT legacy_payment_reconciliation_resolution CHECK (
    (reconciliation_state = 'unreviewed'
      AND reconciled_engagement_id IS NULL
      AND reconciled_transaction_id IS NULL
      AND reconciled_by_analyst_id IS NULL
      AND reconciled_at IS NULL)
    OR
    (reconciliation_state <> 'unreviewed'
      AND reconciliation_note IS NOT NULL
      AND btrim(reconciliation_note) <> ''
      AND reconciled_by_analyst_id IS NOT NULL
      AND reconciled_at IS NOT NULL)
  ),
  CONSTRAINT legacy_payment_reconciliation_match_shape CHECK (
    reconciliation_state <> 'matched'
    OR (reconciled_engagement_id IS NOT NULL AND reconciled_transaction_id IS NOT NULL)
  )
);

CREATE INDEX idx_legacy_payment_reconciliation_state
  ON public.legacy_payment_reconciliation (reconciliation_state, queued_at);

-- Snapshot every historical payment without inferring an offer, client,
-- engagement, analyst, or lifecycle stage.
INSERT INTO public.legacy_payment_reconciliation (
  legacy_payment_id,
  stripe_session_id,
  stripe_payment_intent_id,
  payer_email,
  amount_total,
  currency,
  product_name,
  segment,
  referral_code,
  legacy_lead_id,
  original_created_at,
  original_row
)
SELECT
  p.id,
  p.stripe_session_id,
  p.stripe_payment_intent,
  p.email,
  p.amount_total,
  p.currency,
  p.product_name,
  p.segment,
  p.referral_code,
  p.lead_id,
  p.created_at,
  to_jsonb(p)
FROM public.payments AS p
ON CONFLICT (legacy_payment_id) DO NOTHING;

-- ── 3. Immutability, timestamps, and explicit access control ─────────────────

CREATE OR REPLACE FUNCTION public._commercial_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER commercial_analysts_set_updated_at
  BEFORE UPDATE ON public.commercial_analysts
  FOR EACH ROW EXECUTE FUNCTION public._commercial_set_updated_at();

CREATE TRIGGER commercial_engagements_set_updated_at
  BEFORE UPDATE ON public.commercial_engagements
  FOR EACH ROW EXECUTE FUNCTION public._commercial_set_updated_at();

CREATE TRIGGER commercial_outbox_set_updated_at
  BEFORE UPDATE ON public.commercial_outbox
  FOR EACH ROW EXECUTE FUNCTION public._commercial_set_updated_at();

CREATE OR REPLACE FUNCTION public._commercial_guard_engagement_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF ROW(
    OLD.request_key, OLD.catalog_version, OLD.offer_price_id, OLD.offer_name,
    OLD.offer_scope, OLD.offer_line, OLD.offer_tier, OLD.offer_phase,
    OLD.phase_order, OLD.amount_cents, OLD.currency, OLD.billing_interval,
    OLD.stripe_price_id, OLD.authorization_kind,
    OLD.predecessor_engagement_id, OLD.assigned_analyst_id,
    OLD.authorized_by_analyst_id, OLD.assigned_at,
    OLD.intake_company_name, OLD.intake_contact_name, OLD.intake_email,
    OLD.intake_industry, OLD.target_url, OLD.scope_brief,
    OLD.intake_submitted_at, OLD.metadata
  ) IS DISTINCT FROM ROW(
    NEW.request_key, NEW.catalog_version, NEW.offer_price_id, NEW.offer_name,
    NEW.offer_scope, NEW.offer_line, NEW.offer_tier, NEW.offer_phase,
    NEW.phase_order, NEW.amount_cents, NEW.currency, NEW.billing_interval,
    NEW.stripe_price_id, NEW.authorization_kind,
    NEW.predecessor_engagement_id, NEW.assigned_analyst_id,
    NEW.authorized_by_analyst_id, NEW.assigned_at,
    NEW.intake_company_name, NEW.intake_contact_name, NEW.intake_email,
    NEW.intake_industry, NEW.target_url, NEW.scope_brief,
    NEW.intake_submitted_at, NEW.metadata
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22000',
      MESSAGE = 'Canonical engagement offer, ownership, authorization, and intake facts are immutable';
  END IF;

  IF OLD.client_id IS NOT NULL AND NEW.client_id IS DISTINCT FROM OLD.client_id THEN
    RAISE EXCEPTION USING ERRCODE = '22000', MESSAGE = 'An engagement client cannot be reassigned';
  END IF;

  IF OLD.stripe_checkout_session_id IS NOT NULL
     AND NEW.stripe_checkout_session_id IS DISTINCT FROM OLD.stripe_checkout_session_id THEN
    RAISE EXCEPTION USING ERRCODE = '22000', MESSAGE = 'A checkout session cannot be replaced';
  END IF;
  IF OLD.checkout_expires_at IS NOT NULL
     AND NEW.checkout_expires_at IS DISTINCT FROM OLD.checkout_expires_at THEN
    RAISE EXCEPTION USING ERRCODE = '22000', MESSAGE = 'A checkout expiration cannot be replaced';
  END IF;
  IF OLD.stripe_customer_id IS NOT NULL
     AND NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id THEN
    RAISE EXCEPTION USING ERRCODE = '22000', MESSAGE = 'A Stripe customer cannot be replaced';
  END IF;
  IF OLD.stripe_payment_intent_id IS NOT NULL
     AND NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id THEN
    RAISE EXCEPTION USING ERRCODE = '22000', MESSAGE = 'An initial payment intent cannot be replaced';
  END IF;
  IF OLD.stripe_subscription_id IS NOT NULL
     AND NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id THEN
    RAISE EXCEPTION USING ERRCODE = '22000', MESSAGE = 'A subscription cannot be replaced';
  END IF;
  IF OLD.scaffold_id IS NOT NULL AND NEW.scaffold_id IS DISTINCT FROM OLD.scaffold_id THEN
    RAISE EXCEPTION USING ERRCODE = '22000', MESSAGE = 'An engagement scaffold cannot be replaced';
  END IF;
  IF OLD.deliverable_key IS NOT NULL AND NEW.deliverable_key IS DISTINCT FROM OLD.deliverable_key THEN
    RAISE EXCEPTION USING ERRCODE = '22000', MESSAGE = 'An engagement deliverable cannot be replaced';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER commercial_engagements_immutable_facts
  BEFORE UPDATE ON public.commercial_engagements
  FOR EACH ROW EXECUTE FUNCTION public._commercial_guard_engagement_immutability();

ALTER TABLE public.commercial_analysts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_payment_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_active_commercial_analyst()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.commercial_analysts AS analyst
    WHERE analyst.auth_user_id = auth.uid()
      AND analyst.is_active
  );
$$;

CREATE POLICY commercial_analysts_service_only
  ON public.commercial_analysts FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY commercial_engagements_service_only
  ON public.commercial_engagements FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY commercial_webhook_events_service_only
  ON public.commercial_webhook_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY commercial_transactions_service_only
  ON public.commercial_transactions FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY commercial_outbox_service_only
  ON public.commercial_outbox FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY legacy_payment_reconciliation_service_only
  ON public.legacy_payment_reconciliation FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Policy names in production have historically diverged from migrations. For
-- the PII-bearing compatibility projection, remove every prior policy instead
-- of adding a restrictive policy that would be ORed with an unknown allow-all.
DO $$
DECLARE
  v_policy RECORD;
BEGIN
  FOR v_policy IN
    SELECT policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'payments'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.payments', v_policy.policyname);
  END LOOP;
END;
$$;

CREATE POLICY commercial_payments_service_only
  ON public.payments FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY commercial_payments_active_analyst_read
  ON public.payments FOR SELECT TO authenticated
  USING (public.is_active_commercial_analyst());

CREATE POLICY commercial_events_active_analyst_read
  ON public.commercial_webhook_events FOR SELECT TO authenticated
  USING (public.is_active_commercial_analyst());

CREATE POLICY commercial_transactions_active_analyst_read
  ON public.commercial_transactions FOR SELECT TO authenticated
  USING (public.is_active_commercial_analyst());

CREATE POLICY commercial_outbox_active_analyst_read
  ON public.commercial_outbox FOR SELECT TO authenticated
  USING (public.is_active_commercial_analyst());

CREATE POLICY legacy_payment_reconciliation_active_analyst_read
  ON public.legacy_payment_reconciliation FOR SELECT TO authenticated
  USING (public.is_active_commercial_analyst());

REVOKE ALL ON TABLE public.commercial_analysts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.commercial_engagements FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.commercial_webhook_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.commercial_transactions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.commercial_outbox FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.legacy_payment_reconciliation FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.payments FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.commercial_analysts TO service_role;
GRANT ALL ON TABLE public.commercial_engagements TO service_role;
GRANT ALL ON TABLE public.commercial_webhook_events TO service_role;
GRANT ALL ON TABLE public.commercial_transactions TO service_role;
GRANT ALL ON TABLE public.commercial_outbox TO service_role;
GRANT ALL ON TABLE public.legacy_payment_reconciliation TO service_role;
GRANT ALL ON TABLE public.payments TO service_role;
GRANT SELECT ON TABLE public.commercial_webhook_events TO authenticated;
GRANT SELECT ON TABLE public.commercial_transactions TO authenticated;
GRANT SELECT ON TABLE public.commercial_outbox TO authenticated;
GRANT SELECT ON TABLE public.legacy_payment_reconciliation TO authenticated;
GRANT SELECT ON TABLE public.payments TO authenticated;

REVOKE ALL ON FUNCTION public.is_active_commercial_analyst() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_commercial_analyst() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public._commercial_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._commercial_guard_engagement_immutability() FROM PUBLIC, anon, authenticated;

-- ── 4. Internal transactional helpers ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._begin_commercial_webhook_event(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_event_id TEXT := nullif(btrim(p_payload ->> 'event_id'), '');
  v_event_type TEXT := nullif(btrim(p_payload ->> 'event_type'), '');
  v_provider_object_id TEXT := nullif(btrim(coalesce(
    p_payload ->> 'checkout_session_id',
    p_payload ->> 'invoice_id',
    p_payload ->> 'provider_object_id'
  )), '');
  v_livemode BOOLEAN := (p_payload ->> 'livemode')::BOOLEAN;
  v_event_created_at TIMESTAMPTZ := (p_payload ->> 'event_created_at')::TIMESTAMPTZ;
  v_event_payload JSONB := coalesce(p_payload -> 'event_payload', '{}'::jsonb);
  v_existing public.commercial_webhook_events%ROWTYPE;
  v_inserted TEXT;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'p_payload must be a JSON object';
  END IF;
  IF v_event_id IS NULL OR v_event_type IS NULL OR v_provider_object_id IS NULL
     OR v_livemode IS NULL OR v_event_created_at IS NULL
     OR jsonb_typeof(v_event_payload) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Webhook event envelope is incomplete';
  END IF;

  INSERT INTO public.commercial_webhook_events (
    event_id, event_type, livemode, provider_object_id, engagement_id,
    processing_state, attempt_count, payload, event_created_at
  ) VALUES (
    v_event_id, v_event_type, v_livemode, v_provider_object_id, NULL,
    'processing', 1, v_event_payload, v_event_created_at
  )
  ON CONFLICT (event_id) DO NOTHING
  RETURNING event_id INTO v_inserted;

  IF v_inserted IS NOT NULL THEN
    RETURN jsonb_build_object('duplicate', false, 'event_id', v_event_id);
  END IF;

  SELECT * INTO v_existing
  FROM public.commercial_webhook_events
  WHERE event_id = v_event_id
  FOR UPDATE;

  IF v_existing.event_type IS DISTINCT FROM v_event_type
     OR v_existing.livemode IS DISTINCT FROM v_livemode
     OR v_existing.provider_object_id IS DISTINCT FROM v_provider_object_id
     OR v_existing.event_created_at IS DISTINCT FROM v_event_created_at
     OR v_existing.payload IS DISTINCT FROM v_event_payload THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = 'Stripe event ID was reused with different immutable facts';
  END IF;

  IF v_existing.processing_state IN ('processed', 'needs_review') THEN
    RETURN jsonb_build_object(
      'duplicate', true,
      'event_id', v_event_id,
      'result', coalesce(v_existing.result, '{}'::jsonb)
    );
  END IF;

  UPDATE public.commercial_webhook_events
  SET attempt_count = attempt_count + 1,
      last_attempted_at = now()
  WHERE event_id = v_event_id;

  RETURN jsonb_build_object('duplicate', false, 'event_id', v_event_id);
END;
$$;

CREATE OR REPLACE FUNCTION public._finish_commercial_webhook_event(
  p_event_id TEXT,
  p_processing_state TEXT,
  p_result JSONB,
  p_last_error TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_processing_state NOT IN ('processed', 'needs_review')
     OR p_result IS NULL OR jsonb_typeof(p_result) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid webhook completion state';
  END IF;

  UPDATE public.commercial_webhook_events
  SET processing_state = p_processing_state,
      engagement_id = coalesce(
        engagement_id,
        (
          SELECT engagement.id
          FROM public.commercial_engagements AS engagement
          WHERE engagement.id::TEXT = p_result ->> 'engagement_id'
        )
      ),
      result = p_result,
      last_error = p_last_error,
      processed_at = now(),
      last_attempted_at = now()
  WHERE event_id = p_event_id
    AND processing_state = 'processing';

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Webhook event is not claimable for completion';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._enqueue_commercial_outbox(
  p_event_id TEXT,
  p_engagement_id UUID,
  p_kind TEXT,
  p_template_key TEXT,
  p_amount_cents BIGINT,
  p_extra_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_engagement public.commercial_engagements%ROWTYPE;
  v_outbox_id UUID;
BEGIN
  SELECT * INTO v_engagement
  FROM public.commercial_engagements
  WHERE id = p_engagement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Engagement not found for outbox';
  END IF;
  IF p_extra_payload IS NULL OR jsonb_typeof(p_extra_payload) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Outbox extra payload must be an object';
  END IF;

  INSERT INTO public.commercial_outbox (
    webhook_event_id, engagement_id, kind, template_key, idempotency_key,
    recipient_email, offer_price_id, offer_name, offer_line, offer_phase,
    authorization_kind, amount_cents, currency, billing_interval, payload
  ) VALUES (
    p_event_id,
    p_engagement_id,
    p_kind,
    p_template_key,
    'commercial/' || p_kind || '/' || p_event_id,
    v_engagement.intake_email,
    v_engagement.offer_price_id,
    v_engagement.offer_name,
    v_engagement.offer_line,
    v_engagement.offer_phase,
    v_engagement.authorization_kind,
    p_amount_cents,
    v_engagement.currency,
    v_engagement.billing_interval,
    jsonb_build_object(
      'event_id', p_event_id,
      'sf_engagement_id', p_engagement_id,
      'sf_offer_price_id', v_engagement.offer_price_id,
      'sf_authorization_kind', v_engagement.authorization_kind,
      'sf_catalog_version', v_engagement.catalog_version,
      'offer_name', v_engagement.offer_name,
      'offer_line', v_engagement.offer_line,
      'offer_phase', v_engagement.offer_phase,
      'amount_cents', p_amount_cents,
      'currency', v_engagement.currency,
      'billing_interval', v_engagement.billing_interval,
      'recipient_email', v_engagement.intake_email
    ) || p_extra_payload
  )
  ON CONFLICT (webhook_event_id, kind) DO NOTHING
  RETURNING id INTO v_outbox_id;

  IF v_outbox_id IS NULL THEN
    SELECT id INTO v_outbox_id
    FROM public.commercial_outbox
    WHERE webhook_event_id = p_event_id AND kind = p_kind;
  END IF;

  RETURN v_outbox_id;
END;
$$;

REVOKE ALL ON FUNCTION public._begin_commercial_webhook_event(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._finish_commercial_webhook_event(TEXT, TEXT, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._enqueue_commercial_outbox(TEXT, UUID, TEXT, TEXT, BIGINT, JSONB) FROM PUBLIC, anon, authenticated;

-- ── 5. Analyst configuration and idempotent intent creation ──────────────────

CREATE OR REPLACE FUNCTION public.configure_commercial_analyst(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_auth_user_id UUID := (p_payload ->> 'auth_user_id')::UUID;
  v_display_name TEXT := nullif(btrim(p_payload ->> 'display_name'), '');
  v_notification_email TEXT := lower(nullif(btrim(p_payload ->> 'notification_email'), ''));
  v_is_active BOOLEAN := coalesce((p_payload ->> 'is_active')::BOOLEAN, true);
  v_accepts BOOLEAN := coalesce((p_payload ->> 'accepts_new_engagements')::BOOLEAN, false);
  v_is_default BOOLEAN := coalesce((p_payload ->> 'is_default')::BOOLEAN, false);
  v_analyst public.commercial_analysts%ROWTYPE;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object'
     OR v_auth_user_id IS NULL OR v_display_name IS NULL
     OR v_notification_email IS NULL OR position('@' IN v_notification_email) <= 1 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Analyst configuration is incomplete';
  END IF;
  IF v_is_default AND NOT (v_is_active AND v_accepts) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'The default analyst must be active and accepting new engagements';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_auth_user_id) THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Analyst auth user does not exist';
  END IF;

  LOCK TABLE public.commercial_analysts IN SHARE ROW EXCLUSIVE MODE;

  IF v_is_default THEN
    UPDATE public.commercial_analysts
    SET is_default = false
    WHERE is_default AND auth_user_id <> v_auth_user_id;
  END IF;

  INSERT INTO public.commercial_analysts (
    auth_user_id, display_name, notification_email,
    is_active, accepts_new_engagements, is_default
  ) VALUES (
    v_auth_user_id, v_display_name, v_notification_email,
    v_is_active, v_accepts, v_is_default
  )
  ON CONFLICT (auth_user_id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      notification_email = EXCLUDED.notification_email,
      is_active = EXCLUDED.is_active,
      accepts_new_engagements = EXCLUDED.accepts_new_engagements,
      is_default = EXCLUDED.is_default
  RETURNING * INTO v_analyst;

  RETURN jsonb_build_object(
    'ok', true,
    'status', 'configured',
    'analyst_id', v_analyst.id,
    'auth_user_id', v_analyst.auth_user_id,
    'display_name', v_analyst.display_name,
    'notification_email', v_analyst.notification_email,
    'is_active', v_analyst.is_active,
    'accepts_new_engagements', v_analyst.accepts_new_engagements,
    'is_default', v_analyst.is_default
  );
END;
$$;

-- Anonymous checkout is a deliberate release switch, not a migration side
-- effect. The confirmation string is an operator acknowledgement; service-role
-- authorization remains the security boundary.
CREATE OR REPLACE FUNCTION public.activate_commercial_checkout(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_catalog_version TEXT := nullif(btrim(p_payload ->> 'sf_catalog_version'), '');
  v_confirmation_token TEXT := nullif(btrim(p_payload ->> 'confirmation_token'), '');
  v_default_count INTEGER;
  v_active_binding_count INTEGER;
  v_public_binding_count INTEGER;
  v_diagnostic_route_count INTEGER;
  v_later_url_count INTEGER;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object'
     OR v_catalog_version IS DISTINCT FROM '2026-08-14'
     OR v_confirmation_token IS DISTINCT FROM 'activate-canonical-commercial-checkout:2026-08-14' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Canonical commercial checkout activation confirmation is invalid';
  END IF;

  LOCK TABLE public.commercial_analysts IN SHARE MODE;
  LOCK TABLE public.stripe_payment_links IN SHARE ROW EXCLUSIVE MODE;

  SELECT count(*) INTO v_default_count
  FROM public.commercial_analysts
  WHERE is_default AND is_active AND accepts_new_engagements;

  SELECT count(*) INTO v_active_binding_count
  FROM public.stripe_payment_links
  WHERE is_active;

  SELECT count(*) INTO v_public_binding_count
  FROM public.stripe_payment_links
  WHERE is_public_entry;

  SELECT count(*) INTO v_diagnostic_route_count
  FROM public.stripe_payment_links
  WHERE is_active
    AND stripe_price_id IS NOT NULL
    AND billing_interval = 'one_time'
    AND currency = 'usd'
    AND (
      (price_id = 'price_dwy_beta_diagnostic'
       AND line = 'dwy'
       AND tier = 'beta_diagnostic'
       AND payment_link_url = '/checkout/price_dwy_beta_diagnostic')
      OR
      (price_id = 'price_dfy_beta_diagnostic'
       AND line = 'dfy'
       AND tier = 'beta_diagnostic'
       AND payment_link_url = '/checkout/price_dfy_beta_diagnostic')
    );

  SELECT count(*) INTO v_later_url_count
  FROM public.stripe_payment_links
  WHERE price_id IN (
      'price_dwy_intervention', 'price_dwy_monitoring',
      'price_dwy_expansion', 'price_dwy_autonomy',
      'price_dfy_intervention', 'price_dfy_monitoring',
      'price_dfy_expansion', 'price_dfy_autonomy'
    )
    AND payment_link_url IS NOT NULL;

  IF v_default_count <> 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Activation requires exactly one active, accepting default analyst';
  END IF;
  IF v_active_binding_count <> 10 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Activation requires exactly ten active canonical provider bindings';
  END IF;
  IF v_diagnostic_route_count <> 2 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Activation requires both canonical internal Diagnostic routes';
  END IF;
  IF v_later_url_count <> 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Activation requires every later-phase payment link URL to be null';
  END IF;

  UPDATE public.stripe_payment_links
  SET is_public_entry = true,
      updated_at = now()
  WHERE price_id IN ('price_dwy_beta_diagnostic', 'price_dfy_beta_diagnostic');

  RETURN jsonb_build_object(
    'ok', true,
    'status', CASE WHEN v_public_binding_count = 2 THEN 'already_active' ELSE 'activated' END,
    'catalog_version', v_catalog_version,
    'active_binding_count', v_active_binding_count,
    'public_entry_count', 2
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.deactivate_commercial_checkout(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_catalog_version TEXT := nullif(btrim(p_payload ->> 'sf_catalog_version'), '');
  v_confirmation_token TEXT := nullif(btrim(p_payload ->> 'confirmation_token'), '');
  v_public_binding_count INTEGER;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object'
     OR v_catalog_version IS DISTINCT FROM '2026-08-14'
     OR v_confirmation_token IS DISTINCT FROM 'deactivate-canonical-commercial-checkout:2026-08-14' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Canonical commercial checkout deactivation confirmation is invalid';
  END IF;

  LOCK TABLE public.stripe_payment_links IN SHARE ROW EXCLUSIVE MODE;

  SELECT count(*) INTO v_public_binding_count
  FROM public.stripe_payment_links
  WHERE is_public_entry;

  UPDATE public.stripe_payment_links
  SET is_public_entry = false,
      updated_at = now()
  WHERE is_public_entry;

  RETURN jsonb_build_object(
    'ok', true,
    'status', CASE WHEN v_public_binding_count = 0 THEN 'already_inactive' ELSE 'deactivated' END,
    'catalog_version', v_catalog_version,
    'public_entry_count', 0
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_commercial_public_intent(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_request_key UUID := (p_payload ->> 'request_key')::UUID;
  v_offer_price_id TEXT := nullif(btrim(p_payload ->> 'sf_offer_price_id'), '');
  v_authorization_kind TEXT := nullif(btrim(p_payload ->> 'sf_authorization_kind'), '');
  v_catalog_version TEXT := nullif(btrim(p_payload ->> 'sf_catalog_version'), '');
  v_company TEXT := nullif(btrim(p_payload ->> 'company_name'), '');
  v_contact TEXT := nullif(btrim(p_payload ->> 'contact_name'), '');
  v_email TEXT := lower(nullif(btrim(p_payload ->> 'contact_email'), ''));
  v_industry TEXT := nullif(btrim(p_payload ->> 'industry'), '');
  v_target_url TEXT := nullif(btrim(p_payload ->> 'target_url'), '');
  v_scope_brief TEXT := nullif(btrim(p_payload ->> 'scope_brief'), '');
  v_referral_code TEXT := nullif(btrim(p_payload ->> 'referral_code'), '');
  v_metadata JSONB := jsonb_strip_nulls(jsonb_build_object('referral_code', v_referral_code));
  v_binding public.stripe_payment_links%ROWTYPE;
  v_analyst public.commercial_analysts%ROWTYPE;
  v_existing public.commercial_engagements%ROWTYPE;
  v_inserted_id UUID;
  v_status TEXT := 'created';
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object'
     OR v_request_key IS NULL OR v_offer_price_id IS NULL
     OR v_authorization_kind IS DISTINCT FROM 'public_diagnostic'
     OR v_catalog_version IS DISTINCT FROM '2026-08-14'
     OR v_company IS NULL OR v_contact IS NULL
     OR v_email IS NULL OR position('@' IN v_email) <= 1
     OR v_industry IS NULL OR v_target_url IS NULL
     OR v_target_url !~ '^https://[^[:space:]]+$'
     OR v_scope_brief IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Public Diagnostic intent facts are incomplete or invalid';
  END IF;

  -- An already-created request is returned without re-selecting a possibly
  -- changed default analyst or provider availability. Its own facts remain the
  -- authority; session attachment still performs current-state validation.
  SELECT * INTO v_existing
  FROM public.commercial_engagements
  WHERE request_key = v_request_key
  FOR UPDATE;

  IF FOUND THEN
    IF ROW(
      v_existing.offer_price_id, v_existing.catalog_version,
      v_existing.authorization_kind,
      v_existing.intake_company_name, v_existing.intake_contact_name,
      v_existing.intake_email, v_existing.intake_industry,
      v_existing.target_url, v_existing.scope_brief,
      v_existing.metadata
    ) IS DISTINCT FROM ROW(
      v_offer_price_id, v_catalog_version, v_authorization_kind,
      v_company, v_contact, v_email, v_industry, v_target_url, v_scope_brief,
      v_metadata
    ) OR v_existing.authorization_kind <> 'public_diagnostic' THEN
      RAISE EXCEPTION USING
        ERRCODE = '23505',
        MESSAGE = 'request_key was reused with different public intent facts';
    END IF;
    IF v_existing.billing_state NOT IN ('checkout_pending', 'payment_pending')
       OR v_existing.delivery_state <> 'blocked' THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'Existing public intent is terminal and cannot create another Checkout Session';
    END IF;

    SELECT * INTO v_analyst
    FROM public.commercial_analysts
    WHERE id = v_existing.assigned_analyst_id
      AND is_active
      AND accepts_new_engagements
    FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'The assigned public Diagnostic analyst is no longer accepting engagements';
    END IF;

    SELECT * INTO v_binding
    FROM public.stripe_payment_links
    WHERE price_id = v_existing.offer_price_id
      AND is_active
      AND is_public_entry
      AND payment_link_url = '/checkout/' || price_id
    FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0002',
        MESSAGE = 'Public Diagnostic checkout is not currently activated';
    END IF;

    RETURN jsonb_build_object(
      'ok', true,
      'status', 'existing',
      'engagement_id', v_existing.id,
      'request_key', v_existing.request_key,
      'offer_price_id', v_existing.offer_price_id,
      'stripe_price_id', v_existing.stripe_price_id,
      'amount_cents', v_existing.amount_cents,
      'currency', v_existing.currency,
      'billing', v_existing.billing_interval,
      'offer_line', v_existing.offer_line,
      'offer_phase', v_existing.offer_phase,
      'authorization_kind', v_existing.authorization_kind,
      'catalog_version', v_existing.catalog_version,
      'contact_email', v_existing.intake_email,
      'assigned_analyst_id', v_existing.assigned_analyst_id,
      'billing_state', v_existing.billing_state,
      'delivery_state', v_existing.delivery_state
    );
  END IF;

  SELECT * INTO v_binding
  FROM public.stripe_payment_links
  WHERE price_id = v_offer_price_id
    AND is_active
    AND is_public_entry
    AND tier = 'beta_diagnostic'
    AND payment_link_url = '/checkout/' || price_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Public Diagnostic provider binding is unavailable';
  END IF;

  SELECT * INTO v_analyst
  FROM public.commercial_analysts
  WHERE is_default AND is_active AND accepts_new_engagements
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Exactly one active, accepting default commercial analyst must be configured';
  END IF;

  INSERT INTO public.commercial_engagements (
    request_key, catalog_version, offer_price_id, offer_name, offer_scope,
    offer_line, offer_tier, offer_phase, phase_order, amount_cents,
    currency, billing_interval, stripe_price_id, authorization_kind,
    assigned_analyst_id, intake_company_name, intake_contact_name,
    intake_email, intake_industry, target_url, scope_brief,
    intake_submitted_at, metadata
  ) VALUES (
    v_request_key, v_catalog_version, v_binding.price_id,
    v_binding.product_name, v_binding.service_scope, v_binding.line, v_binding.tier,
    'diagnostic', 1, v_binding.amount, v_binding.currency,
    v_binding.billing_interval, v_binding.stripe_price_id,
    'public_diagnostic', v_analyst.id, v_company, v_contact, v_email,
    v_industry, v_target_url, v_scope_brief, now(), v_metadata
  )
  ON CONFLICT (request_key) DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    v_status := 'existing';
    SELECT * INTO v_existing
    FROM public.commercial_engagements
    WHERE request_key = v_request_key
    FOR UPDATE;

    IF ROW(
      v_existing.offer_price_id, v_existing.catalog_version,
      v_existing.authorization_kind,
      v_existing.intake_company_name, v_existing.intake_contact_name,
      v_existing.intake_email, v_existing.intake_industry,
      v_existing.target_url, v_existing.scope_brief,
      v_existing.metadata
    ) IS DISTINCT FROM ROW(
      v_offer_price_id, v_catalog_version, v_authorization_kind,
      v_company, v_contact, v_email, v_industry, v_target_url, v_scope_brief,
      v_metadata
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'request_key raced with different public intent facts';
    END IF;
  ELSE
    SELECT * INTO v_existing
    FROM public.commercial_engagements
    WHERE id = v_inserted_id;
  END IF;

  IF v_existing.billing_state NOT IN ('checkout_pending', 'payment_pending')
     OR v_existing.delivery_state <> 'blocked' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Public intent is terminal and cannot create another Checkout Session';
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'status', v_status,
    'engagement_id', v_existing.id,
    'request_key', v_existing.request_key,
    'offer_price_id', v_existing.offer_price_id,
    'stripe_price_id', v_existing.stripe_price_id,
    'amount_cents', v_existing.amount_cents,
    'currency', v_existing.currency,
    'billing', v_existing.billing_interval,
    'offer_line', v_existing.offer_line,
    'offer_phase', v_existing.offer_phase,
    'authorization_kind', v_existing.authorization_kind,
    'catalog_version', v_existing.catalog_version,
    'contact_email', v_existing.intake_email,
    'assigned_analyst_id', v_existing.assigned_analyst_id,
    'billing_state', v_existing.billing_state,
    'delivery_state', v_existing.delivery_state
  );
END;
$$;

-- Final operator-intent contract: the authenticated endpoint supplies only the
-- adjacent predecessor, requested offer, actor auth identity, and optional new
-- scope brief. Expansion additionally requires a different explicit HTTPS
-- target and explicit scope. Client/intake/owner facts otherwise inherit from
-- the predecessor; caller-supplied analyst or client UUIDs are never trusted.
CREATE OR REPLACE FUNCTION public.create_commercial_adjacent_intent(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_request_key UUID := (p_payload ->> 'request_key')::UUID;
  v_offer_price_id TEXT := nullif(btrim(p_payload ->> 'sf_offer_price_id'), '');
  v_authorization_kind TEXT := nullif(btrim(p_payload ->> 'sf_authorization_kind'), '');
  v_catalog_version TEXT := nullif(btrim(p_payload ->> 'sf_catalog_version'), '');
  v_predecessor_id UUID := (p_payload ->> 'predecessor_engagement_id')::UUID;
  v_authorized_auth_user_id UUID := (p_payload ->> 'authorized_by_auth_user_id')::UUID;
  v_requested_target_url TEXT := nullif(btrim(p_payload ->> 'target_url'), '');
  v_requested_scope_brief TEXT := nullif(btrim(p_payload ->> 'scope_brief'), '');
  v_effective_target_url TEXT;
  v_effective_scope_brief TEXT;
  v_binding public.stripe_payment_links%ROWTYPE;
  v_predecessor public.commercial_engagements%ROWTYPE;
  v_existing public.commercial_engagements%ROWTYPE;
  v_assigned public.commercial_analysts%ROWTYPE;
  v_authorizer public.commercial_analysts%ROWTYPE;
  v_phase TEXT;
  v_order SMALLINT;
  v_inserted_id UUID;
  v_status TEXT := 'created';
  v_has_existing BOOLEAN := false;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object'
     OR v_request_key IS NULL OR v_offer_price_id IS NULL
     OR v_authorization_kind IS DISTINCT FROM 'operator_lifecycle'
     OR v_catalog_version IS DISTINCT FROM '2026-08-14'
     OR v_predecessor_id IS NULL OR v_authorized_auth_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Operator lifecycle intent facts are incomplete or invalid';
  END IF;

  SELECT * INTO v_authorizer
  FROM public.commercial_analysts
  WHERE auth_user_id = v_authorized_auth_user_id
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Authorizing auth user is not a configured commercial analyst';
  END IF;

  SELECT * INTO v_predecessor
  FROM public.commercial_engagements
  WHERE id = v_predecessor_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Predecessor engagement does not exist';
  END IF;
  IF v_predecessor.client_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Predecessor has no durable client entitlement';
  END IF;

  SELECT * INTO v_assigned
  FROM public.commercial_analysts
  WHERE id = v_predecessor.assigned_analyst_id
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Predecessor assigned analyst is not configured';
  END IF;

  SELECT * INTO v_existing
  FROM public.commercial_engagements
  WHERE request_key = v_request_key
  FOR UPDATE;
  v_has_existing := FOUND;

  IF v_has_existing THEN
    v_phase := v_existing.offer_phase;
    v_order := v_existing.phase_order;
  ELSE
    SELECT * INTO v_binding
    FROM public.stripe_payment_links
    WHERE price_id = v_offer_price_id
      AND is_active
      AND NOT is_public_entry
      AND tier <> 'beta_diagnostic'
    FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Later-phase provider binding is unavailable';
    END IF;

    v_phase := CASE v_binding.tier
      WHEN 'intervention' THEN 'intervention'
      WHEN 'monitoring' THEN 'monitoring'
      WHEN 'expansion' THEN 'expansion'
      WHEN 'autonomy_kit' THEN 'autonomy'
      ELSE NULL
    END;
    v_order := CASE v_binding.tier
      WHEN 'intervention' THEN 2
      WHEN 'monitoring' THEN 3
      WHEN 'expansion' THEN 4
      WHEN 'autonomy_kit' THEN 5
      ELSE NULL
    END;
  END IF;

  IF v_phase = 'expansion' THEN
    IF v_requested_target_url IS NULL
       OR v_requested_target_url !~ '^https://[^[:space:]]+$'
       OR v_requested_target_url IS NOT DISTINCT FROM v_predecessor.target_url
       OR v_requested_scope_brief IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'Expansion requires a different explicit HTTPS target_url and nonblank scope_brief';
    END IF;
    v_effective_target_url := v_requested_target_url;
    v_effective_scope_brief := v_requested_scope_brief;
  ELSE
    IF p_payload ? 'target_url' THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'Only Expansion may override the predecessor target_url';
    END IF;
    v_effective_target_url := v_predecessor.target_url;
    v_effective_scope_brief := coalesce(v_requested_scope_brief, v_predecessor.scope_brief);
  END IF;

  IF v_has_existing THEN
    IF ROW(
      v_existing.offer_price_id, v_existing.catalog_version,
      v_existing.authorization_kind, v_existing.client_id,
      v_existing.predecessor_engagement_id, v_existing.assigned_analyst_id,
      v_existing.authorized_by_analyst_id, v_existing.target_url,
      v_existing.scope_brief
    ) IS DISTINCT FROM ROW(
      v_offer_price_id, v_catalog_version, v_authorization_kind,
      v_predecessor.client_id, v_predecessor_id,
      v_predecessor.assigned_analyst_id, v_authorizer.id,
      v_effective_target_url, v_effective_scope_brief
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'request_key was reused with different operator intent facts';
    END IF;
    IF v_existing.billing_state NOT IN ('checkout_pending', 'payment_pending')
       OR v_existing.delivery_state <> 'blocked' THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'Existing operator intent is terminal and cannot create another Checkout Session';
    END IF;
    IF NOT v_assigned.is_active OR NOT v_authorizer.is_active THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'Existing operator intent no longer has active analyst authorization';
    END IF;

    RETURN jsonb_build_object(
      'ok', true,
      'status', 'existing',
      'engagement_id', v_existing.id,
      'request_key', v_existing.request_key,
      'offer_price_id', v_existing.offer_price_id,
      'stripe_price_id', v_existing.stripe_price_id,
      'amount_cents', v_existing.amount_cents,
      'currency', v_existing.currency,
      'billing', v_existing.billing_interval,
      'offer_line', v_existing.offer_line,
      'offer_phase', v_existing.offer_phase,
      'authorization_kind', v_existing.authorization_kind,
      'catalog_version', v_existing.catalog_version,
      'assigned_analyst_id', v_existing.assigned_analyst_id,
      'authorized_by_analyst_id', v_existing.authorized_by_analyst_id,
      'contact_email', v_existing.intake_email,
      'billing_state', v_existing.billing_state,
      'delivery_state', v_existing.delivery_state
    );
  END IF;

  IF NOT v_assigned.is_active THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Predecessor assigned analyst is inactive';
  END IF;
  IF NOT v_authorizer.is_active THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Authorizing analyst is inactive';
  END IF;

  IF v_predecessor.offer_line IS DISTINCT FROM v_binding.line
     OR v_predecessor.phase_order <> v_order - 1
     OR v_predecessor.billing_state <> 'paid' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Predecessor does not authorize this adjacent lifecycle checkout';
  END IF;
  IF v_order = 4 THEN
    IF v_predecessor.offer_phase <> 'monitoring'
       OR v_predecessor.delivery_state NOT IN ('active', 'delivered')
       OR v_predecessor.first_delivery_at IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Expansion requires active Monitoring with a real first delivery';
    END IF;
  ELSIF v_predecessor.delivery_state <> 'delivered' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Adjacent lifecycle predecessor must be delivered';
  END IF;

  INSERT INTO public.commercial_engagements (
    request_key, catalog_version, offer_price_id, offer_name, offer_scope,
    offer_line, offer_tier, offer_phase, phase_order, amount_cents,
    currency, billing_interval, stripe_price_id, authorization_kind,
    client_id, predecessor_engagement_id, assigned_analyst_id,
    authorized_by_analyst_id, intake_company_name, intake_contact_name,
    intake_email, intake_industry, target_url, scope_brief,
    intake_submitted_at, metadata
  ) VALUES (
    v_request_key, v_catalog_version, v_binding.price_id,
    v_binding.product_name, v_binding.service_scope, v_binding.line,
    v_binding.tier, v_phase, v_order, v_binding.amount,
    v_binding.currency, v_binding.billing_interval, v_binding.stripe_price_id,
    'operator_lifecycle', v_predecessor.client_id, v_predecessor.id,
    v_predecessor.assigned_analyst_id, v_authorizer.id,
    v_predecessor.intake_company_name, v_predecessor.intake_contact_name,
    v_predecessor.intake_email, v_predecessor.intake_industry,
    v_effective_target_url, v_effective_scope_brief, now(),
    jsonb_build_object('authorized_from_engagement_id', v_predecessor.id)
  )
  ON CONFLICT (request_key) DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    v_status := 'existing';
    SELECT * INTO v_existing
    FROM public.commercial_engagements
    WHERE request_key = v_request_key
    FOR UPDATE;
    IF ROW(
      v_existing.offer_price_id, v_existing.catalog_version,
      v_existing.authorization_kind, v_existing.client_id,
      v_existing.predecessor_engagement_id, v_existing.assigned_analyst_id,
      v_existing.authorized_by_analyst_id, v_existing.target_url,
      v_existing.scope_brief
    ) IS DISTINCT FROM ROW(
      v_offer_price_id, v_catalog_version, v_authorization_kind,
      v_predecessor.client_id, v_predecessor_id,
      v_predecessor.assigned_analyst_id, v_authorizer.id,
      v_effective_target_url, v_effective_scope_brief
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'request_key raced with different operator intent facts';
    END IF;
  ELSE
    SELECT * INTO v_existing
    FROM public.commercial_engagements
    WHERE id = v_inserted_id;
  END IF;

  IF v_existing.billing_state NOT IN ('checkout_pending', 'payment_pending')
     OR v_existing.delivery_state <> 'blocked' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Operator intent is terminal and cannot create another Checkout Session';
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'status', v_status,
    'engagement_id', v_existing.id,
    'request_key', v_existing.request_key,
    'offer_price_id', v_existing.offer_price_id,
    'stripe_price_id', v_existing.stripe_price_id,
    'amount_cents', v_existing.amount_cents,
    'currency', v_existing.currency,
    'billing', v_existing.billing_interval,
    'offer_line', v_existing.offer_line,
    'offer_phase', v_existing.offer_phase,
    'authorization_kind', v_existing.authorization_kind,
    'catalog_version', v_existing.catalog_version,
    'assigned_analyst_id', v_existing.assigned_analyst_id,
    'authorized_by_analyst_id', v_existing.authorized_by_analyst_id,
    'contact_email', v_existing.intake_email,
    'billing_state', v_existing.billing_state,
    'delivery_state', v_existing.delivery_state
  );
END;
$$;

-- ── 6. Checkout-session attachment and cancellation ─────────────────────────

CREATE OR REPLACE FUNCTION public.attach_commercial_checkout_session(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_engagement_id UUID := (p_payload ->> 'sf_engagement_id')::UUID;
  v_offer_price_id TEXT := nullif(btrim(p_payload ->> 'sf_offer_price_id'), '');
  v_authorization_kind TEXT := nullif(btrim(p_payload ->> 'sf_authorization_kind'), '');
  v_catalog_version TEXT := nullif(btrim(p_payload ->> 'sf_catalog_version'), '');
  v_session_id TEXT := nullif(btrim(p_payload ->> 'checkout_session_id'), '');
  v_checkout_expires_at TIMESTAMPTZ := nullif(p_payload ->> 'checkout_expires_at', '')::TIMESTAMPTZ;
  v_customer_id TEXT := nullif(btrim(p_payload ->> 'stripe_customer_id'), '');
  v_subscription_id TEXT := nullif(btrim(p_payload ->> 'subscription_id'), '');
  v_engagement public.commercial_engagements%ROWTYPE;
  v_binding public.stripe_payment_links%ROWTYPE;
  v_status TEXT := 'attached';
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object'
     OR v_engagement_id IS NULL OR v_offer_price_id IS NULL
     OR v_authorization_kind NOT IN ('public_diagnostic', 'operator_lifecycle')
     OR v_catalog_version IS DISTINCT FROM '2026-08-14'
     OR v_session_id IS NULL OR v_checkout_expires_at IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Checkout-session attachment facts are incomplete';
  END IF;

  SELECT * INTO v_engagement
  FROM public.commercial_engagements
  WHERE id = v_engagement_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Commercial engagement does not exist';
  END IF;

  IF v_engagement.offer_price_id IS DISTINCT FROM v_offer_price_id
     OR v_engagement.authorization_kind IS DISTINCT FROM v_authorization_kind
     OR v_engagement.catalog_version IS DISTINCT FROM v_catalog_version THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Checkout metadata does not match immutable engagement facts';
  END IF;

  PERFORM 1
  FROM public.commercial_analysts
  WHERE id = v_engagement.assigned_analyst_id
    AND is_active
    AND (
      v_engagement.authorization_kind = 'operator_lifecycle'
      OR accepts_new_engagements
    )
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'The assigned analyst is not currently eligible for Session attachment';
  END IF;
  IF v_engagement.authorization_kind = 'operator_lifecycle' THEN
    PERFORM 1
    FROM public.commercial_analysts
    WHERE id = v_engagement.authorized_by_analyst_id
      AND is_active
    FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'The operator authorization is no longer active for Session attachment';
    END IF;
  END IF;

  IF v_engagement.stripe_checkout_session_id IS NOT NULL THEN
    IF v_engagement.stripe_checkout_session_id IS DISTINCT FROM v_session_id
       OR v_engagement.checkout_expires_at IS DISTINCT FROM v_checkout_expires_at
       OR (v_customer_id IS NOT NULL AND v_engagement.stripe_customer_id IS NOT NULL
           AND v_engagement.stripe_customer_id IS DISTINCT FROM v_customer_id)
       OR (v_subscription_id IS NOT NULL AND v_engagement.stripe_subscription_id IS NOT NULL
           AND v_engagement.stripe_subscription_id IS DISTINCT FROM v_subscription_id) THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Engagement is already attached to a different Stripe object';
    END IF;

    UPDATE public.commercial_engagements
    SET stripe_customer_id = coalesce(stripe_customer_id, v_customer_id),
        stripe_subscription_id = coalesce(stripe_subscription_id, v_subscription_id)
    WHERE id = v_engagement_id;
    v_status := 'existing';
  ELSE
    IF v_engagement.billing_state <> 'checkout_pending'
       OR v_engagement.delivery_state <> 'blocked' THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Engagement is not eligible for checkout-session attachment';
    END IF;
    IF v_checkout_expires_at <= now() THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'A stale or expired Stripe Checkout Session cannot be attached';
    END IF;

    IF v_engagement.authorization_kind = 'public_diagnostic' THEN
      -- The immutable engagement, not a mutable catalog re-read, supplies the
      -- Session facts. Only the public release switch is checked again here.
      SELECT * INTO v_binding
      FROM public.stripe_payment_links
      WHERE price_id = v_engagement.offer_price_id
        AND is_active
        AND is_public_entry
        AND payment_link_url = '/checkout/' || price_id
      FOR SHARE;
      IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Public Diagnostic checkout is not currently activated';
      END IF;
    END IF;

    UPDATE public.commercial_engagements
    SET stripe_checkout_session_id = v_session_id,
        stripe_customer_id = v_customer_id,
        stripe_subscription_id = v_subscription_id,
        checkout_session_attached_at = now(),
        checkout_expires_at = v_checkout_expires_at
    WHERE id = v_engagement_id;
  END IF;

  SELECT * INTO v_engagement
  FROM public.commercial_engagements
  WHERE id = v_engagement_id;

  RETURN jsonb_build_object(
    'ok', true,
    'status', v_status,
    'engagement_id', v_engagement.id,
    'request_key', v_engagement.request_key,
    'checkout_session_id', v_engagement.stripe_checkout_session_id,
    'checkout_expires_at', v_engagement.checkout_expires_at,
    'offer_price_id', v_engagement.offer_price_id,
    'authorization_kind', v_engagement.authorization_kind,
    'catalog_version', v_engagement.catalog_version,
    'billing_state', v_engagement.billing_state,
    'delivery_state', v_engagement.delivery_state
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_commercial_checkout_session(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_engagement_id UUID := (p_payload ->> 'sf_engagement_id')::UUID;
  v_offer_price_id TEXT := nullif(btrim(p_payload ->> 'sf_offer_price_id'), '');
  v_authorization_kind TEXT := nullif(btrim(p_payload ->> 'sf_authorization_kind'), '');
  v_catalog_version TEXT := nullif(btrim(p_payload ->> 'sf_catalog_version'), '');
  v_session_id TEXT := nullif(btrim(p_payload ->> 'checkout_session_id'), '');
  v_reason TEXT := nullif(btrim(p_payload ->> 'reason'), '');
  v_engagement public.commercial_engagements%ROWTYPE;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object'
     OR v_engagement_id IS NULL OR v_offer_price_id IS NULL
     OR v_authorization_kind NOT IN ('public_diagnostic', 'operator_lifecycle')
     OR v_catalog_version IS DISTINCT FROM '2026-08-14' OR v_session_id IS NULL OR v_reason IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Checkout cancellation facts are incomplete';
  END IF;

  SELECT * INTO v_engagement
  FROM public.commercial_engagements
  WHERE id = v_engagement_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Commercial engagement does not exist';
  END IF;

  IF v_engagement.offer_price_id IS DISTINCT FROM v_offer_price_id
     OR v_engagement.authorization_kind IS DISTINCT FROM v_authorization_kind
     OR v_engagement.catalog_version IS DISTINCT FROM v_catalog_version THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Checkout cancellation does not match the engagement';
  END IF;

  IF v_engagement.stripe_checkout_session_id IS NOT NULL
     AND v_engagement.stripe_checkout_session_id IS DISTINCT FROM v_session_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = 'Checkout cancellation cannot replace a different attached Stripe Session';
  END IF;

  IF v_engagement.billing_state = 'cancelled' THEN
    UPDATE public.commercial_engagements
    SET stripe_checkout_session_id = coalesce(stripe_checkout_session_id, v_session_id),
        checkout_cancelled_at = coalesce(checkout_cancelled_at, now()),
        checkout_cancellation_reason = coalesce(checkout_cancellation_reason, v_reason),
        state_reason = coalesce(state_reason, v_reason)
    WHERE id = v_engagement_id;

    RETURN jsonb_build_object(
      'ok', true,
      'status', 'existing',
      'engagement_id', v_engagement.id,
      'checkout_session_id', coalesce(v_engagement.stripe_checkout_session_id, v_session_id),
      'billing_state', v_engagement.billing_state,
      'delivery_state', v_engagement.delivery_state
    );
  END IF;

  IF v_engagement.billing_state NOT IN ('checkout_pending', 'payment_failed', 'needs_review')
     OR v_engagement.paid_at IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'A payment-pending, paid, or terminal engagement cannot be cancelled as an unpaid checkout';
  END IF;

  UPDATE public.commercial_engagements
  SET stripe_checkout_session_id = coalesce(stripe_checkout_session_id, v_session_id),
      billing_state = 'cancelled',
      delivery_state = 'cancelled',
      checkout_cancelled_at = now(),
      checkout_cancellation_reason = v_reason,
      state_reason = v_reason
  WHERE id = v_engagement_id;

  RETURN jsonb_build_object(
    'ok', true,
    'status', 'cancelled',
    'engagement_id', v_engagement_id,
    'checkout_session_id', v_session_id,
    'billing_state', 'cancelled',
    'delivery_state', 'cancelled'
  );
END;
$$;

-- ── 7. Verified webhook fact guards ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._validate_commercial_checkout_facts(p_payload JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_engagement_id UUID := (p_payload ->> 'sf_engagement_id')::UUID;
  v_engagement public.commercial_engagements%ROWTYPE;
  v_session_id TEXT := nullif(btrim(p_payload ->> 'checkout_session_id'), '');
  v_client_reference_id TEXT := nullif(btrim(p_payload ->> 'client_reference_id'), '');
  v_email TEXT := lower(nullif(btrim(p_payload ->> 'customer_email'), ''));
  v_customer_id TEXT := nullif(btrim(p_payload ->> 'stripe_customer_id'), '');
  v_payment_intent_id TEXT := nullif(btrim(p_payload ->> 'payment_intent_id'), '');
  v_subscription_id TEXT := nullif(btrim(p_payload ->> 'subscription_id'), '');
BEGIN
  IF v_engagement_id IS NULL OR v_session_id IS NULL OR v_client_reference_id IS NULL
     OR nullif(btrim(p_payload ->> 'sf_offer_price_id'), '') IS NULL
     OR nullif(btrim(p_payload ->> 'stripe_price_id'), '') IS NULL
     OR (p_payload ->> 'line_item_count')::INTEGER IS DISTINCT FROM 1
     OR (p_payload ->> 'quantity')::INTEGER IS DISTINCT FROM 1
     OR (p_payload ->> 'amount_total')::BIGINT IS NULL
     OR (p_payload ->> 'amount_total')::BIGINT < 0
     OR nullif(btrim(p_payload ->> 'currency'), '') IS NULL
     OR (
       (p_payload ->> 'event_type') IS DISTINCT FROM 'checkout.session.expired'
       AND v_email IS NULL
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Verified checkout facts are incomplete';
  END IF;

  SELECT * INTO v_engagement
  FROM public.commercial_engagements
  WHERE id = v_engagement_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Webhook engagement does not exist';
  END IF;

  IF v_engagement.offer_price_id IS DISTINCT FROM (p_payload ->> 'sf_offer_price_id')
     OR v_engagement.authorization_kind IS DISTINCT FROM (p_payload ->> 'sf_authorization_kind')
     OR v_engagement.catalog_version IS DISTINCT FROM (p_payload ->> 'sf_catalog_version')
     OR v_client_reference_id IS DISTINCT FROM v_engagement.id::TEXT
     OR v_engagement.stripe_checkout_session_id IS DISTINCT FROM v_session_id
     OR v_engagement.stripe_price_id IS DISTINCT FROM (p_payload ->> 'stripe_price_id')
     OR v_engagement.amount_cents IS DISTINCT FROM (p_payload ->> 'amount_total')::BIGINT
     OR v_engagement.currency IS DISTINCT FROM lower(p_payload ->> 'currency')
     OR (v_email IS NOT NULL AND v_engagement.intake_email IS DISTINCT FROM v_email) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Verified checkout facts do not match the immutable engagement';
  END IF;

  IF v_engagement.billing_interval = 'monthly' AND v_subscription_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Monitoring checkout is missing its subscription';
  END IF;
  IF v_engagement.billing_interval = 'one_time' AND v_subscription_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'One-time checkout unexpectedly carries a subscription';
  END IF;
  IF v_engagement.stripe_customer_id IS NOT NULL
     AND v_customer_id IS DISTINCT FROM v_engagement.stripe_customer_id THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Stripe customer does not match attached checkout';
  END IF;
  IF v_engagement.stripe_payment_intent_id IS NOT NULL
     AND v_payment_intent_id IS DISTINCT FROM v_engagement.stripe_payment_intent_id THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Payment intent does not match the engagement';
  END IF;
  IF v_engagement.stripe_subscription_id IS NOT NULL
     AND v_subscription_id IS DISTINCT FROM v_engagement.stripe_subscription_id THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Subscription does not match the engagement';
  END IF;

  RETURN v_engagement_id;
END;
$$;

CREATE OR REPLACE FUNCTION public._validate_commercial_invoice_facts(p_payload JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_engagement_id UUID := (p_payload ->> 'sf_engagement_id')::UUID;
  v_engagement public.commercial_engagements%ROWTYPE;
  v_invoice_id TEXT := nullif(btrim(p_payload ->> 'invoice_id'), '');
  v_subscription_id TEXT := nullif(btrim(p_payload ->> 'subscription_id'), '');
  v_customer_id TEXT := nullif(btrim(p_payload ->> 'stripe_customer_id'), '');
  v_billing_reason TEXT := nullif(btrim(p_payload ->> 'billing_reason'), '');
  v_amount BIGINT := CASE
    WHEN (p_payload ->> 'event_type') = 'invoice.payment_failed'
      THEN (p_payload ->> 'amount_due')::BIGINT
    ELSE (p_payload ->> 'amount_paid')::BIGINT
  END;
BEGIN
  IF v_engagement_id IS NULL OR v_invoice_id IS NULL OR v_subscription_id IS NULL
     OR v_customer_id IS NULL OR v_billing_reason IS NULL
     OR v_billing_reason NOT IN ('subscription_create', 'subscription_cycle')
     OR nullif(btrim(p_payload ->> 'sf_offer_price_id'), '') IS NULL
     OR nullif(btrim(p_payload ->> 'stripe_price_id'), '') IS NULL
     OR (p_payload ->> 'line_item_count')::INTEGER IS DISTINCT FROM 1
     OR (p_payload ->> 'quantity')::INTEGER IS DISTINCT FROM 1
     OR v_amount IS NULL OR v_amount < 0
     OR nullif(btrim(p_payload ->> 'currency'), '') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Verified invoice facts are incomplete';
  END IF;

  SELECT * INTO v_engagement
  FROM public.commercial_engagements
  WHERE id = v_engagement_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Invoice engagement does not exist';
  END IF;

  IF v_engagement.offer_phase <> 'monitoring'
     OR v_engagement.billing_interval <> 'monthly'
     OR v_engagement.client_id IS NULL
     OR v_engagement.offer_price_id IS DISTINCT FROM (p_payload ->> 'sf_offer_price_id')
     OR v_engagement.authorization_kind IS DISTINCT FROM (p_payload ->> 'sf_authorization_kind')
     OR v_engagement.catalog_version IS DISTINCT FROM (p_payload ->> 'sf_catalog_version')
     OR (
       v_engagement.stripe_subscription_id IS NULL
       AND v_billing_reason <> 'subscription_create'
     )
     OR (
       v_engagement.stripe_subscription_id IS NOT NULL
       AND v_engagement.stripe_subscription_id IS DISTINCT FROM v_subscription_id
     )
     OR (
       v_engagement.stripe_customer_id IS NULL
       AND v_billing_reason <> 'subscription_create'
     )
     OR (
       v_engagement.stripe_customer_id IS NOT NULL
       AND v_engagement.stripe_customer_id IS DISTINCT FROM v_customer_id
     )
     OR v_engagement.stripe_price_id IS DISTINCT FROM (p_payload ->> 'stripe_price_id')
     OR v_engagement.amount_cents IS DISTINCT FROM v_amount
     OR v_engagement.currency IS DISTINCT FROM lower(p_payload ->> 'currency') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Verified invoice facts do not match the Monitoring engagement';
  END IF;

  IF v_billing_reason = 'subscription_create'
     AND (v_engagement.stripe_subscription_id IS NULL OR v_engagement.stripe_customer_id IS NULL) THEN
    UPDATE public.commercial_engagements
    SET stripe_subscription_id = coalesce(stripe_subscription_id, v_subscription_id),
        stripe_customer_id = coalesce(stripe_customer_id, v_customer_id)
    WHERE id = v_engagement_id;
  END IF;

  RETURN v_engagement_id;
END;
$$;

REVOKE ALL ON FUNCTION public._validate_commercial_checkout_facts(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._validate_commercial_invoice_facts(JSONB) FROM PUBLIC, anon, authenticated;

-- ── 8. Checkout webhook transitions ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.record_commercial_checkout_pending(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_claim JSONB;
  v_result JSONB;
  v_engagement_id UUID;
  v_engagement public.commercial_engagements%ROWTYPE;
  v_transaction_id UUID;
  v_event_id TEXT := nullif(btrim(p_payload ->> 'event_id'), '');
  v_event_type TEXT := nullif(btrim(p_payload ->> 'event_type'), '');
  v_payment_status TEXT := lower(nullif(btrim(p_payload ->> 'payment_status'), ''));
  v_customer_id TEXT := nullif(btrim(p_payload ->> 'stripe_customer_id'), '');
  v_payment_intent_id TEXT := nullif(btrim(p_payload ->> 'payment_intent_id'), '');
  v_subscription_id TEXT := nullif(btrim(p_payload ->> 'subscription_id'), '');
BEGIN
  IF v_event_type IS DISTINCT FROM 'checkout.session.completed'
     OR v_payment_status IS NULL
     OR v_payment_status NOT IN ('unpaid', 'processing') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Checkout-pending RPC received a non-pending event';
  END IF;

  v_claim := public._begin_commercial_webhook_event(p_payload);
  IF (v_claim ->> 'duplicate')::BOOLEAN THEN
    RETURN coalesce(v_claim -> 'result', '{}'::jsonb)
      || jsonb_build_object('status', 'duplicate', 'event_id', v_event_id);
  END IF;

  v_engagement_id := public._validate_commercial_checkout_facts(p_payload);
  SELECT * INTO v_engagement
  FROM public.commercial_engagements
  WHERE id = v_engagement_id
  FOR UPDATE;

  IF v_engagement.billing_state = 'paid' THEN
    SELECT id INTO v_transaction_id
    FROM public.commercial_transactions
    WHERE engagement_id = v_engagement_id
      AND kind = 'checkout' AND status = 'succeeded'
    ORDER BY created_at
    LIMIT 1;

    v_result := jsonb_build_object(
      'status', 'duplicate', 'event_id', v_event_id,
      'engagement_id', v_engagement_id,
      'transaction_id', v_transaction_id,
      'billing_state', v_engagement.billing_state,
      'delivery_state', v_engagement.delivery_state,
      'outbox_id', NULL
    );
    PERFORM public._finish_commercial_webhook_event(v_event_id, 'processed', v_result);
    RETURN v_result;
  END IF;

  IF v_engagement.billing_state NOT IN ('checkout_pending', 'payment_pending')
     OR v_engagement.delivery_state <> 'blocked' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Engagement cannot enter payment_pending from its current state';
  END IF;

  INSERT INTO public.commercial_transactions (
    engagement_id, stripe_event_id, kind, status, offer_price_id,
    stripe_price_id, amount_cents, currency, stripe_checkout_session_id,
    stripe_payment_intent_id, occurred_at
  ) VALUES (
    v_engagement_id, v_event_id, 'checkout', 'pending',
    v_engagement.offer_price_id, v_engagement.stripe_price_id,
    (p_payload ->> 'amount_total')::BIGINT, lower(p_payload ->> 'currency'),
    p_payload ->> 'checkout_session_id', v_payment_intent_id,
    (p_payload ->> 'event_created_at')::TIMESTAMPTZ
  )
  RETURNING id INTO v_transaction_id;

  UPDATE public.commercial_engagements
  SET billing_state = 'payment_pending',
      delivery_state = 'blocked',
      stripe_customer_id = coalesce(stripe_customer_id, v_customer_id),
      stripe_payment_intent_id = coalesce(stripe_payment_intent_id, v_payment_intent_id),
      stripe_subscription_id = coalesce(stripe_subscription_id, v_subscription_id),
      state_reason = 'Stripe Checkout completed with payment still pending'
  WHERE id = v_engagement_id;

  v_result := jsonb_build_object(
    'status', 'pending', 'event_id', v_event_id,
    'engagement_id', v_engagement_id,
    'transaction_id', v_transaction_id,
    'billing_state', 'payment_pending',
    'delivery_state', 'blocked',
    'outbox_id', NULL
  );
  PERFORM public._finish_commercial_webhook_event(v_event_id, 'processed', v_result);
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_commercial_checkout_paid(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_claim JSONB;
  v_result JSONB;
  v_engagement_id UUID;
  v_engagement public.commercial_engagements%ROWTYPE;
  v_transaction public.commercial_transactions%ROWTYPE;
  v_client_id UUID;
  v_outbox_id UUID;
  v_event_id TEXT := nullif(btrim(p_payload ->> 'event_id'), '');
  v_event_type TEXT := nullif(btrim(p_payload ->> 'event_type'), '');
  v_payment_status TEXT := lower(nullif(btrim(p_payload ->> 'payment_status'), ''));
  v_customer_id TEXT := nullif(btrim(p_payload ->> 'stripe_customer_id'), '');
  v_payment_intent_id TEXT := nullif(btrim(p_payload ->> 'payment_intent_id'), '');
  v_subscription_id TEXT := nullif(btrim(p_payload ->> 'subscription_id'), '');
  v_period_start TIMESTAMPTZ := nullif(p_payload ->> 'billing_period_start', '')::TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ := nullif(p_payload ->> 'billing_period_end', '')::TIMESTAMPTZ;
BEGIN
  IF v_event_type IS NULL
     OR v_event_type NOT IN ('checkout.session.completed', 'checkout.session.async_payment_succeeded')
     OR v_payment_status IS DISTINCT FROM 'paid' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Checkout-paid RPC requires a verified paid Checkout event';
  END IF;

  v_claim := public._begin_commercial_webhook_event(p_payload);
  IF (v_claim ->> 'duplicate')::BOOLEAN THEN
    RETURN coalesce(v_claim -> 'result', '{}'::jsonb)
      || jsonb_build_object('status', 'duplicate', 'event_id', v_event_id);
  END IF;

  v_engagement_id := public._validate_commercial_checkout_facts(p_payload);
  SELECT * INTO v_engagement
  FROM public.commercial_engagements
  WHERE id = v_engagement_id
  FOR UPDATE;

  SELECT * INTO v_transaction
  FROM public.commercial_transactions
  WHERE stripe_checkout_session_id = v_engagement.stripe_checkout_session_id
    AND kind = 'checkout' AND status = 'succeeded'
  FOR UPDATE;

  IF FOUND THEN
    IF v_transaction.engagement_id IS DISTINCT FROM v_engagement_id
       OR v_transaction.offer_price_id IS DISTINCT FROM v_engagement.offer_price_id
       OR v_transaction.amount_cents IS DISTINCT FROM v_engagement.amount_cents
       OR v_transaction.currency IS DISTINCT FROM v_engagement.currency THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Checkout session is already paid against different commercial facts';
    END IF;

    v_result := jsonb_build_object(
      'status', 'duplicate', 'event_id', v_event_id,
      'engagement_id', v_engagement_id,
      'transaction_id', v_transaction.id,
      'billing_state', v_engagement.billing_state,
      'delivery_state', v_engagement.delivery_state,
      'outbox_id', NULL
    );
    PERFORM public._finish_commercial_webhook_event(v_event_id, 'processed', v_result);
    RETURN v_result;
  END IF;

  IF v_engagement.billing_state NOT IN ('checkout_pending', 'payment_pending', 'payment_failed')
     OR v_engagement.delivery_state <> 'blocked'
     OR v_engagement.paid_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Engagement cannot transition to paid from its current state';
  END IF;

  v_client_id := v_engagement.client_id;
  IF v_client_id IS NULL THEN
    IF v_engagement.authorization_kind <> 'public_diagnostic'
       OR v_engagement.offer_phase <> 'diagnostic' THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Only a public Diagnostic may create its client at payment commit';
    END IF;

    INSERT INTO public.clients (
      company_name, contact_name, contact_email, industry, source_platform,
      segment, target_url, custom_fields
    ) VALUES (
      v_engagement.intake_company_name,
      v_engagement.intake_contact_name,
      v_engagement.intake_email,
      v_engagement.intake_industry,
      'public_diagnostic_checkout',
      CASE v_engagement.offer_line WHEN 'dwy' THEN 'microdosing' ELSE 'high_ticket' END,
      v_engagement.target_url,
      jsonb_build_object(
        'commercial_engagement_id', v_engagement.id,
        'commercial_request_key', v_engagement.request_key,
        'scope_brief', v_engagement.scope_brief,
        'catalog_version', v_engagement.catalog_version
      )
    )
    RETURNING id INTO v_client_id;
  END IF;

  INSERT INTO public.commercial_transactions (
    engagement_id, stripe_event_id, kind, status, offer_price_id,
    stripe_price_id, amount_cents, currency, stripe_checkout_session_id,
    stripe_payment_intent_id, billing_period_start, billing_period_end,
    occurred_at
  ) VALUES (
    v_engagement_id, v_event_id, 'checkout', 'succeeded',
    v_engagement.offer_price_id, v_engagement.stripe_price_id,
    (p_payload ->> 'amount_total')::BIGINT, lower(p_payload ->> 'currency'),
    p_payload ->> 'checkout_session_id', v_payment_intent_id,
    v_period_start, v_period_end,
    (p_payload ->> 'event_created_at')::TIMESTAMPTZ
  )
  RETURNING * INTO v_transaction;

  UPDATE public.commercial_engagements
  SET client_id = v_client_id,
      billing_state = 'paid',
      delivery_state = 'ready',
      state_reason = NULL,
      stripe_customer_id = coalesce(stripe_customer_id, v_customer_id),
      stripe_payment_intent_id = coalesce(stripe_payment_intent_id, v_payment_intent_id),
      stripe_subscription_id = coalesce(stripe_subscription_id, v_subscription_id),
      paid_at = (p_payload ->> 'event_created_at')::TIMESTAMPTZ,
      current_period_start = v_period_start,
      current_period_end = v_period_end
  WHERE id = v_engagement_id;

  -- Compatibility projection for the existing admin revenue UI. The canonical
  -- transaction above remains the only idempotency and entitlement record.
  INSERT INTO public.payments (
    stripe_session_id, stripe_customer_id, stripe_payment_intent,
    email, amount_total, currency, product_name, segment,
    referral_code, raw_event, lead_id,
    commercial_transaction_id, commercial_engagement_id,
    offer_price_id, is_canonical_projection
  ) VALUES (
    v_engagement.stripe_checkout_session_id,
    v_customer_id,
    v_payment_intent_id,
    v_engagement.intake_email,
    v_engagement.amount_cents,
    v_engagement.currency,
    v_engagement.offer_name,
    upper(v_engagement.offer_line),
    nullif(v_engagement.metadata ->> 'referral_code', ''),
    p_payload -> 'event_payload',
    NULL,
    v_transaction.id,
    v_engagement_id,
    v_engagement.offer_price_id,
    true
  );

  v_outbox_id := public._enqueue_commercial_outbox(
    v_event_id,
    v_engagement_id,
    'checkout_confirmation',
    'commercial.checkout_paid.' || v_engagement.offer_price_id || '.v1',
    v_engagement.amount_cents,
    jsonb_build_object(
      'transaction_id', v_transaction.id,
      'client_id', v_client_id,
      'payment_intent_id', v_payment_intent_id,
      'subscription_id', v_subscription_id
    )
  );

  v_result := jsonb_build_object(
    'status', 'processed', 'event_id', v_event_id,
    'engagement_id', v_engagement_id,
    'client_id', v_client_id,
    'transaction_id', v_transaction.id,
    'billing_state', 'paid',
    'delivery_state', 'ready',
    'outbox_id', v_outbox_id
  );
  PERFORM public._finish_commercial_webhook_event(v_event_id, 'processed', v_result);
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_commercial_checkout_failed(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_claim JSONB;
  v_result JSONB;
  v_engagement_id UUID;
  v_engagement public.commercial_engagements%ROWTYPE;
  v_transaction_id UUID;
  v_outbox_id UUID;
  v_event_id TEXT := nullif(btrim(p_payload ->> 'event_id'), '');
  v_event_type TEXT := nullif(btrim(p_payload ->> 'event_type'), '');
  v_payment_status TEXT := lower(nullif(btrim(p_payload ->> 'payment_status'), ''));
  v_suppress BOOLEAN := coalesce((p_payload ->> 'suppress_customer_notification')::BOOLEAN, false);
  v_failure_code TEXT := nullif(btrim(p_payload ->> 'failure_code'), '');
  v_integrity_failure BOOLEAN;
  v_failure_reason TEXT := coalesce(
    nullif(btrim(p_payload ->> 'failure_reason'), ''),
    nullif(btrim(p_payload ->> 'failure_message'), ''),
    'Stripe reported that Checkout payment failed'
  );
BEGIN
  v_claim := public._begin_commercial_webhook_event(p_payload);
  IF (v_claim ->> 'duplicate')::BOOLEAN THEN
    RETURN coalesce(v_claim -> 'result', '{}'::jsonb)
      || jsonb_build_object('status', 'duplicate', 'event_id', v_event_id);
  END IF;

  v_integrity_failure := v_suppress
    AND coalesce(v_failure_code, '') <> 'checkout_expired';

  -- Deterministic metadata/catalog/line failures are durably quarantined even
  -- when no trustworthy engagement UUID exists. They never create entitlement,
  -- transaction, customer communication, or guessed ownership.
  IF v_integrity_failure THEN
    v_result := jsonb_build_object(
      'status', 'failed',
      'event_id', v_event_id,
      'engagement_id', CASE
        WHEN coalesce(p_payload ->> 'sf_engagement_id', p_payload ->> 'engagement_id')
          ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          THEN coalesce(p_payload ->> 'sf_engagement_id', p_payload ->> 'engagement_id')
        ELSE NULL
      END,
      'transaction_id', NULL,
      'billing_state', NULL,
      'delivery_state', 'needs_review',
      'outbox_id', NULL,
      'needs_review', true,
      'failure_code', v_failure_code
    );
    PERFORM public._finish_commercial_webhook_event(
      v_event_id, 'needs_review', v_result, coalesce(v_failure_code, v_failure_reason)
    );
    RETURN v_result;
  END IF;

  IF v_event_type IS NULL
     OR v_event_type NOT IN ('checkout.session.async_payment_failed', 'checkout.session.expired')
     OR v_payment_status IS NULL
     OR v_payment_status NOT IN ('unpaid', 'failed') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Checkout-failed RPC received a non-failure event';
  END IF;

  v_engagement_id := public._validate_commercial_checkout_facts(p_payload);
  SELECT * INTO v_engagement
  FROM public.commercial_engagements
  WHERE id = v_engagement_id
  FOR UPDATE;

  IF v_engagement.billing_state = 'paid' THEN
    SELECT id INTO v_transaction_id
    FROM public.commercial_transactions
    WHERE engagement_id = v_engagement_id
      AND kind = 'checkout' AND status = 'succeeded'
    ORDER BY created_at
    LIMIT 1;
    v_result := jsonb_build_object(
      'status', 'duplicate', 'event_id', v_event_id,
      'engagement_id', v_engagement_id,
      'transaction_id', v_transaction_id,
      'billing_state', v_engagement.billing_state,
      'delivery_state', v_engagement.delivery_state,
      'outbox_id', NULL
    );
    PERFORM public._finish_commercial_webhook_event(v_event_id, 'processed', v_result);
    RETURN v_result;
  END IF;

  -- The service boundary can expire a Session and persist its cancellation
  -- before Stripe delivers checkout.session.expired. The validator above has
  -- already proved the exact immutable engagement and Session, so that signed
  -- event must converge with the local terminal state instead of retrying
  -- forever. Any other attempt to write a failure over a cancelled row remains
  -- rejected.
  IF v_event_type = 'checkout.session.expired'
     AND v_engagement.billing_state = 'cancelled'
     AND v_engagement.delivery_state = 'cancelled'
     AND v_engagement.paid_at IS NULL THEN
    NULL;
  ELSIF v_engagement.billing_state NOT IN ('checkout_pending', 'payment_pending', 'payment_failed')
        OR v_engagement.delivery_state <> 'blocked' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Engagement cannot transition to a terminal checkout failure';
  END IF;

  INSERT INTO public.commercial_transactions (
    engagement_id, stripe_event_id, kind, status, offer_price_id,
    stripe_price_id, amount_cents, currency, stripe_checkout_session_id,
    stripe_payment_intent_id, occurred_at
  ) VALUES (
    v_engagement_id, v_event_id, 'checkout', 'failed',
    v_engagement.offer_price_id, v_engagement.stripe_price_id,
    coalesce((p_payload ->> 'amount_total')::BIGINT, v_engagement.amount_cents),
    coalesce(lower(p_payload ->> 'currency'), v_engagement.currency),
    p_payload ->> 'checkout_session_id', nullif(p_payload ->> 'payment_intent_id', ''),
    (p_payload ->> 'event_created_at')::TIMESTAMPTZ
  )
  RETURNING id INTO v_transaction_id;

  -- A provider-declared asynchronous failure and an expiration are both
  -- terminal Session outcomes. A retry therefore needs a fresh request key and
  -- a new immutable engagement/Session rather than replaying this Session's
  -- fixed Stripe idempotency key.
  UPDATE public.commercial_engagements
  SET billing_state = 'cancelled',
      delivery_state = 'cancelled',
      checkout_cancelled_at = coalesce(
        checkout_cancelled_at,
        (p_payload ->> 'event_created_at')::TIMESTAMPTZ
      ),
      checkout_cancellation_reason = coalesce(
        checkout_cancellation_reason,
        CASE
          WHEN v_event_type = 'checkout.session.expired' THEN 'checkout_expired'
          ELSE 'async_payment_failed'
        END
      ),
      state_reason = CASE
        WHEN billing_state = 'cancelled' THEN coalesce(state_reason, v_failure_reason)
        ELSE v_failure_reason
      END
  WHERE id = v_engagement_id;

  -- Expiration is never customer-notification work, even if a future caller
  -- accidentally omits the suppression flag. Async payment failure retains its
  -- offer-specific failure notification.
  IF NOT v_suppress AND v_event_type <> 'checkout.session.expired' THEN
    v_outbox_id := public._enqueue_commercial_outbox(
      v_event_id,
      v_engagement_id,
      'checkout_payment_failed',
      'commercial.checkout_failed.' || v_engagement.offer_price_id || '.v1',
      v_engagement.amount_cents,
      jsonb_build_object(
        'transaction_id', v_transaction_id,
        'failure_reason', v_failure_reason,
        'failure_code', p_payload ->> 'failure_code',
        'failure_message', p_payload ->> 'failure_message',
        'failure_details', coalesce(p_payload -> 'failure_details', '{}'::jsonb)
      )
    );
  END IF;

  v_result := jsonb_build_object(
    'status', 'failed', 'event_id', v_event_id,
    'engagement_id', v_engagement_id,
    'transaction_id', v_transaction_id,
    'billing_state', 'cancelled',
    'delivery_state', 'cancelled',
    'outbox_id', v_outbox_id
  );
  PERFORM public._finish_commercial_webhook_event(v_event_id, 'processed', v_result);
  RETURN v_result;
END;
$$;

-- ── 9. Monitoring invoice transitions ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.record_commercial_invoice_paid(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_claim JSONB;
  v_result JSONB;
  v_engagement_id UUID;
  v_engagement public.commercial_engagements%ROWTYPE;
  v_transaction public.commercial_transactions%ROWTYPE;
  v_checkout_transaction_id UUID;
  v_outbox_id UUID;
  v_event_id TEXT := nullif(btrim(p_payload ->> 'event_id'), '');
  v_event_type TEXT := nullif(btrim(p_payload ->> 'event_type'), '');
  v_billing_reason TEXT := nullif(btrim(p_payload ->> 'billing_reason'), '');
  v_period_start TIMESTAMPTZ := nullif(p_payload ->> 'billing_period_start', '')::TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ := nullif(p_payload ->> 'billing_period_end', '')::TIMESTAMPTZ;
BEGIN
  IF v_event_type IS DISTINCT FROM 'invoice.paid'
     OR v_billing_reason IS NULL
     OR v_billing_reason NOT IN ('subscription_create', 'subscription_cycle') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invoice-paid RPC received an unsupported invoice event';
  END IF;

  v_claim := public._begin_commercial_webhook_event(p_payload);
  IF (v_claim ->> 'duplicate')::BOOLEAN THEN
    RETURN coalesce(v_claim -> 'result', '{}'::jsonb)
      || jsonb_build_object('status', 'duplicate', 'event_id', v_event_id);
  END IF;

  v_engagement_id := public._validate_commercial_invoice_facts(p_payload);
  SELECT * INTO v_engagement
  FROM public.commercial_engagements
  WHERE id = v_engagement_id
  FOR UPDATE;

  -- Stripe emits invoice.paid for the invoice created by a subscription-mode
  -- Checkout. checkout.session.completed is the single authoritative initial
  -- transaction/entitlement event; recording this invoice again would double
  -- revenue and send a false renewal message.
  IF v_billing_reason = 'subscription_create' THEN
    IF v_period_start IS NULL OR v_period_end IS NULL OR v_period_end <= v_period_start THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'Initial Monitoring invoice requires a valid billing period';
    END IF;

    SELECT id INTO v_checkout_transaction_id
    FROM public.commercial_transactions
    WHERE engagement_id = v_engagement_id
      AND kind = 'checkout' AND status = 'succeeded'
    ORDER BY created_at
    LIMIT 1;

    IF v_checkout_transaction_id IS NULL OR v_engagement.billing_state <> 'paid' THEN
      -- Deliberately leave the webhook event in processing state. The handler
      -- treats this result as retryable (5xx); a later Stripe retry re-enters
      -- this RPC after checkout.session.completed commits the initial charge.
      RETURN jsonb_build_object(
        'status', 'pending_initial_checkout', 'event_id', v_event_id,
        'engagement_id', v_engagement_id,
        'transaction_id', NULL,
        'billing_state', v_engagement.billing_state,
        'delivery_state', v_engagement.delivery_state,
        'outbox_id', NULL,
        'billing_reason', v_billing_reason
      );
    END IF;

    -- The Checkout event owns revenue/entitlement, while the verified initial
    -- invoice owns the subscription-period boundary. Populate it only if a
    -- later cycle has not already advanced the aggregate.
    UPDATE public.commercial_engagements
    SET current_period_start = coalesce(current_period_start, v_period_start),
        current_period_end = coalesce(current_period_end, v_period_end)
    WHERE id = v_engagement_id;

    v_result := jsonb_build_object(
      'status', 'duplicate', 'event_id', v_event_id,
      'engagement_id', v_engagement_id,
      'transaction_id', v_checkout_transaction_id,
      'billing_state', v_engagement.billing_state,
      'delivery_state', v_engagement.delivery_state,
      'outbox_id', NULL,
      'billing_reason', v_billing_reason
    );
    PERFORM public._finish_commercial_webhook_event(v_event_id, 'processed', v_result);
    RETURN v_result;
  END IF;

  IF v_period_start IS NULL OR v_period_end IS NULL OR v_period_end <= v_period_start THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Renewal invoice requires a valid billing period';
  END IF;

  SELECT * INTO v_transaction
  FROM public.commercial_transactions
  WHERE stripe_invoice_id = (p_payload ->> 'invoice_id')
    AND kind = 'renewal' AND status = 'succeeded'
  FOR UPDATE;

  IF FOUND THEN
    IF v_transaction.engagement_id IS DISTINCT FROM v_engagement_id
       OR v_transaction.offer_price_id IS DISTINCT FROM v_engagement.offer_price_id
       OR v_transaction.amount_cents IS DISTINCT FROM v_engagement.amount_cents
       OR v_transaction.currency IS DISTINCT FROM v_engagement.currency THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Invoice is already paid against different commercial facts';
    END IF;
    v_result := jsonb_build_object(
      'status', 'duplicate', 'event_id', v_event_id,
      'engagement_id', v_engagement_id,
      'transaction_id', v_transaction.id,
      'billing_state', v_engagement.billing_state,
      'delivery_state', v_engagement.delivery_state,
      'outbox_id', NULL,
      'billing_reason', v_billing_reason
    );
    PERFORM public._finish_commercial_webhook_event(v_event_id, 'processed', v_result);
    RETURN v_result;
  END IF;

  IF v_engagement.billing_state NOT IN ('paid', 'past_due')
     OR v_engagement.delivery_state NOT IN ('ready', 'in_progress', 'active', 'paused')
     OR v_engagement.paid_at IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Monitoring engagement cannot accept a renewal in its current state';
  END IF;

  INSERT INTO public.commercial_transactions (
    engagement_id, stripe_event_id, kind, status, offer_price_id,
    stripe_price_id, amount_cents, currency, stripe_payment_intent_id,
    stripe_invoice_id, stripe_charge_id, billing_period_start,
    billing_period_end, occurred_at
  ) VALUES (
    v_engagement_id, v_event_id, 'renewal', 'succeeded',
    v_engagement.offer_price_id, v_engagement.stripe_price_id,
    (p_payload ->> 'amount_paid')::BIGINT, lower(p_payload ->> 'currency'),
    nullif(p_payload ->> 'payment_intent_id', ''),
    p_payload ->> 'invoice_id', nullif(p_payload ->> 'charge_id', ''),
    v_period_start, v_period_end,
    (p_payload ->> 'event_created_at')::TIMESTAMPTZ
  )
  RETURNING * INTO v_transaction;

  UPDATE public.commercial_engagements
  SET billing_state = 'paid',
      delivery_state = CASE
        WHEN delivery_state = 'paused' AND first_delivery_at IS NOT NULL THEN 'active'
        WHEN delivery_state = 'paused' THEN 'ready'
        ELSE delivery_state
      END,
      state_reason = NULL,
      current_period_start = v_period_start,
      current_period_end = v_period_end
  WHERE id = v_engagement_id;

  SELECT * INTO v_engagement
  FROM public.commercial_engagements
  WHERE id = v_engagement_id;

  v_outbox_id := public._enqueue_commercial_outbox(
    v_event_id,
    v_engagement_id,
    'monitoring_renewal_confirmation',
    'commercial.invoice_paid.' || v_engagement.offer_price_id || '.v1',
    v_engagement.amount_cents,
    jsonb_build_object(
      'transaction_id', v_transaction.id,
      'invoice_id', p_payload ->> 'invoice_id',
      'billing_reason', v_billing_reason,
      'billing_period_start', v_period_start,
      'billing_period_end', v_period_end
    )
  );

  v_result := jsonb_build_object(
    'status', 'processed', 'event_id', v_event_id,
    'engagement_id', v_engagement_id,
    'transaction_id', v_transaction.id,
    'billing_state', v_engagement.billing_state,
    'delivery_state', v_engagement.delivery_state,
    'outbox_id', v_outbox_id,
    'billing_reason', v_billing_reason
  );
  PERFORM public._finish_commercial_webhook_event(v_event_id, 'processed', v_result);
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_commercial_invoice_failed(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_claim JSONB;
  v_result JSONB;
  v_engagement_id UUID;
  v_engagement public.commercial_engagements%ROWTYPE;
  v_transaction_id UUID;
  v_checkout_transaction_id UUID;
  v_outbox_id UUID;
  v_event_id TEXT := nullif(btrim(p_payload ->> 'event_id'), '');
  v_event_type TEXT := nullif(btrim(p_payload ->> 'event_type'), '');
  v_billing_reason TEXT := nullif(btrim(p_payload ->> 'billing_reason'), '');
  v_suppress BOOLEAN := coalesce((p_payload ->> 'suppress_customer_notification')::BOOLEAN, false);
  v_failure_code TEXT := nullif(btrim(p_payload ->> 'failure_code'), '');
  v_failure_reason TEXT := coalesce(
    nullif(btrim(p_payload ->> 'failure_reason'), ''),
    nullif(btrim(p_payload ->> 'failure_message'), ''),
    'Stripe reported that the Monitoring invoice payment failed'
  );
  v_period_start TIMESTAMPTZ := nullif(p_payload ->> 'billing_period_start', '')::TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ := nullif(p_payload ->> 'billing_period_end', '')::TIMESTAMPTZ;
BEGIN
  v_claim := public._begin_commercial_webhook_event(p_payload);
  IF (v_claim ->> 'duplicate')::BOOLEAN THEN
    RETURN coalesce(v_claim -> 'result', '{}'::jsonb)
      || jsonb_build_object('status', 'duplicate', 'event_id', v_event_id);
  END IF;

  IF v_suppress THEN
    v_result := jsonb_build_object(
      'status', 'failed',
      'event_id', v_event_id,
      'engagement_id', CASE
        WHEN coalesce(p_payload ->> 'sf_engagement_id', p_payload ->> 'engagement_id')
          ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          THEN coalesce(p_payload ->> 'sf_engagement_id', p_payload ->> 'engagement_id')
        ELSE NULL
      END,
      'transaction_id', NULL,
      'billing_state', NULL,
      'delivery_state', 'needs_review',
      'outbox_id', NULL,
      'needs_review', true,
      'failure_code', v_failure_code
    );
    PERFORM public._finish_commercial_webhook_event(
      v_event_id, 'needs_review', v_result, coalesce(v_failure_code, v_failure_reason)
    );
    RETURN v_result;
  END IF;

  IF v_event_type IS DISTINCT FROM 'invoice.payment_failed'
     OR v_billing_reason IS NULL
     OR v_billing_reason NOT IN ('subscription_create', 'subscription_cycle') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invoice-failed RPC received an unsupported invoice event';
  END IF;

  v_engagement_id := public._validate_commercial_invoice_facts(p_payload);
  SELECT * INTO v_engagement
  FROM public.commercial_engagements
  WHERE id = v_engagement_id
  FOR UPDATE;

  -- Initial subscription failure is owned by
  -- checkout.session.async_payment_failed, mirroring the paid dedupe above.
  IF v_billing_reason = 'subscription_create' THEN
    SELECT id INTO v_checkout_transaction_id
    FROM public.commercial_transactions
    WHERE engagement_id = v_engagement_id
      AND kind = 'checkout' AND status IN ('failed', 'succeeded')
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_checkout_transaction_id IS NULL THEN
      -- Match invoice.paid ordering: the Checkout outcome owns the initial
      -- subscription charge. Leave this event processing and make Stripe retry
      -- until async_payment_failed or checkout.session.completed commits it.
      RETURN jsonb_build_object(
        'status', 'pending_initial_checkout', 'event_id', v_event_id,
        'engagement_id', v_engagement_id,
        'transaction_id', NULL,
        'billing_state', v_engagement.billing_state,
        'delivery_state', v_engagement.delivery_state,
        'outbox_id', NULL,
        'billing_reason', v_billing_reason
      );
    END IF;

    v_result := jsonb_build_object(
      'status', 'duplicate', 'event_id', v_event_id,
      'engagement_id', v_engagement_id,
      'transaction_id', v_checkout_transaction_id,
      'billing_state', v_engagement.billing_state,
      'delivery_state', v_engagement.delivery_state,
      'outbox_id', NULL,
      'billing_reason', v_billing_reason
    );
    PERFORM public._finish_commercial_webhook_event(v_event_id, 'processed', v_result);
    RETURN v_result;
  END IF;

  IF v_period_start IS NULL OR v_period_end IS NULL OR v_period_end <= v_period_start THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Failed renewal invoice requires a valid billing period';
  END IF;
  IF v_engagement.billing_state NOT IN ('paid', 'past_due')
     OR v_engagement.delivery_state NOT IN ('ready', 'in_progress', 'active', 'paused')
     OR v_engagement.paid_at IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Monitoring engagement cannot enter past_due from its current state';
  END IF;

  INSERT INTO public.commercial_transactions (
    engagement_id, stripe_event_id, kind, status, offer_price_id,
    stripe_price_id, amount_cents, currency, stripe_payment_intent_id,
    stripe_invoice_id, stripe_charge_id, billing_period_start,
    billing_period_end, occurred_at
  ) VALUES (
    v_engagement_id, v_event_id, 'renewal', 'failed',
    v_engagement.offer_price_id, v_engagement.stripe_price_id,
    (p_payload ->> 'amount_due')::BIGINT, lower(p_payload ->> 'currency'),
    nullif(p_payload ->> 'payment_intent_id', ''),
    p_payload ->> 'invoice_id', nullif(p_payload ->> 'charge_id', ''),
    v_period_start, v_period_end,
    (p_payload ->> 'event_created_at')::TIMESTAMPTZ
  )
  RETURNING id INTO v_transaction_id;

  UPDATE public.commercial_engagements
  SET billing_state = 'past_due',
      delivery_state = 'paused',
      state_reason = v_failure_reason,
      current_period_start = v_period_start,
      current_period_end = v_period_end
  WHERE id = v_engagement_id;

  IF NOT v_suppress THEN
    v_outbox_id := public._enqueue_commercial_outbox(
      v_event_id,
      v_engagement_id,
      'monitoring_payment_failed',
      'commercial.invoice_failed.' || v_engagement.offer_price_id || '.v1',
      v_engagement.amount_cents,
      jsonb_build_object(
        'transaction_id', v_transaction_id,
        'invoice_id', p_payload ->> 'invoice_id',
        'billing_reason', v_billing_reason,
        'billing_period_start', v_period_start,
        'billing_period_end', v_period_end,
        'failure_reason', v_failure_reason,
        'failure_code', p_payload ->> 'failure_code',
        'failure_message', p_payload ->> 'failure_message',
        'failure_details', coalesce(p_payload -> 'failure_details', '{}'::jsonb)
      )
    );
  END IF;

  v_result := jsonb_build_object(
    'status', 'failed', 'event_id', v_event_id,
    'engagement_id', v_engagement_id,
    'transaction_id', v_transaction_id,
    'billing_state', 'past_due',
    'delivery_state', 'paused',
    'outbox_id', v_outbox_id,
    'billing_reason', v_billing_reason
  );
  PERFORM public._finish_commercial_webhook_event(v_event_id, 'processed', v_result);
  RETURN v_result;
END;
$$;

-- ── 10. Durable outbox dispatch ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.claim_commercial_outbox(p_event_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_event_id TEXT := nullif(btrim(p_event_id), '');
  v_outbox public.commercial_outbox%ROWTYPE;
BEGIN
  IF v_event_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'p_event_id is required';
  END IF;

  SELECT * INTO v_outbox
  FROM public.commercial_outbox
  WHERE webhook_event_id = v_event_id AND status = 'sent'
  ORDER BY sent_at DESC
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', 'already_sent', 'event_id', v_event_id,
      'outbox_id', v_outbox.id,
      'provider_message_id', v_outbox.provider_message_id
    );
  END IF;

  -- A worker that dies after claiming its final allowed attempt must not leave
  -- the row permanently "busy". Quarantine that exhausted stale lease before
  -- looking for retryable work.
  UPDATE public.commercial_outbox
  SET status = 'dead_letter',
      locked_at = NULL,
      last_error = coalesce(last_error, 'Outbox worker lease expired after final attempt')
  WHERE webhook_event_id = v_event_id
    AND status = 'processing'
    AND locked_at < now() - interval '15 minutes'
    AND attempt_count >= max_attempts;

  SELECT * INTO v_outbox
  FROM public.commercial_outbox
  WHERE webhook_event_id = v_event_id
    AND (
      (status IN ('pending', 'failed') AND available_at <= now())
      OR (status = 'processing' AND locked_at < now() - interval '15 minutes')
    )
    AND attempt_count < max_attempts
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    IF EXISTS (
      SELECT 1 FROM public.commercial_outbox
      WHERE webhook_event_id = v_event_id
        AND (
          status = 'processing'
          OR (status IN ('pending', 'failed') AND attempt_count < max_attempts)
        )
    ) THEN
      -- A failed row inside its backoff window is still unfinished durable
      -- work. Keep the provider retrying instead of acknowledging it as none.
      RETURN jsonb_build_object('status', 'busy', 'event_id', v_event_id, 'outbox_id', NULL);
    END IF;
    RETURN jsonb_build_object('status', 'none', 'event_id', v_event_id, 'outbox_id', NULL);
  END IF;

  UPDATE public.commercial_outbox
  SET status = 'processing',
      attempt_count = attempt_count + 1,
      locked_at = now(),
      last_error = NULL
  WHERE id = v_outbox.id
  RETURNING * INTO v_outbox;

  RETURN jsonb_build_object(
    'status', 'claimed',
    'event_id', v_event_id,
    'outbox_id', v_outbox.id,
    'kind', v_outbox.kind,
    'idempotency_key', v_outbox.idempotency_key,
    'recipient_email', v_outbox.recipient_email,
    'offer_price_id', v_outbox.offer_price_id,
    'offer_name', v_outbox.offer_name,
    'offer_line', v_outbox.offer_line,
    'offer_phase', v_outbox.offer_phase,
    'authorization_kind', v_outbox.authorization_kind,
    'amount_cents', v_outbox.amount_cents,
    'currency', v_outbox.currency,
    'billing_interval', v_outbox.billing_interval,
    'template_key', v_outbox.template_key,
    'payload', v_outbox.payload
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_commercial_outbox(
  p_outbox_id UUID,
  p_provider_message_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_provider_message_id TEXT := nullif(btrim(p_provider_message_id), '');
  v_outbox public.commercial_outbox%ROWTYPE;
BEGIN
  IF p_outbox_id IS NULL OR v_provider_message_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Outbox completion identifiers are required';
  END IF;

  SELECT * INTO v_outbox
  FROM public.commercial_outbox
  WHERE id = p_outbox_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Outbox row does not exist';
  END IF;

  IF v_outbox.status = 'sent' THEN
    IF v_outbox.provider_message_id IS DISTINCT FROM v_provider_message_id THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Outbox was completed with a different provider message';
    END IF;
    RETURN jsonb_build_object(
      'status', 'already_completed',
      'outbox_id', v_outbox.id,
      'event_id', v_outbox.webhook_event_id,
      'provider_message_id', v_outbox.provider_message_id
    );
  END IF;
  IF v_outbox.status <> 'processing' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Only a claimed outbox row can be completed';
  END IF;

  UPDATE public.commercial_outbox
  SET status = 'sent',
      provider_message_id = v_provider_message_id,
      sent_at = now(),
      locked_at = NULL,
      last_error = NULL
  WHERE id = p_outbox_id;

  RETURN jsonb_build_object(
    'status', 'completed',
    'outbox_id', p_outbox_id,
    'event_id', v_outbox.webhook_event_id,
    'provider_message_id', v_provider_message_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_commercial_outbox(
  p_outbox_id UUID,
  p_error TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_error TEXT := nullif(btrim(p_error), '');
  v_outbox public.commercial_outbox%ROWTYPE;
  v_next_attempt TIMESTAMPTZ;
  v_status TEXT;
BEGIN
  IF p_outbox_id IS NULL OR v_error IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Outbox failure identifiers are required';
  END IF;

  SELECT * INTO v_outbox
  FROM public.commercial_outbox
  WHERE id = p_outbox_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Outbox row does not exist';
  END IF;
  IF v_outbox.status <> 'processing' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Only a claimed outbox row can record failure';
  END IF;

  IF v_outbox.attempt_count >= v_outbox.max_attempts THEN
    v_status := 'dead_letter';
    v_next_attempt := NULL;
  ELSE
    v_status := 'failed';
    v_next_attempt := now() + make_interval(
      secs => least(3600.0, power(2.0, greatest(1, v_outbox.attempt_count)) * 15.0)
    );
  END IF;

  UPDATE public.commercial_outbox
  SET status = v_status,
      available_at = coalesce(v_next_attempt, available_at),
      locked_at = NULL,
      last_error = left(v_error, 1000)
  WHERE id = p_outbox_id;

  RETURN jsonb_build_object(
    'status', CASE WHEN v_status = 'dead_letter' THEN 'dead_letter' ELSE 'retry_scheduled' END,
    'outbox_id', p_outbox_id,
    'event_id', v_outbox.webhook_event_id,
    'attempt_count', v_outbox.attempt_count,
    'next_attempt_at', v_next_attempt
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.attach_commercial_scaffold(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_engagement_id UUID := (p_payload ->> 'engagement_id')::UUID;
  v_scaffold_id UUID := (p_payload ->> 'scaffold_id')::UUID;
  v_engagement public.commercial_engagements%ROWTYPE;
  v_scaffold public.diagnostic_scaffolds%ROWTYPE;
  v_status TEXT := 'attached';
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object'
     OR v_engagement_id IS NULL OR v_scaffold_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'engagement_id and scaffold_id are required';
  END IF;

  SELECT * INTO v_engagement
  FROM public.commercial_engagements
  WHERE id = v_engagement_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Commercial engagement does not exist';
  END IF;
  IF v_engagement.billing_state <> 'paid'
     OR v_engagement.delivery_state NOT IN ('ready', 'in_progress')
     OR v_engagement.offer_phase NOT IN ('diagnostic', 'expansion')
     OR v_engagement.client_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Engagement is not eligible for a diagnostic scaffold';
  END IF;

  SELECT * INTO v_scaffold
  FROM public.diagnostic_scaffolds
  WHERE id = v_scaffold_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Diagnostic scaffold does not exist';
  END IF;
  IF v_scaffold.client_id IS DISTINCT FROM v_engagement.client_id
     OR v_scaffold.status <> 'draft' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Scaffold client/status does not match the engagement';
  END IF;

  IF v_engagement.scaffold_id IS NOT NULL THEN
    IF v_engagement.scaffold_id IS DISTINCT FROM v_scaffold_id THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Engagement is already attached to a different scaffold';
    END IF;
    UPDATE public.commercial_engagements
    SET delivery_state = 'in_progress',
        state_reason = NULL
    WHERE id = v_engagement_id;
    v_status := 'existing';
  ELSE
    UPDATE public.commercial_engagements
    SET scaffold_id = v_scaffold_id,
        delivery_state = 'in_progress',
        state_reason = NULL
    WHERE id = v_engagement_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'status', v_status,
    'engagement_id', v_engagement_id,
    'scaffold_id', v_scaffold_id,
    'billing_state', 'paid',
    'delivery_state', 'in_progress'
  );
END;
$$;

-- ── 11. Function exposure ─────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.configure_commercial_analyst(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.activate_commercial_checkout(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.deactivate_commercial_checkout(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_commercial_public_intent(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_commercial_adjacent_intent(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attach_commercial_checkout_session(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_commercial_checkout_session(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_commercial_checkout_pending(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_commercial_checkout_paid(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_commercial_checkout_failed(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_commercial_invoice_paid(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_commercial_invoice_failed(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_commercial_outbox(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_commercial_outbox(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_commercial_outbox(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attach_commercial_scaffold(JSONB) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.configure_commercial_analyst(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_commercial_checkout(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.deactivate_commercial_checkout(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_commercial_public_intent(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_commercial_adjacent_intent(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_commercial_checkout_session(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_commercial_checkout_session(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_commercial_checkout_pending(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_commercial_checkout_paid(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_commercial_checkout_failed(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_commercial_invoice_paid(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_commercial_invoice_failed(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_commercial_outbox(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_commercial_outbox(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_commercial_outbox(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_commercial_scaffold(JSONB) TO service_role;

COMMIT;
