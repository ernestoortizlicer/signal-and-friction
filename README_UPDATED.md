# Signal & Friction — Operational Map

> **Version:** 2026-06-21 | **Runtime:** Cloudflare Pages + Supabase + Stripe

---

## Architecture

```
Browser / Tablet
      │
      ▼
Cloudflare Pages (CDN)
  ├── Static Next.js export (out/)          ← All UI routes
  ├── Cloudflare Workers (functions/api/)   ← Runtime API layer
  │     ├── /api/deliverable/[clientKey]    ← Client deliverable fetch
  │     ├── /api/leads                      ← Lead capture
  │     ├── /api/ip-package                 ← IP package generator
  │     ├── /api/notify-delivery/[clientKey]← Resend email trigger
  │     ├── /api/scan-url                   ← URL scanner
  │     ├── /api/sla/[clientKey]            ← SLA tracker
  │     └── /api/stripe/
  │           ├── webhook                   ← Stripe webhook processor
  │           └── sparklines                ← Revenue telemetry
  └── Supabase (PostgreSQL + Edge Functions)
        ├── Edge: certification-onboarding  ← Certified Program checkout
        ├── Edge: tally-webhook             ← Tally form → DB + Stripe link
        ├── Edge: stripe-invoice            ← Invoice drafter
        ├── Edge: outreach-scanner          ← Lead URL scanner
        └── Edge: stripe-refund             ← Guarantee refund processor
```

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (static export), React 19, Tailwind CSS 4, Framer Motion |
| Hosting | Cloudflare Pages (`out/` → `signal-and-friction.pages.dev`) |
| API Runtime | Cloudflare Workers (`functions/api/`) |
| Database | Supabase PostgreSQL (RLS enabled) |
| Serverless | Supabase Edge Functions (Deno) |
| Payments | Stripe (Payment Links + Checkout Sessions + Webhooks) |
| Email | Resend (transactional delivery notifications) |
| Auth | Supabase Auth (admin panel, JWT cookie `sf-admin-session`) |

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in values
cp .env.local.example .env.local

# 3. Start Next.js dev server
npm run dev                  # http://localhost:3000

# 4. Start local CRM server (optional)
npm run crm                  # http://localhost:3001
```

---

## Deployment

### Full deploy pipeline

```bash
# Clean build
rm -rf out .next && npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy out/ --project-name signal-and-friction --branch main

# Deploy Supabase Edge Functions
SUPABASE_ACCESS_TOKEN=<token> supabase functions deploy --project-ref tsaarsuuclvkjsgjcmoj
```

### Cloudflare environment variables (set in Pages dashboard)

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project REST URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (bypasses RLS) |
| `STRIPE_SECRET_KEY` | Stripe live secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `RESEND_API_KEY` | Resend transactional email key |

### Supabase Edge Function secrets (set via Dashboard → Edge Functions → Secrets)

| Variable | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe payments |
| `STRIPE_PRICE_CERTIFIED_ANNUAL` | Certified Program annual price ID |
| `STRIPE_PRICE_CERTIFIED_MONTHLY` | Certified Program monthly price ID |
| `STRIPE_PRICE_CERTIFIED_RENEWAL` | Certified Program renewal price ID |

---

## Core Operational Protocols

### SLA Timer
- Client onboarded via Tally webhook → `beta_projects.sla_deadline` = NOW + 72h
- `functions/api/sla/[clientKey].ts` computes remaining time live
- SLA breach → triggers `stripe-refund` Edge Function

### Priority Matrix
- Engine in `src/app/admin/priorities/page.tsx`
- Inputs: revenue impact × effort × SLA risk
- Auto-sorts active client work queue

### 72h Delivery Protocol
- Schema: `supabase/migrations/20260620000200_72h_protocol_schema.sql`
- State machine: `prospecting → active → delivered → closed`
- SLA enforced at DB + Worker level

### Certified Program Flow
- Form submission → `certification-onboarding` Edge Function
- Creates Stripe Checkout Session (annual/monthly/renewal tier)
- On payment: writes `certified_practitioners` record + logs activity
- Badge + playbook URL returned in response payload

---

## Payment Links (live)

All 12 products are active in Stripe. URLs live in `stripe_payment_links` table.

| Product | Segment | Amount |
|---|---|---|
| DFY Beta Diagnostic | High Ticket | $2,000 |
| DFY Intervention | High Ticket | $3,000 |
| DFY Monitoring | High Ticket | $2,500/mo |
| DFY Expansion | High Ticket | $2,000 |
| DFY Autonomy Kit | High Ticket | $5,000 |
| DWY Beta Diagnostic | Microdosing | $350 |
| DWY Intervention | Microdosing | $750 |
| DWY Monitoring | Microdosing | $500/mo |
| DWY Expansion | Microdosing | $350 |
| DWY Autonomy Kit | Microdosing | $1,500 |
| Certified Practitioner | Certified | $4,500/yr |
| Certified Agency | Certified | $4,500/yr |

---

## Security

- All secrets in `.env.local` (gitignored via `.env*` rule)
- Cloudflare Workers receive secrets via `env.*` bindings — never hardcoded
- Supabase Edge Functions use `Deno.env.get()` — never hardcoded
- Admin panel protected by Supabase Auth (email whitelist + JWT cookie)
- RLS enabled on all Supabase tables; service_role used only server-side

---

## Key Files

| Path | Purpose |
|---|---|
| `src/app/admin/` | Operator dashboard (dashboard, CRM, finance, priorities, learning, certified) |
| `src/app/deliverable/[clientKey]/` | Client-facing deliverable portal |
| `src/app/certified/` | Certified Program enrollment page |
| `src/app/sla/[clientKey]/` | Real-time SLA countdown view |
| `functions/api/` | Cloudflare Workers API layer |
| `supabase/functions/` | Supabase Edge Functions |
| `supabase/migrations/` | Database schema history |
| `public/product-icons/` | 12 product PNG icons (512×512) |
| `scripts/` | One-shot operational scripts (Stripe, Supabase seeding) |
| `wrangler.toml` | Cloudflare Pages build config |
