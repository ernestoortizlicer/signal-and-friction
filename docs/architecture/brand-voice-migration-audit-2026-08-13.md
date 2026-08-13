# Signal & Friction — Brand Voice Migration Audit

Date: 2026-08-13
Status: OPEN — RELEASE GATE
Authority: `docs/architecture/brand-voice-invariant-v1.md`

## Decision

Signal & Friction is currently operated by one person. Provider voice must therefore be first-person singular (`I`, `me`, `my`) or, where a sentence is describing system state rather than speaking personally, a neutral `Signal & Friction` reference.

Plural provider voice (`we`, `us`, `our`, `our team`) is treated as a truth defect because it can imply human staffing or review layers that do not exist.

## Already reconciled

- `src/lib/public-claims.ts` — canonical abstention claim now says `I say so`.
- `src/lib/market-profiles.ts` — Global market subhead now uses singular founder voice.
- `src/components/CookieConsentBanner.tsx` — cookie explanation uses `I use cookies`.
- `src/app/portfolio/page.tsx` — method/guarantee explanation uses singular founder voice.
- `src/app/confirmed/success/page.tsx` — checkout verification/support language uses singular founder voice or neutral system state.
- `src/app/legal/guarantee/page.tsx` — provider voice migrated to singular; uncertainty/abstention language also reconciled.
- `src/app/sla/[clientKey]/SLAClientView.tsx` — no plural provider voice; state remains neutral and system-derived.

## Public runtime debt detected by CI

The `check:brand-voice` gate intentionally fails until these active surfaces are reconciled.

### P0 — direct public copy

1. `src/app/scan/page.tsx`
   - Current: `We inspect performance and page-level technical signals.`
   - Target: `I inspect performance and page-level technical signals.`
   - Additional consistency target: change `so Signal & Friction can review the context` to `so I can review the context` where the sentence describes the founder's review.

2. `src/app/opengraph-image.tsx`
   - Current: `If the evidence is insufficient, we say so.`
   - Target: `If the evidence is insufficient, I say so.`

### P0 — client deliverable surfaces

3. `src/app/deliverable/[clientKey]/DeliverableClientView.tsx`
   - Current: `what we observed ... how we know it.`
   - Target: `what I observed ... how I know it.`
   - Better semantic target: remove the legacy assumption that every case necessarily has one dominant friction mechanism; phrase the introduction around evidence, interpretation, uncertainty, judgment and the decision the evidence supports.
   - Current heading: `What We Know, and How`
   - Target heading: `What I Know, and How` or preferably a neutral `Evidence and Confidence`.

4. `src/app/deliverable/[clientKey]/PolicyComposedDeliverable.tsx`
   - `What We Did` → `What I Did`
   - `data we don't have` → `data I don't have`
   - `What We Found` → `What I Found`
   - `What We Measured` → `What I Measured`
   - `How We Read It` → `How I Read It`
   - pending-module `What We Did` → `What I Did`

5. `src/app/deliverable/[clientKey]/shared-modules.tsx`
   - `We also considered ...` → `I also considered ...`
   - `This range narrows once we see ...` → `This range narrows once I see ...`

### P0 — legal copy, separate legal gate

6. `src/app/legal/terms/page.tsx`
   - Still defines Signal & Friction as `we/us/our` and uses plural provider voice throughout.
   - Voice migration must preserve contracting-party identity and legal substance.
   - Substantive legal/product reconciliation is already tracked in `docs/legal/legal-evidence-audit-v0.1.md`.
   - Do not perform a blind pronoun replacement.

7. `src/app/legal/privacy/page.tsx`
   - Still uses plural provider voice throughout.
   - Several statements also depend on current establishment, registration, controller status, regulatory applicability, retention and vendor-transfer facts.
   - Hold substantive rewrite until the founder factual questionnaire and provider evidence in `docs/legal/legal-evidence-audit-v0.1.md` are resolved.

## Transactional runtime debt

The browser checker is supplemented by `scripts/check-transactional-brand-voice.mjs`.

8. `functions/api/notify-delivery/[clientKey].ts`
   - Current delivery email says `We've analyzed your funnel...`.
   - Target provider voice: `I've completed the review...`.
   - Also remove the assumption that every deliverable always contains a single isolated mechanism and mandatory projected impact range. Email should describe evidence, uncertainty, judgment/recommendation where supported, and abstention where necessary.

9. `src/server/stripe/legacy-handler.ts`
   - Current payment confirmation says `We've received...`.
   - Target provider voice: `I've received...` or neutral `Your payment has been recorded.` followed by `I'll deliver...`.
   - Replace legacy `One Signal. One Friction. One Decision.` with current evidence-ranked + abstention language.
   - Because this file owns payment processing, copy extraction should be preferred over coupling future editorial changes to payment logic.

## P1 — first-person consistency even where plural deception is absent

`src/components/PricingV21.tsx` currently uses neutral third-person descriptions such as `Signal & Friction diagnoses and guides`. This does not falsely imply a team, so the hard voice gate does not reject it. For full editorial consistency with the founder-led positioning, prefer:

- DWY: `I diagnose and guide; your team executes.`
- DFY: `I diagnose; I handle execution where the selected phase includes it.`

The current connector safety layer blocked editing this file because commercial copy and checkout-link logic are coupled. This is an architectural reason to separate copy from transaction mechanics, not a reason to relax the voice invariant.

## Gate implementation

- `scripts/check-public-brand-voice-v2.mjs` scans visible strings/JSX in active public/client surfaces and ignores comments.
- The regex is case-explicit so `US` and `en-US` are not mistaken for the pronoun `us`.
- `scripts/check-transactional-brand-voice.mjs` audits customer-facing transactional templates separately.
- `npm run check:brand-voice` aggregates public and transactional voice checks.
- `Product Integrity` calls `npm run check:brand-voice`; the PR must remain red while any active plural provider voice remains.

## Release rule

Do not merge Frontend OS v2.1 while `check:brand-voice` is red.

A green gate is necessary but not sufficient for frontend completion: legal evidence review, live Stripe redirect verification, Cloudflare preview smoke and authenticated operator smoke remain separate gates.
