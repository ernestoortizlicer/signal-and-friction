# Signal & Friction

**B2B conversion consulting platform. Zero-call delivery. 72-hour SLA.**

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 · React 19 · Tailwind CSS v4 · Framer Motion |
| Runtime | Cloudflare Pages (static export) + Pages Functions (dynamic API) |
| Database | Supabase (PostgreSQL + RLS + Auth) |
| Email | Resend (REST API via CF Function — no SDK) |
| Payments | Stripe (webhooks via CF Function) |
| Animation | Spring physics — `{ stiffness: 100, damping: 18 }` throughout |

---

## Architecture

```
signal-and-friction-app/
├── src/app/                       # Next.js App Router (static export → /out)
│   ├── page.tsx                   # Landing — interactive particle canvas
│   ├── admin/                     # Command Center (Castilian Spanish UI, auth-gated)
│   │   ├── dashboard/             # Pipeline Kanban · ARR tracker · SLA timers
│   │   ├── finance/               # Tax simulator (HK · UAE · SG) · IPT pension
│   │   ├── learning/              # AI incident log · prompt versioning
│   │   ├── guarantees/            # Performance guarantee monitor
│   │   ├── priorities/            # 30-day sprint engine
│   │   └── certified/             # Licensed partner directory
│   ├── deliverable/[clientKey]/   # Client diagnostic portal (English)
│   ├── sla/[clientKey]/           # 72h countdown portal (English)
│   ├── sg/                        # Singapore APAC regional page
│   ├── scan/                      # Lead capture funnel
│   ├── certified/                 # Public certified partner page
│   └── legal/guarantee/           # Guarantee terms
├── functions/api/                 # Cloudflare Pages Functions (edge runtime)
│   ├── deliverable/[clientKey].ts # GET — reads deliverables table from Supabase
│   ├── sla/[clientKey].ts         # GET — live SLA status, auto-redirect on delivery
│   ├── notify-delivery/[clientKey].ts # POST — idempotent Resend email
│   ├── leads.ts                   # POST — Tally webhook → Supabase leads table
│   ├── scan-url.ts                # GET — URL metadata for lead scan tool
│   ├── ip-package.ts              # GET — IP geo for regional routing
│   └── stripe/                    # Webhook handler · sparkline data
├── supabase/
│   ├── functions/                 # Supabase Edge Functions (Deno)
│   └── migrations/                # Ordered SQL schema history
├── public/
│   ├── _redirects                 # Cloudflare wildcard routing for dynamic client keys
│   ├── _headers                   # Cache-control directives
│   └── sf_*.png                   # Brand assets (logo · OG image · banners)
└── scripts/
    ├── crm-server.mjs             # Local CRM dev server (port 3001)
    ├── generate-banners.mjs       # Puppeteer Retina banner generator
    └── banner-*.html              # Banner templates (LinkedIn · Tally · OG)
```

---

## Language Protocol

| Layer | Language | Rule |
|---|---|---|
| Admin UI (internal) | Castilian Spanish | All labels, headings, Kanban columns, status messages |
| Client-facing pages | American English | `/deliverable/`, `/sla/`, `/sg/`, `/certified/` |
| Engineering layer | English only | Variables, states, props, DB schemas, API routes |
| Business acronyms | English uppercase | DFY, DWY, ARR, LCP, SLA — preserved in both layers |

---

## Option C — Synchronous Delivery Pipeline

The site is fully static (`output: "export"`) with Cloudflare Pages Functions providing the dynamic layer at the edge. No server. No rebuild on delivery.

### Confirm Delivery → Client URL live in seconds

```
Admin clicks "Confirmar Entrega"
    │
    ├─ 1. POST /rest/v1/interactions         (diagnostic record + Loom URL)
    ├─ 2. PATCH /rest/v1/beta_projects       (status → "delivered", delivered_at = NOW())
    ├─ 3. POST /rest/v1/activity_log         (audit trail entry)
    ├─ 4. POST /rest/v1/deliverables         (upsert: client_key + full DeliverableData JSON)
    └─ 5. POST /api/notify-delivery/{key}    (Resend email to client — non-blocking)

Client visits https://signal-and-friction.com/deliverable/{clientKey}
    │
    ├─ Cloudflare serves /deliverable/acme-corp/index.html (static shell via _redirects)
    ├─ usePathname() extracts real clientKey from the actual URL
    └─ GET /api/deliverable/{clientKey} → Supabase deliverables table → live render
```

**No rebuild. No redeploy. URL is live the moment the admin confirms.**

