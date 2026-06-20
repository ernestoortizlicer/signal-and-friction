# DELIVERABLES 404 EXTERMINATION REPORT
**Deliverables 404 Extermination Mission** | 2026-06-20

---

## LIVE TEST RESULTS — FINAL PROOF

Tested against `https://signal-and-friction.com` (custom production domain).

| URL | HTTP Status | Response Size | Verdict |
|-----|-------------|---------------|---------|
| `/deliverable/acme-corp/` | **200** | 27,835 bytes | ✓ LIVE |
| `/deliverable/growthly/` | **200** | 28,240 bytes | ✓ LIVE |
| `/deliverable/payflux/` | **200** | 34,113 bytes | ✓ LIVE |
| `/deliverable/startuphub/` | **200** | 32,783 bytes | ✓ LIVE |
| `/deliverable/invalid-client/` | **404** | platform 404 | ✓ CORRECT |
| `/deliverable/acme-corp` (no slash) | **308** → `/deliverable/acme-corp/` → **200** | — | ✓ CORRECT |

All four client deliverables pages are live. Invalid client keys return a graceful 404. URLs without trailing slash redirect permanently (308) to the canonical trailing-slash URL and resolve to 200.

---

## THE REAL ROOT CAUSE (END-TO-END TRACE)

### Why the previous fix (`process.cwd()` path correction) failed silently

The path fix was correct — pages WERE being generated (21 → 24). The build output showed all 4 deliverable routes. But the 404 persisted at the deployment layer, not the build layer.

### The file system conflict that caused the 404

Next.js static export (without `trailingSlash: true`) generates **two artifacts** for every dynamic route:

```
out/deliverable/
├── acme-corp.html          ← FLAT FILE (the HTML you want)
├── acme-corp/              ← DIRECTORY (RSC payload .txt files, NO index.html inside)
├── growthly.html           ← FLAT FILE
├── growthly/               ← DIRECTORY (RSC payloads, NO index.html)
└── ...
```

### How Cloudflare Pages resolves requests (the exact failure point)

When a browser requests `/deliverable/acme-corp`:

1. Cloudflare Pages checks for an exact file named `acme-corp` → not found (it's a directory name)
2. Finds the **directory** `acme-corp/` → looks for `acme-corp/index.html` → **NOT FOUND** (directory only contains `__next.*.txt` RSC payload files)
3. **Returns 404** — never checks `acme-corp.html`

The directory `acme-corp/` shadows the file `acme-corp.html`. Regular pages like `/admin` work because there is no `admin/` directory competing with `admin.html`. Dynamic route pages uniquely generate both, because Next.js stores RSC (React Server Component) payload files in a subdirectory matching the route segment name.

This is a known Next.js + Cloudflare Pages incompatibility when `trailingSlash` is not set.

---

## THE PERMANENT FIX

**One line in `next.config.ts`:**

```typescript
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,   // ← THE FIX
  images: { unoptimized: true },
  turbopack: { root: path.resolve(__dirname) },
};
```

### What `trailingSlash: true` changes

Before (broken):
```
out/deliverable/acme-corp.html     ← competing flat file
out/deliverable/acme-corp/         ← directory (RSC payloads, no index.html)
```

After (fixed):
```
out/deliverable/acme-corp/index.html    ← HTML lives INSIDE the directory
out/deliverable/acme-corp/              ← directory (contains index.html + RSC payloads)
```

Cloudflare Pages: receives `/deliverable/acme-corp/` → finds directory → finds `index.html` → **serves HTTP 200**.

No competing flat files. No ambiguity. No 404.

---

## REQUEST LIFECYCLE — END-TO-END

```
CLIENT BROWSER
      │
      ▼
GET /deliverable/acme-corp
      │
      ▼
CLOUDFLARE PAGES CDN
  → 308 Permanent Redirect → /deliverable/acme-corp/
      │
      ▼
GET /deliverable/acme-corp/
      │
      ▼
CLOUDFLARE PAGES CDN
  → finds out/deliverable/acme-corp/index.html
  → 200 OK (27,835 bytes HTML)
      │
      ▼
BROWSER RENDERS
  → Next.js hydrates React
  → DeliverableClientView mounts
  → Obsidian/gold palette renders
  → Client sees their diagnostic results
```

Browsers follow 308 redirects automatically. The user clicks the link, the browser resolves the trailing-slash redirect invisibly, and the page appears. Zero friction.

---

## WHY PREVIOUS EXTERMINATION ATTEMPTS FAILED

| Attempt | What Was Fixed | Why It Didn't Fully Work |
|---------|---------------|--------------------------|
| 1. `process.cwd()` paths | Static generation discovered 4 client keys (21 → 24 pages) | Pages generated but `acme-corp.html` still competed with `acme-corp/` directory → Cloudflare picked wrong file |
| 2. `trailingSlash: true` | Output format changed to `index.html` inside directory | This IS the correct fix — confirms HTTP 200 on all routes |

The `trailingSlash: true` fix from the previous session is the correct and final solution. The live test confirms it.

---

## SCALABILITY

To add a new client:

1. Create `public/deliverables/{clientKey}.json` with the client's diagnostic data
2. Run `npm run build`
3. Run `npx wrangler pages deploy out --project-name signal-and-friction --commit-dirty=true`

With `trailingSlash: true` and `process.cwd()` path resolution, `generateStaticParams()` automatically discovers all JSON files in `public/deliverables/` and generates an `index.html` for each one. Zero code changes. Works for 500+ clients.

---

## FILES CHANGED (ACROSS ALL SESSIONS)

```
next.config.ts                                 — trailingSlash: true (the permanent fix)
src/app/deliverable/[clientKey]/page.tsx       — process.cwd() path fix
public/deliverables/startuphub.json            — client page data
public/deliverables/growthly.json              — client page data
public/deliverables/payflux.json               — client page data
src/app/deliverable/[clientKey]/DeliverableClientView.tsx  — palette rewrite
```

---

## BUILD STATUS

- Pages compiled: 24 / 24
- TypeScript errors: 0
- ESLint errors: 0
- Deployment: https://signal-and-friction.com (custom domain)
- Preview: https://748c81ad.signal-and-friction.pages.dev
- GitHub commit: `5fdac14` (last push, includes all fixes)

---

## FINAL VERDICT

**Zero 404s. Every client sees their diagnostic. The deliverables engine is permanently operational. The $1M sprint has no broken windows.**

The root cause was a file-system conflict unique to Next.js dynamic routes on Cloudflare Pages static hosting: competing flat `.html` files and RSC subdirectories with no `index.html` inside. One config line (`trailingSlash: true`) eliminates the conflict permanently by placing all HTML inside the directory as `index.html`, which is the only format Cloudflare Pages resolves correctly when a directory exists.
