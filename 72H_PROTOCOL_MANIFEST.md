# 72H_PROTOCOL_MANIFEST.md
**Signal & Friction — 72-Hour Zero Friction Protocol**
Integration Specification Ledger | 2026-06-20

---

## 1. Architecture Overview

The protocol uses a hybrid topology: **Stripe → Make → Supabase**. Make owns the time-boxing (delayed execution at Minute 1, Hour 12, Hour 36). Supabase is the source of truth. No Next.js server code is involved — this runs entirely outside the application layer.

```
[Client pays via Stripe Payment Link]
            │
            ▼
[Stripe fires checkout.session.completed webhook]
            │
            ▼
    [Make Scenario: "SF 72H Protocol"]
            │
    ┌───────┼───────────────┐
    │       │               │
    ▼       ▼               ▼
[0 min]  [+12h wait]    [+24h wait]
    │       │               │
    ▼       ▼               ▼
[SendGrid  [PATCH clients  [AI scrape →
  email]    protocol_stage] sneak peek
            → activity_log] email]
```

---

## 2. Database State Machine

### 2.1 State Field: `clients.protocol_stage`

| Stage Value | Trigger | When |
|-------------|---------|------|
| `payment_confirmed` | DEFAULT on row creation | Immediately at Stripe webhook receipt |
| `heuristics_in_progress` | Make PATCH at Hour 12 | 12 hours after payment |
| `sneak_peek_delivered` | Make PATCH at Hour 36 | 36 hours after payment |
| `final_diagnostic_ready` | Manual update by Ernesto | After full diagnostic is complete |

### 2.2 New Columns on `public.clients`

```sql
protocol_stage  TEXT  CHECK (IN ('payment_confirmed', 'heuristics_in_progress',
                                 'sneak_peek_delivered', 'final_diagnostic_ready'))
                DEFAULT 'payment_confirmed'

target_url      TEXT   -- SaaS domain submitted in the diagnostic form

metadata_log    JSONB  DEFAULT '{}'  -- Rolling log of Make payloads and responses
```

### 2.3 Audit Table: `public.protocol_executions`

```sql
id                UUID  PK
client_id         UUID  → clients.id (nullable)
stripe_session_id TEXT  NOT NULL
customer_email    TEXT  NOT NULL
price_id          TEXT  NOT NULL
amount_total      INT   -- cents
target_url        TEXT
execution_stage   TEXT  CHECK (IN ('minute_1_email', 'hour_12_dashboard', 'hour_36_sneak_peek'))
make_scenario_id  TEXT  -- Make execution ID
http_status       INT   -- Supabase REST response code
payload_sent      JSONB
response_received JSONB
error_message     TEXT
executed_at       TIMESTAMPTZ DEFAULT now()
```

Migration file: `supabase/migrations/20260620000200_72h_protocol_schema.sql`

---

## 3. Webhook Payload Definitions

### 3.1 Stripe → Make: Inbound Payload

Make listens on a custom webhook URL (`Webhooks > Custom Webhook` module). Stripe sends the full `checkout.session.completed` object. The Make scenario extracts these keys:

```json
{
  "id": "cs_live_a1B2c3D4e5F6g7H8i9J0",
  "object": "checkout.session",
  "amount_total": 200000,
  "currency": "usd",
  "customer_details": {
    "email": "founder@company.com",
    "name": "Alex Chen"
  },
  "metadata": {
    "target_url": "https://company.com/pricing",
    "cognitive_archetype": "High Traffic, Low Pricing Conversion",
    "estimated_leak": "$20,000 - $50,000 / mo"
  },
  "payment_intent": "pi_3Abc123XYZ",
  "payment_status": "paid",
  "subscription": null
}
```

**Required Stripe configuration:** Add `target_url`, `cognitive_archetype`, `estimated_leak` to the Stripe Checkout Session `metadata` object when creating the session (already implemented in `/src/app/...` form submit handler).

**Make extraction mapping:**

| Make Variable | Stripe Path |
|---------------|------------|
| `customer_email` | `customer_details.email` |
| `customer_name` | `customer_details.name` |
| `amount_total` | `amount_total` (divide by 100 for display) |
| `price_id` | `line_items.data[0].price.id` (via API call module) |
| `target_url` | `metadata.target_url` |
| `session_id` | `id` |
| `payment_intent_id` | `payment_intent` |

### 3.2 Make → Supabase REST API: Stage Patch Payloads

Make uses the **HTTP module** (not the Supabase module) to issue PATCH requests directly against the Supabase REST API.

#### Authorization Headers (all three stage patches)

```
Authorization: Bearer {{SUPABASE_SERVICE_ROLE_KEY}}
apikey: {{SUPABASE_ANON_KEY}}
Content-Type: application/json
Prefer: return=representation
```

> **Environment variables in Make:** Store `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, and `SUPABASE_URL` as Make data stores or Connection > Custom API credentials. Never hardcode in scenario JSON.

#### Stage 1 — Minute 1: Create client record + log execution

**UPSERT** `public.clients` (insert if email not found):

```
Method: POST
URL: {{SUPABASE_URL}}/rest/v1/clients
Headers: (above)
Prefer: resolution=merge-duplicates,return=representation

