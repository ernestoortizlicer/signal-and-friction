# ALL PROJECT LINKS — Signal & Friction
**Master Reference Document** | Updated: 2026-06-20 | Keep this file private.

---

## 1. Production Deployments

| Environment | URL | Status |
|---|---|---|
| **Production Domain** | https://signal-and-friction.com | Active |
| **www redirect** | https://www.signal-and-friction.com | Active |
| **Latest Preview** | https://3922da03.signal-and-friction.pages.dev | Current (Cache fix + no-store headers) |
| Previous Preview | https://f66162fa.signal-and-friction.pages.dev | Mission 11 — Stripe Live |
| Previous Preview | https://d8200ed8.signal-and-friction.pages.dev | Mission 11 — first pass |
| Previous Preview | https://ff44534e.signal-and-friction.pages.dev | Mission 10 — Ultimate Final |
| Previous Preview | https://47a3cd68.signal-and-friction.pages.dev | Mission 9 — Absolute Final |
| Previous Preview | https://29937c47.signal-and-friction.pages.dev | Mission 8 — Precision Strike |
| Previous Preview | https://99632c80.signal-and-friction.pages.dev | Mission 7 — Superior Excellence |
| Previous Preview | https://dbc86d70.signal-and-friction.pages.dev | Mission 6 — Final Polish |
| Previous Preview | https://0f43522b.signal-and-friction.pages.dev | Gold Palette |

> Cloudflare retains all preview deployments indefinitely. Production domain is aliased to the latest deploy.

---

## 2. Admin Access

- **Admin Login URL:** https://signal-and-friction.com/admin/login
- **Admin Email (primary):** ernestoortizlicer@gmail.com
- **Admin Email (secondary):** ernestoortiz@gmail.com
- **Authentication:** Supabase Auth — use Password mode or Magic Link mode at `/admin/login`

> **PASSWORD NOTE:** The admin password is managed via Supabase Auth, not stored in the codebase. To set or reset it:
> 1. Go to https://supabase.com/dashboard/project/tsaarsuuclvkjsgjcmoj/auth/users
> 2. Find the user `ernestoortizlicer@gmail.com`
> 3. Click "Send password reset" or set a new password directly
> 4. Alternatively, use the **Magic Link** mode at `/admin/login` — no password needed

---

## 3. Dashboard Direct Links

All admin routes are protected by JWT authentication. You must be logged in at `/admin/login` first.

| Dashboard | URL |
|---|---|
| **Admin Hub** | https://signal-and-friction.com/admin |
| **Pipeline & Lead Management** | https://signal-and-friction.com/admin/dashboard |
| **Finance Center** | https://signal-and-friction.com/admin/finance |
| **Priority Engine** | https://signal-and-friction.com/admin/priorities |
| **Socratic Learning Dashboard** | https://signal-and-friction.com/admin/learning |
| **Certified Program Admin** | https://signal-and-friction.com/admin/certified |
| **Guarantees Dashboard** | https://signal-and-friction.com/admin/guarantees |

---

## 4. Public Pages

| Page | URL | Purpose |
|---|---|---|
| **Global Landing** | https://signal-and-friction.com | Primary 5-step diagnostic funnel |
| **Singapore Expansion** | https://signal-and-friction.com/sg | APAC market, SGD pricing |
| **Confirmation** | https://signal-and-friction.com/confirmed | Post-form submission |
| **Post-Payment Success** | https://signal-and-friction.com/confirmed/success | Stripe redirect landing |
| **Certified Program** | https://signal-and-friction.com/certified | Agency licensing portal |
| **Legal / Guarantee** | https://signal-and-friction.com/legal/guarantee | Performance covenant |
| **Portfolio** | https://signal-and-friction.com/portfolio | Case studies |

**Client Deliverable Portals — Live (4 active clients):**