### Dynamic Client Key Resolution

```
# public/_redirects
/deliverable/:splat  →  /deliverable/acme-corp/index.html  200
/sla/:splat          →  /sla/acme-corp/index.html          200
```

Any `/deliverable/{unknown-key}` request is served the `acme-corp` static shell. `usePathname()` in `DeliverableClientView` reads the actual URL regardless of which HTML file was served, enabling the correct Supabase fetch. This is the key invariant of Option C.

---

## 72-Hour SLA Protocol

### Kanban Timer (admin/dashboard)

Every pipeline card computes a live SLA countdown from `beta_projects.created_at`:

| State | Condition | Visual |
|---|---|---|
| On track | `hoursRemaining > 12` | Green `#5C9A6B` |
| Warning | `0 < hoursRemaining ≤ 12` | Amber |
| Exceeded | `hoursRemaining ≤ 0` | Red `#C85C5C` + ⚠ label |

### SLA Gate Auto-Computation

```typescript
const autoSla = client.created_at && client.delivered_at
  ? (new Date(client.delivered_at).getTime() - new Date(client.created_at).getTime()) / 3600000 <= 72
  : !!client.guarantee.sla_gate_met;
```

Derived from real timestamps. No manual checkbox.

### Client SLA Portal — `/sla/{clientKey}`

- SVG countdown ring with live `HH:MM:SS` ticker (updates every second, no server polling)
- 5-phase tracker auto-advances by hours elapsed since `created_at`
- Polls `/api/sla/{clientKey}` every 60 seconds for status changes
- Auto-redirects to `/deliverable/{clientKey}` the moment `deliverables` table entry exists

### Delivery Notification (Resend)

Fires from `handleConfirmDelivery` Step 5. Idempotent.

```
POST /api/notify-delivery/{clientKey}
{ clientEmail, clientName, clientId }

→ Query activity_log WHERE message LIKE 'delivery_notification_sent%' AND client_id = ?
→ If found: return 200 { skipped: true }  ← no duplicate send
→ POST https://api.resend.com/emails (HTML template, dark obsidian + gold)
→ POST activity_log: "delivery_notification_sent — {email} · {url}"
```

---

## Environment Variables

### Cloudflare Pages (set via `wrangler pages secret put`)

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side DB access, bypasses RLS |
| `RESEND_API_KEY` | Delivery notification emails |
| `STRIPE_SECRET_KEY` | Stripe API calls |
| `STRIPE_WEBHOOK_SECRET` | Stripe signature validation |

### Next.js (`.env.local` — never committed)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client-side Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-side anon key (RLS enforced) |

---

## Supabase Schema (key tables)

```sql
clients                -- company_name, contact_email, segment, cognitive_fatigue_score
beta_projects          -- status, payment_status, created_at, delivered_at, guarantee_active
performance_guarantees -- gates: traffic · sla · isolation · telemetry; conversion rates
interactions           -- diagnostic_loom_url, dominant_friction_mechanism, root_cause
deliverables           -- client_key TEXT PRIMARY KEY, data JSONB  ← Option C anchor table
activity_log           -- client_id, message, created_at
leads                  -- email, company, segment (DFY/DWY), answers JSONB, source
```

Pending manual creation (run once in Supabase SQL editor):

```sql
CREATE TABLE IF NOT EXISTS deliverables (
  client_key  TEXT PRIMARY KEY,
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON deliverables FOR SELECT USING (true);
CREATE POLICY "auth_write"  ON deliverables FOR ALL USING (auth.role() = 'authenticated');
```

---

## Local Development

```bash
npm install
npm run dev      # Next.js dev server → http://localhost:3000
npm run crm      # Local CRM server  → http://localhost:3001
npm run build    # Static export     → /out
```

CF Functions local emulation:

```bash
npx wrangler pages dev out --compatibility-date=2024-01-01
```

## Deployment

```bash
npm run build
npx wrangler pages deploy out --project-name=signal-and-friction
```

Production: **`https://signal-and-friction.com`**

---

## Security Model

- `service_role` key lives exclusively in Cloudflare env vars — never in source
- `.env*` and `.wrangler/` blocked in `.gitignore`
- Admin routes protected by `src/proxy.ts` middleware — JWT expiry check + optional email whitelist
- Supabase RLS enabled on all tables; `service_role` used server-side only in CF Functions
- Client-side code uses `anon` key with RLS policies enforced at the database layer
- Resend, Stripe, and Supabase secrets injected at runtime via `env` object in CF Functions — never bundled into static output
