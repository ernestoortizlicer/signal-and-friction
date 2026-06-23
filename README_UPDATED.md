# Signal & Friction — Operational Map

> **Version:** 2026-06-23 | **Runtime:** Cloudflare Pages + Supabase + Stripe

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
  │     ├── /api/pixel                      ← Tracking pixel (1×1 GIF → Supabase event log)
  │     ├── /api/views                      ← Deliverable engagement aggregates
  │     ├── /api/scan-url                   ← URL scanner
  │     ├── /api/sla/[clientKey]            ← SLA tracker
  │     └── /api/stripe/
  │           ├── webhook                   ← Stripe webhook processor
  │           └── sparklines                ← Revenue telemetry
  └── Supabase (PostgreSQL + Edge Functions)
        ├── Tables: deliverable_view_events ← Prospect engagement log (pixel events)
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

### Deliverable Intelligence (Tracking Pixel)

El sistema de seguimiento de prospectos funciona así:

1. **Pixel invisible** — `DeliverableClientView.tsx` dispara `fetch('/api/pixel?client=acme-corp', { keepalive: true })` en cuanto el prospecto abre el link. No bloquea el renderizado.
2. **Worker** (`functions/api/pixel.ts`) — Devuelve un GIF 1×1 transparente inmediatamente. En segundo plano (`ctx.waitUntil`) inserta una fila en `deliverable_view_events` con `client_key`, `viewed_at`, `user_agent` y `country` (header `CF-IPCountry`).
3. **Filtrado de bots** — Regex sobre User-Agent descarta crawlers de Google, Slack, LinkedIn, Facebook, Telegram, WhatsApp, Discord, etc.
4. **Endpoint de lectura** (`functions/api/views.ts`) — Agrega `COUNT(*)` y `MAX(viewed_at)` por `client_key`. Responde JSON `{ [clientKey]: { count, lastViewed } }`.
5. **Widget en Finance → Overview** — Muestra tarjeta por cliente con número de vistas en dorado, timestamp relativo ("2h ago", "3d ago") y badge verde **Hot** si el prospecto abrió en las últimas 24h. Botón Refresh manual.

**Acción única requerida — Crear la tabla en Supabase:**

```sql
-- Pegar en Supabase Dashboard → SQL Editor → Run
-- (o ver supabase/migrations/20260623_deliverable_view_events.sql)
CREATE TABLE IF NOT EXISTS deliverable_view_events (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_key  TEXT        NOT NULL,
  viewed_at   TIMESTAMPTZ DEFAULT NOW(),
  user_agent  TEXT,
  country     TEXT
);
CREATE INDEX IF NOT EXISTS idx_dve_client_key_viewed_at
  ON deliverable_view_events (client_key, viewed_at DESC);
```

Las variables `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya están en Cloudflare Pages — no requiere configuración adicional.

---

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
| `src/app/admin/` | Operator dashboard — 5 módulos, interfaz 100% en inglés americano de negocios |
| `src/app/deliverable/[clientKey]/` | Client-facing deliverable portal |
| `src/app/certified/` | Certified Program enrollment page |
| `src/app/sla/[clientKey]/` | Real-time SLA countdown view |
| `functions/api/pixel.ts` | Tracking pixel — registra apertura de entregables en Supabase |
| `functions/api/views.ts` | Agrega métricas de engagement por cliente |
| `functions/api/` | Resto del API layer Cloudflare Workers |
| `supabase/functions/` | Supabase Edge Functions |
| `supabase/migrations/` | Historial de schema — incluye `20260623_deliverable_view_events.sql` |
| `public/product-icons/` | 12 product PNG icons (512×512) |
| `scripts/` | One-shot operational scripts (Stripe, Supabase seeding) |
| `wrangler.toml` | Cloudflare Pages build config |

---

## Changelog

| Versión | Fecha | Cambios |
|---|---|---|
| **2026-06-23** | 23 Jun 2026 | **Deliverable Intelligence** — pixel de seguimiento + endpoint `/api/views` + widget en Finance Overview. Admin 100% en inglés americano (sistema bilingüe eliminado). |
| **2026-06-21** | 21 Jun 2026 | Auditoría completa: limpieza de archivos basura, traducción al inglés americano de negocios de toda la interfaz admin (5 módulos), eliminación del toggle bilingüe. |
| **2026-06-20** | 20 Jun 2026 | Curriculum certificado (`CERTIFIED_CURRICULUM.md`), 6 módulos scaffold, security air-gap en entregables de cliente. |
| **2026-06-19** | 19 Jun 2026 | 13 iconos de producto + imágenes Stripe via CDN. Cards del IP Lab a altura completa. Debates extendidos en M05+M06. |