Body:
{
  "company_name": "{{customer_name}} (via Stripe)",
  "contact_name": "{{customer_name}}",
  "contact_email": "{{customer_email}}",
  "industry": "SaaS",
  "estimated_mrr": 0,
  "source_platform": "stripe_checkout",
  "protocol_stage": "payment_confirmed",
  "target_url": "{{target_url}}",
  "metadata_log": {
    "stripe_session_id": "{{session_id}}",
    "amount_total_cents": {{amount_total}},
    "price_id": "{{price_id}}",
    "cognitive_archetype": "{{metadata.cognitive_archetype}}",
    "payment_timestamp": "{{formatDate(now; 'YYYY-MM-DDTHH:mm:ssZ')}}"
  }
}
```

**LOG execution** to `public.protocol_executions`:

```
Method: POST
URL: {{SUPABASE_URL}}/rest/v1/protocol_executions

Body:
{
  "stripe_session_id": "{{session_id}}",
  "customer_email": "{{customer_email}}",
  "price_id": "{{price_id}}",
  "amount_total": {{amount_total}},
  "target_url": "{{target_url}}",
  "execution_stage": "minute_1_email",
  "payload_sent": { ... }
}
```

#### Stage 2 — Hour 12: Advance pipeline state

**PATCH** `public.clients` where `contact_email` matches:

```
Method: PATCH
URL: {{SUPABASE_URL}}/rest/v1/clients?contact_email=eq.{{customer_email}}
Headers: (above)

Body:
{
  "protocol_stage": "heuristics_in_progress",
  "metadata_log": {
    "hour_12_activated_at": "{{formatDate(now; 'YYYY-MM-DDTHH:mm:ssZ')}}",
    "make_scenario_id": "{{scenarioId}}"
  }
}
```

> Make uses a **Sleep module** set to `43200 seconds` (12 hours) between Stage 1 and Stage 2. Use Make's built-in scheduler tolerance of ±5 minutes (acceptable for async delivery).

#### Stage 3 — Hour 36: Sneak Peek delivery + final patch

**PATCH** `public.clients`:

```
Method: PATCH
URL: {{SUPABASE_URL}}/rest/v1/clients?contact_email=eq.{{customer_email}}

Body:
{
  "protocol_stage": "sneak_peek_delivered",
  "metadata_log": {
    "sneak_peek_delivered_at": "{{formatDate(now; 'YYYY-MM-DDTHH:mm:ssZ')}}",
    "micro_finding": "{{ai_finding}}",
    "scrape_source": "{{target_url}}"
  }
}
```

> Make invokes the **HTTP module** to call a fast LLM API (Gemini Flash or GPT-4o Mini) with the scraped HTML of `target_url` to generate a single micro-finding. The result is injected into the SendGrid email template and into the PATCH body above.

---

## 4. Make Scenario Structure

### Scenario: "SF — 72H Zero Friction Protocol"

```
Module 1:  Webhooks > Custom Webhook
           ↳ Name: "stripe-checkout-complete"
           ↳ Filters: data.object = "checkout.session", data.type = "checkout.session.completed"

Module 2:  HTTP > Make a request
           ↳ GET stripe line_items to extract price_id
           ↳ URL: https://api.stripe.com/v1/checkout/sessions/{{id}}/line_items
           ↳ Auth: Bearer {{STRIPE_SECRET_KEY}}

Module 3:  HTTP > Make a request (Supabase UPSERT clients)
           ↳ Stage: payment_confirmed

Module 4:  HTTP > Make a request (Supabase INSERT protocol_executions)
           ↳ execution_stage: minute_1_email

Module 5:  SendGrid > Send an Email
           ↳ Template ID: {{SENDGRID_TEMPLATE_MINUTE_1}}
           ↳ Dynamic data: customer_name, target_url, price_label, delivery_eta

Module 6:  Tools > Sleep
           ↳ Duration: 43200 (12 hours)

Module 7:  HTTP > Make a request (Supabase PATCH clients)
           ↳ Stage: heuristics_in_progress

Module 8:  HTTP > Make a request (Supabase INSERT protocol_executions)
           ↳ execution_stage: hour_12_dashboard

Module 9:  Tools > Sleep
           ↳ Duration: 86400 (24 hours — 36h total from payment)

Module 10: HTTP > Make a request
           ↳ Scrape target_url (use Apify or HTTP GET with User-Agent)
           ↳ Extract: title, meta description, CTA text, contrast ratio signals

Module 11: HTTP > Make a request (LLM API — Gemini Flash)
           ↳ Prompt: "Given this HTML excerpt from {{target_url}}, identify one specific UX or copy micro-finding that reduces conversion. Be precise. Max 2 sentences."
           ↳ Response: {{ai_finding}}

Module 12: SendGrid > Send an Email
           ↳ Template ID: {{SENDGRID_TEMPLATE_HOUR_36}}
           ↳ Dynamic data: customer_name, target_url, ai_finding

Module 13: HTTP > Make a request (Supabase PATCH clients)
           ↳ Stage: sneak_peek_delivered

