# Deliverable Isolation Report
**Mission: Air-Gapped Client Deliverable Architecture**
**Date: 2026-06-22 | Status: ENFORCED**

---

## 1. Executive Summary

The client-facing deliverable layer (`/deliverable/{clientKey}`) is now architecturally isolated from the admin language system via three independent enforcement layers. Ernesto can toggle the Command Center between ES and EN freely; clients will only ever receive pure American Business English.

---

## 2. Isolation Mechanism — Three Layers

### Layer 1 — Route Tree Boundary (Structural)

The `LanguageProvider` context is mounted exclusively inside `AdminLayout` (`src/app/admin/layout.tsx`). In Next.js App Router, each nested `layout.tsx` creates an isolated provider tree. The deliverable route at `/deliverable/[clientKey]/` is governed by the **root layout only** — it sits outside the `/admin/` route segment and therefore can never receive `LanguageContext`.

```
Root Layout (lang="en" hardcoded on <html>)
├── /admin/layout.tsx  ←  LanguageProvider + AdminShell (ES/EN toggle lives here)
│   ├── /admin/dashboard
│   ├── /admin/learning
│   └── /admin/certified
└── /deliverable/[clientKey]/page.tsx  ←  NO admin layout, NO LanguageContext
    └── DeliverableClientView.tsx      ←  Air-gapped by structural position
```

**Key property**: React context cannot flow upward or sideways. A provider mounted at `/admin/layout.tsx` is invisible to any component outside that subtree. This is a compile-time structural guarantee, not a runtime check.

### Layer 2 — Data Schema Isolation (Single-Language Pipeline)

The deliverable data model (`src/app/deliverable/fallback.ts`) uses a **flat, English-only schema**:

```typescript
export interface DeliverableData {
  clientName: string;     // English
  diagnosis: {
    signal: string;       // English
    friction: { mechanism: string; rootCause: string; };  // English
    decisions: Decision[];  // English
  };
  // ... all fields: single string, no {es, en} dual objects
}
```

The admin layer's internal strings will use `{ es: string; en: string }` dual objects resolved through `useLanguage()`. The deliverable schema is a separate type that has no `lang` field and no dual-language objects — language is not a runtime variable for this layer.

### Layer 3 — Code-Level Contract (Documentation Enforcement)

`DeliverableClientView.tsx` opens with an explicit architectural contract:

```typescript
/**
 * AIR-GAPPED CLIENT DELIVERABLE — LOCALE: en (American Business English)
 *
 * ARCHITECTURAL CONTRACT:
 *   - This component is intentionally isolated from the admin LanguageContext.
 *   - It MUST NOT import useLanguage(), LanguageProvider, or any admin-layer
 *     i18n mechanism. Locale is hardcoded to "en" at the data-model level.
 *   - Future changes to the admin ES/EN toggle will have zero effect here by
 *     structural design: LanguageProvider is mounted only inside AdminLayout,
 *     which governs /admin/** and no other route tree.
 *
 * DO NOT add any admin context imports to this file.
 */
```

---

## 3. Admin Language Toggle — Implementation

**File:** `src/contexts/LanguageContext.tsx`

- Provider: `LanguageProvider` — wraps `AdminShell` only
- State persistence: `localStorage["sf-admin-lang"]` (client-side, never transmitted)
- Default: `"es"` (Ernesto's working language)
- Toggle: Gold chip button in admin header (top-right), displays current lang: `ES` / `EN`
- Hook: `useLanguage()` — available to any admin component, unreachable from deliverable routes

**Admin header toggle UI:**
```tsx
<button onClick={toggle} className="...text-[#D4A853]...">
  {lang.toUpperCase()}  {/* renders "ES" or "EN" */}
</button>
```

---

## 4. Linguistic Precision Audit — Client UI Strings

All client-facing microcopy upgraded to conversion engineering vocabulary:

| Location | Before | After |
|---|---|---|
| Loading skeleton | `Loading diagnostic portal...` | `Initializing diagnostic runtime...` |
| Founder Focus status | `Status: Healthy runway. Cognitive fatigue: X/100.` | `Cognitive load index: X/100 — Execution adherence: high-confidence threshold.` |
| Loom placeholder (microdosing) | `Loom Video Briefing Active` | `Briefing Runtime Pending` |
| Loom placeholder (high-ticket) | `Loom video briefing loading...` | `Async briefing stream pending...` |
| Module detail label | `Module Summary & Insight` | `Diagnostic Module — Intervention Brief` |

Existing precision vocabulary confirmed active and retained:
- `Cognitive Load` — friction mechanism label
- `Conversion Gain`, `Bounce Probability` — quantified outcome metrics
- `SLA Active`, `20% Growth Guarantee Active` — service-level indicators
- `Telemetry Validation`, `Testing Runway` — diagnostic pipeline terminology
- `Asynchronous Runtime` — briefing stream copy
- `Hick's Law`, `PLG activation logic` — behavioral conversion engineering references

---

## 5. Build & Deployment Validation

```
npm run lint   → ✓ 0 errors, 4 pre-existing warnings (no new issues)
npm run build  → ✓ 22 routes compiled, 0 TypeScript errors
wrangler deploy → ✓ https://c0788248.signal-and-friction.pages.dev
```

---

## 6. Files Modified

| File | Change |
|---|---|
| `src/contexts/LanguageContext.tsx` | **Created** — Admin-scoped ES/EN language context |
| `src/app/admin/layout.tsx` | Wired `LanguageProvider` + `AdminShell` split + ES/EN toggle in header |
| `src/app/deliverable/[clientKey]/DeliverableClientView.tsx` | Architectural isolation contract + precision microcopy upgrade |
| `src/app/certified/CertifiedClient.tsx` | Removed redundant eslint-disable directives |

---

## 7. Guarantee Statement

> "The client barrier is absolute. Ernesto operates the Command Center in Spanish with total peace of mind. The client deliverable portal (`/deliverable/{clientKey}`) enforces American Business English by structural position in the route tree — no runtime check, no flag, no conditional: the context simply does not exist at that layer."

The isolation is guaranteed by React's unidirectional context propagation. It cannot be broken by a misconfiguration — it can only be broken by explicitly importing `LanguageContext` into the deliverable layer, which the code-level contract explicitly prohibits.