| Client | URL | Segment | Friction Mechanism |
|---|---|---|---|
| Acme Corp | https://signal-and-friction.com/deliverable/acme-corp/ | Microdosing (DWY) | Cognitive Load — pricing confusion |
| Growthly | https://signal-and-friction.com/deliverable/growthly/ | Microdosing (DWY) | Integration Wall — onboarding gap |
| Payflux | https://signal-and-friction.com/deliverable/payflux/ | High-ticket (DFY) | Pricing Paralysis / Feature Overload |
| StartupHub | https://signal-and-friction.com/deliverable/startuphub/ | High-ticket (DFY) | Trust Deficit at Billing Gate |

> **To add a new client:** Drop `public/deliverables/{clientKey}.json` → `npm run build` → `npx wrangler pages deploy out --project-name signal-and-friction --commit-dirty=true`

---

## 5. Supabase

- **Project Dashboard:** https://supabase.com/dashboard/project/tsaarsuuclvkjsgjcmoj
- **Auth Users:** https://supabase.com/dashboard/project/tsaarsuuclvkjsgjcmoj/auth/users
- **Database Tables:** https://supabase.com/dashboard/project/tsaarsuuclvkjsgjcmoj/editor
- **Edge Functions:** https://supabase.com/dashboard/project/tsaarsuuclvkjsgjcmoj/functions
- **Logs:** https://supabase.com/dashboard/project/tsaarsuuclvkjsgjcmoj/logs/edge-functions
- **RLS Policies:** https://supabase.com/dashboard/project/tsaarsuuclvkjsgjcmoj/auth/policies
- **SQL Editor:** https://supabase.com/dashboard/project/tsaarsuuclvkjsgjcmoj/sql/new

**Project URL:**
```
https://tsaarsuuclvkjsgjcmoj.supabase.co
```

**Anon Key** (safe to expose in frontend):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzYWFyc3V1Y2x2a2pzZ2pjbW9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MzIxNjcsImV4cCI6MjA5NzMwODE2N30.-ZW2s3QSpquB1qEihOJWwho3jLxi4yWjPGYNSbtcTl8
```

**Service Role Key** — NEVER share, never commit to public repo:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzYWFyc3V1Y2x2a2pzZ2pjbW9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTczMjE2NywiZXhwIjoyMDk3MzA4MTY3fQ.otLhAuMzjARHclJYVLRKIHEF9wMDwT0Hssz62PO2LD4
```

---

## 6. Stripe

- **Stripe Dashboard:** https://dashboard.stripe.com
- **Payment Links Manager:** https://dashboard.stripe.com/payment-links
- **Products:** https://dashboard.stripe.com/products
- **API Keys:** https://dashboard.stripe.com/apikeys
- **Branding:** https://dashboard.stripe.com/settings/branding
- **Customers:** https://dashboard.stripe.com/customers
- **Reports:** https://dashboard.stripe.com/reports

**Publishable Key** (live):
```
pk_live_51SQsdpHv7TExyozUI6KcTpcINTfQvDgbHeB68ivRLZUFIArZuEowowU4mKFEOOtZOrx6GyTCjBPbfWP6pk8qKmVc00pIQe5qLp
```

**Secret Key:** `sk_live_...` configured in `.env.local` — Stripe is LIVE.

---

### 12 Payment Links — LIVE (activated 2026-06-19)

**Segment A — Done-For-You (DFY) — High-Ticket**

| # | Product | Price | Payment Link |
|---|---|---|---|
| 1 | DFY Beta Diagnostic | $2,000 | https://buy.stripe.com/eVqfZh58r8LydZ3eZ45sA07 |
| 2 | DFY Intervention | $3,000 | https://buy.stripe.com/8x200j58r5zm2glaIO5sA08 |
| 3 | DFY Monitoring (monthly) | $2,500/mo | https://buy.stripe.com/14AaEXeJ15zmbQVdV05sA09 |
| 4 | DFY Expansion | $2,000 | https://buy.stripe.com/00wfZhfN52naaMRaIO5sA0a |
| 5 | DFY Autonomy Kit | $5,000 | https://buy.stripe.com/aFa28reJ10f29INdV05sA0b |

**Segment B — Done-With-You (DWY) — Microdosing**