Module 14: HTTP > Make a request (Supabase INSERT protocol_executions)
           ↳ execution_stage: hour_36_sneak_peek
```

**Error handling:** Every HTTP module has a `Routes > Error handler` that logs failures to `protocol_executions.error_message` and sends Ernesto a Slack/email alert via Module 15 (error branch).

---

## 5. SendGrid Email Templates

### Template A: Minute 1 — "Your Signal & Friction Diagnostic Has Started"

**Subject:** `Diagnostic engine initiated — {{customer_name}}`
**Dynamic fields required:**
- `customer_name` — string
- `target_url` — string (displayed as the domain under review)
- `price_label` — string (e.g., "DFY Beta Diagnostic")
- `delivery_eta` — string (e.g., "Within 72 hours from now")
- `dashboard_url` — string (future: link to client portal)

**Tone:** Clinical. Mission-control. Zero fluff. Example subject line family:
> "Diagnostic engine running on {{target_url}}"

### Template B: Hour 36 — "First Signal Isolated — Your Preliminary Finding"

**Subject:** `Preliminary finding: {{target_url}} — {{date}}`
**Dynamic fields required:**
- `customer_name` — string
- `target_url` — string
- `ai_finding` — string (1-2 sentences from LLM, specific and surgical)
- `full_report_eta` — string (e.g., "Final diagnostic delivered within 36 hours")

**Tone:** Surgical. The finding must be specific to their URL, not generic. This is the proof that the engine is real.

---

## 6. Environment Variables Required in Make

| Variable Name | Source | Used In |
|---------------|--------|---------|
| `SUPABASE_URL` | Supabase Dashboard > Project Settings > API | All Supabase HTTP modules |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard > Project Settings > API | Auth header for PATCH/POST |
| `SUPABASE_ANON_KEY` | Supabase Dashboard > Project Settings > API | `apikey` header |
| `STRIPE_SECRET_KEY` | Stripe Dashboard > Developers > API Keys | Module 2 (line items) |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard > Webhooks | Signature verification |
| `SENDGRID_API_KEY` | SendGrid Dashboard > Settings > API Keys | Modules 5 & 12 |
| `SENDGRID_TEMPLATE_MINUTE_1` | SendGrid Dashboard > Email Templates | Module 5 |
| `SENDGRID_TEMPLATE_HOUR_36` | SendGrid Dashboard > Email Templates | Module 12 |
| `GEMINI_API_KEY` | Google AI Studio | Module 11 |
| `FROM_EMAIL` | `diagnostics@signal-and-friction.com` | All SendGrid sends |

---

## 7. Stripe Webhook Configuration

In Stripe Dashboard → Developers → Webhooks → Add endpoint:

```
Endpoint URL: https://hook.eu1.make.com/[YOUR_MAKE_WEBHOOK_ID]
Events to listen: checkout.session.completed
API Version: 2024-06-20 (or latest stable)
```

**Signature Verification in Make:**
Make's Custom Webhook module does not natively verify Stripe signatures. Options:
1. Use Make's IP allowlist (restrict to Stripe's published IP ranges)
2. Add a Stripe signature verification step via HTTP module calling a lightweight Edge Function
3. Use Make's built-in HMAC verification (available in Enterprise plan)

For Phase 1 (< 10 clients/month), IP allowlist is sufficient.

---

## 8. Quality Control Checklist

- [x] `protocol_stage` CHECK constraint contains exactly 4 enum values
- [x] All column names follow `lower_snake_case`
- [x] Migration is purely additive — no existing columns modified
- [x] `protocol_executions` table is immutable (INSERT-only, no UPDATE policies)
- [x] `activity_log` trigger fires automatically on every `protocol_stage` change
- [x] Zero modifications to `src/` application files
- [x] Service role key used only in Make (never exposed client-side)
- [x] All JSONB fields default to `'{}'::jsonb` (not NULL)
- [x] Indexes on every high-frequency query column (email, stage, session_id)

---

## 9. Activation Checklist (Run in Order)

```
□ 1. Apply migration: supabase/migrations/20260620000200_72h_protocol_schema.sql
     → via Supabase Dashboard SQL Editor or npx supabase db push

□ 2. Configure Stripe webhook endpoint pointing to Make Custom Webhook URL

□ 3. Create two SendGrid dynamic templates (Template A + Template B)
     → Note template IDs

□ 4. Configure Make scenario: import 14 modules per Section 4
     → Add all environment variables from Section 6 as Data Store values

□ 5. Run a test payment via Stripe CLI:
     stripe trigger checkout.session.completed

□ 6. Verify:
     - clients table has new row with protocol_stage = 'payment_confirmed'
     - protocol_executions has entry with execution_stage = 'minute_1_email'
     - SendGrid activity shows email sent

□ 7. Fast-forward Make sleep modules to 1 minute for staging test

□ 8. Verify Hour 12 patch: clients.protocol_stage = 'heuristics_in_progress'

□ 9. Verify Hour 36 patch + sneak peek email delivery

□ 10. Restore sleep modules to 43200s / 86400s for production
```