| # | Product | Price | Payment Link |
|---|---|---|---|
| 6 | DWY Beta Diagnostic | $350 | https://buy.stripe.com/dRmaEXeJ1f9Wf373gm5sA0c |
| 7 | DWY Intervention | $750 | https://buy.stripe.com/fZu5kD8kDbXK4ot9EK5sA0d |
| 8 | DWY Monitoring (monthly) | $500/mo | https://buy.stripe.com/bJeaEX8kD0f25sx2ci5sA0e |
| 9 | DWY Expansion | $350 | https://buy.stripe.com/3cI8wPfN50f29INg385sA0f |
| 10 | DWY Autonomy Kit | $1,500 | https://buy.stripe.com/7sY28r7gz0f2dZ35ou5sA0g |

**Certified Program**

| # | Product | Price | Payment Link |
|---|---|---|---|
| 11 | Certified Practitioner | $2,500 | https://buy.stripe.com/aFaeVd8kDf9W08dcQW5sA0h |
| 12 | Certified Agency | $5,000 | https://buy.stripe.com/3cI14n44n8Lyg7b5ou5sA0i |

---

## 7. Cloudflare

- **Cloudflare Dashboard:** https://dash.cloudflare.com
- **Pages Projects:** https://dash.cloudflare.com/?to=/:account/pages
- **Signal & Friction Pages:** https://dash.cloudflare.com/?to=/:account/pages/view/signal-and-friction
- **Custom Domain Config:** https://dash.cloudflare.com/?to=/:account/pages/view/signal-and-friction/domains
- **Deployments History:** https://dash.cloudflare.com/?to=/:account/pages/view/signal-and-friction/deployments
- **Project Name:** `signal-and-friction`

**Deploy Command (from project root):**
```bash
npx wrangler pages deploy out --project-name signal-and-friction --commit-dirty=true
```

---

## 8. LinkedIn Assets

| Asset | Path |
|---|---|
| **Banner SVG (source)** | `public/sf_linkedin_banner.png` |
| **Logo** | `public/sf_logo.png` |
| **OG Image** | `public/sf_og_image.png` |
| **Tally Banner** | `public/sf_tally_banner.png` |

---

## 9. Key Documentation Files

**Project root:** `/Users/ernestoortiz/Desktop/Claude/signal-and-friction-app/`

| File | Description |
|---|---|
| `ALL_PROJECT_LINKS.md` | Master reference — all URLs, keys, dashboards (this file) |
| `BROWSER_LINKS.md` | Bookmark folder — ready to import into Chrome |
| `PRICING_AND_SERVICES.md` | Complete commercial framework — all 12 prices and rationale |
| `BUSINESS_TRANSFORMATION.md` | Dual model, $270K/$1.2M projections, virality, moats |
| `TAX_AND_WEALTH_STRUCTURE.md` | Wyoming LLC + Bulgaria (10%) + HK Holding (0%) |
| `ZERO_TAX_ROADMAP.md` | Year 1: 8.4% → Year 3: 0.5–1.2% |
| `DELIVERABLES_404_EXTERMINATED.md` | Definitive root cause + fix proof with curl evidence |
| `scripts/clear-deliverable-cache.sh` | Force-opens all 4 deliverable pages with cache-bust params |

---

## 10. Local Dev Commands

```bash
# Start dev server
npm run dev

# Lint
npm run lint

# Clean build
rm -rf out .next && npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy out --project-name signal-and-friction --commit-dirty=true

# Clear browser cache for all deliverable pages
bash scripts/clear-deliverable-cache.sh
```

---

## 11. Status

| Item | Status |
|---|---|
| Stripe secret key configured, 12 payment links live | Done — activated 2026-06-19 |
| Admin user set — ernestoortizlicer@gmail.com | Done — Supabase Auth |
| 12 Stripe payment links created + Supabase updated | Done |
| Deliverable 404 exterminated (trailingSlash + no-store) | Done — 2026-06-20 |
| All 4 deliverable pages live + verified HTTP 200 | Done — deployment 3922da03 |
| Change admin password after first login | https://signal-and-friction.com/admin/login |
