# Handoff: "Scan My Funnel" Diagnostic Card (US/Global + Asia/Singapore)

## Overview
A premium, magnetic 5-step diagnostic card for the Signal & Friction landing page. It replaces
the single-field hero form (`SYS.CAL`) with a guided wizard that captures URL → ARR range →
optimization objective → friction hypothesis → delivery email, then confirms with a
"DIAGNOSTIC QUEUED" state. Black + gold terminal aesthetic, motion phase-locked to the existing
3D cube/wireframe in the hero.

## About the Design Files
`Scan My Funnel Card.dc.html` in this bundle is a **design reference created in HTML** — a
prototype showing the intended look and behavior, **not production code to paste in**. Recreate it
in the target codebase using its existing environment (React/Vue/Svelte/etc.), styling system, and
component patterns. If no environment exists yet, pick the framework already used by the marketing
site. Open the file in a browser to see the interactions and animation timing.

## Fidelity
**High-fidelity.** Colors, typography, spacing, easing, and interactions are final. Recreate
pixel-for-pixel using the codebase's existing libraries. Corners are **square (radius 0)** by design.

---

## Design Tokens

### Color
| Token | Value | Use |
|---|---|---|
| bg | `#0b0a07` | page base |
| bg-glow | `radial-gradient(120% 120% at 70% 0%, #100d08 0%, #0b0a07 55%, transparent 100%)` | page wash |
| card-grad | `linear-gradient(158deg, #100e0a 0%, #0a0906 100%)` | card fill |
| gold | `#CBA135` | primary accent, borders, CTA outline |
| gold-bright | `#E9C766` | active/selected, hover fill target, sheen |
| gold-deep | `#B9902B` | progress gradient start |
| border-outer | `rgba(203,161,53,.28)` | card border |
| border-divider | `rgba(203,161,53,.16)` | header/footer/progress rules |
| tile-border | `rgba(203,161,53,.18)` → hover `rgba(203,161,53,.4)` | option tiles |
| tile-bg | `rgba(203,161,53,.03)` → hover `rgba(203,161,53,.06)` | option tiles |
| grid-line | `rgba(203,161,53,.045)` | 30px grid texture |
| bracket | `rgba(203,161,53,.7)` | corner brackets |
| text | `#ECE7D9` | primary text |
| text-muted | `#8C8474` | secondary/labels |
| text-faint | `#6f685a` | footer, placeholder |
| online-green | `#57a86f` | live/social-proof dot |
| error | `#D96A5A` (suggested) | inline validation ERR |

### Typography
`JetBrains Mono`, weights 400/500/600/700. All uppercase micro-labels use letter-spacing.
| Element | Size / weight / spacing |
|---|---|
| micro-label (SYSTEM CALIBRATION…) | 12px / 400 / ls 3px / uppercase / gold@.6 |
| step question | 20px / 500 / ls .3px / #ECE7D9 |
| option value | 15–16px / 600 / ls 1px | 
| option label | 11px / 400 / ls 1px / muted |
| input | 16px / 400 / ls 1px |
| CTA button | 14px / 600 / ls 3px (→4px on hover) / uppercase |
| header SYS.CAL | 13px / 600 / ls 4px |
| footer | 11px / ls 1.5px / faint |

### Layout / spacing
- Card max-width **660px**, square corners, `overflow:hidden`.
- Header/footer padding `16–20px 28px`; body padding `28px`; body `min-height:290px`.
- Grid texture `background-size:30px 30px`, opacity .6.
- Corner brackets: 18×18px, 1px, two borders each, one per corner.
- Option grid: 2 columns (steps 2 & 3), `gap:12px`; step 4 (hypothesis) is a vertical list, `gap:10px`.
- Box shadow: `0 40px 100px -30px rgba(0,0,0,.8), inset 0 1px 0 rgba(203,161,53,.12)`.

### Motion — phase-locked to the cube (**BEAT = 3.467s** = cube loop)
| Animation | Duration / easing |
|---|---|
| vertical scan line (top→bottom) | `2×BEAT` = 6.933s, `cubic-bezier(.45,0,.55,1)` |
| top-edge specular sheen (L→R) | `2×BEAT` = 6.933s, same ease, **delay −BEAT** (half-phase) |
| gold aura breathe | `2×BEAT` = 6.933s, `ease-in-out` |
| header dot pulse + social dot | `1×BEAT` = 3.467s, `ease-in-out` |
| progress-bar shimmer | `1×BEAT` = 3.467s, linear |
| card entrance (once) | .9s `cubic-bezier(.16,1,.3,1)` (fade + translateY 16px + scale .985 + blur 7px) |
| step content rise | .4s ease |
| progress width fill | .55s `cubic-bezier(.2,.8,.2,1)` |
| auto-advance after option select | 360ms |

> **Sync rule:** derive every timing from `BEAT`. If the cube's loop changes, update `BEAT` and
> all card motion re-syncs. Long/ambient motions = `2×BEAT`; pulses/shimmer = `1×BEAT`.

---

## Component Spec — `<ScanFunnelCard region>`
Header: three dots (first gold + pulse, two dim) · `SYS.CAL` · right `STEP {n} / 5` (n gold).
Segmented progress bar (5 segments via 4 tick dividers at 20/40/60/80%).
Body swaps per step; footer shows engine string + trust badges.

### Steps
0. **SYSTEM CALIBRATION** — URL input, social-proof line, `SCAN MY FUNNEL →` button.
1. **REVENUE SCALE** — ARR range, 2×2 tiles: `PRE-$1M / $1–5M / $5–20M / $20M+`.
2. **PRIMARY OBJECTIVE** — 2×2 tiles: `TRIAL → PAID`, `SIGNUP → ACTIVE`, `DEMO → CLOSE`, `EXPANSION`.
3. **FRICTION HYPOTHESIS** — vertical list: `LANDING / ONBOARDING / PRICING / CHECKOUT / NOT SURE`.
4. **REPORT DELIVERY** — email input, guarantee line, `RUN DIAGNOSTIC →` button.
5. **DIAGNOSTIC QUEUED** — confirmation with target URL + 72h promise + guarantee.

Selected tile: full-bleed inner border `#E9C766`, wash `rgba(203,161,53,.09)`, inset glow, `◈` tick (grid tiles).
Hover tile: border `.4`, bg `.06`. CTA hover: fill `#CBA135`, text `#0b0a07`, glow `0 0 34px rgba(203,161,53,.4)`, ls→4px.

### Behavior
- Option steps **auto-advance 360ms** after selection (prop `autoAdvance`; when off, show `CONTINUE →`, gated on a selection).
- `← BACK` on steps > 0. Progress = `step/5 × 100%`.
- Validate URL (step 0) and email (step 4); on empty submit show inline gold-red `ERR: …` under the field (see live-site reference screenshot).
- Props: `region`, `autoAdvance` (default true), `glowAura` (default true), `showFooter` (default true).

### State
`step (0–4)`, `url`, `email`, `scale`, `objective`, `hypothesis`, `done`. Advance/back/select/submit.

### Accessibility
Real `<form>`; labelled inputs; gold `:focus-visible` ring; `aria-live="polite"` on the step region;
Enter advances URL/email steps; arrow keys move option focus; **honor `prefers-reduced-motion`**
(disable scan/edge/aura/pulse/shimmer, keep instant state changes and the width fill).

---

## Regionalization

Build **one** component driven by a `REGION` config; ship two routes: `/` (US/Global) and `/sg` (Asia–Singapore).

| Key | `us` (Global) | `sg` (Asia / Singapore) |
|---|---|---|
| locale | `en-US` | `en-SG` |
| header clock | live **UTC** — `ONLINE · UTC HH:MM` | live **SGT (UTC+8)** — `ONLINE · SGT HH:MM` |
| ARR currency | USD `$` | USD `$` + caption `· priced in USD` (optional SGD toggle) |
| social proof (step 0) | `Join 50+ B2B SaaS founders who have diagnosed their funnel.` | `Join 30+ APAC B2B SaaS founders who have diagnosed their funnel.` |
| footer trust badge | `◈ E2E ENCRYPTED · SOC 2` | `◈ E2E ENCRYPTED · PDPA COMPLIANT` |
| delivery line (step 4) | `72h async delivery · One finding · One fix` | `72h async · APAC-hours scheduling · One finding · One fix` |
| guarantee | `S&F 20% Growth Guarantee™` | `S&F 20% Growth Guarantee™` |
| CTA / questions / options | identical | identical |

Everything else (tokens, motion, layout, options) is shared. Keep copy in an i18n map so more regions can be added.

---

## Claude Code Prompt (paste into VS Code)

> Build a premium 5-step "Scan my funnel" diagnostic card for the Signal & Friction marketing site,
> shipped as two regional routes: `/` (US/Global) and `/sg` (Asia–Singapore).
>
> The design reference is `design_handoff_scan_funnel_card/Scan My Funnel Card.dc.html` (open it in a
> browser for the exact look + behavior) plus this README's tokens/spec. It is a **reference, not code
> to copy** — recreate it in this repo's existing stack and component/styling patterns, pixel-for-pixel.
> Corners are square (radius 0); font is JetBrains Mono; palette is black + gold only — do not add colors.
>
> 1. **Visual:** dark terminal card, `card-grad` fill, `border-outer`, 30px gold grid texture, four L
>    corner brackets, box shadow per README. Use the exact color/type/spacing tokens in the README.
> 2. **Keep the existing 3D cube/wireframe hero background** and overlay the card on it. Define a single
>    constant `BEAT = 3.467s` (the cube's loop). Phase-lock all card motion to it: scan line, top-edge
>    specular sheen (delay −BEAT), and aura = `2×BEAT`; header/social dot pulse and progress shimmer =
>    `1×BEAT`. If the cube speed changes, only `BEAT` changes. Easings per README.
> 3. **Wizard behavior:** 5 steps (URL → ARR → objective → friction hypothesis → email) then a
>    "DIAGNOSTIC QUEUED" confirmation. Option steps auto-advance 360ms after select (prop `autoAdvance`;
>    when false show a gated `CONTINUE →`). `← BACK` on steps > 0. Progress bar fills 20%/step, width
>    transition .55s. Validate URL and email; on empty submit show inline gold-red `ERR:` under the field.
> 4. **Accessibility:** real `<form>`, labelled inputs, gold `:focus-visible` ring, `aria-live` on step
>    changes, Enter to advance, arrow keys across options, and full `prefers-reduced-motion` support
>    (kill ambient animations, keep instant state + width fill).
> 5. **Regionalization:** one `<ScanFunnelCard region="us|sg" />` driven by the REGION config below.
>    The header clock renders live local time in the region's timezone. Route `/` → `us`, `/sg` → `sg`.
> 6. **Wiring:** submit posts to `POST /api/diagnostic` (adjust to the real endpoint) with
>    `{ url, arr, objective, hypothesis, email, region }`; fire analytics `scan_started`,
>    `step_completed{step}`, `scan_submitted{region}`.
> 7. **Responsive:** down to 360px — card goes full-width, padding tightens, option grids collapse to 1
>    column under ~420px. Provide a preview/story per region.
>
> ```ts
> const REGION = {
>   us: {
>     locale: 'en-US', tz: 'UTC', clockLabel: 'UTC',
>     arrCurrency: 'USD', arrNote: '',
>     socialProof: 'Join 50+ B2B SaaS founders who have diagnosed their funnel.',
>     trustBadge: '◈ E2E ENCRYPTED · SOC 2',
>     delivery: '72h async delivery · One finding · One fix',
>     guarantee: 'S&F 20% Growth Guarantee™',
>   },
>   sg: {
>     locale: 'en-SG', tz: 'Asia/Singapore', clockLabel: 'SGT',
>     arrCurrency: 'USD', arrNote: '· priced in USD',
>     socialProof: 'Join 30+ APAC B2B SaaS founders who have diagnosed their funnel.',
>     trustBadge: '◈ E2E ENCRYPTED · PDPA COMPLIANT',
>     delivery: '72h async · APAC-hours scheduling · One finding · One fix',
>     guarantee: 'S&F 20% Growth Guarantee™',
>   },
> } as const;
> ```
>
> Match spacing, easings, and the sync-to-cube timing exactly. Ask before introducing any new
> dependency; prefer the repo's existing animation/styling tools.

---

## Files
- `Scan My Funnel Card.dc.html` — the high-fidelity design reference (open in a browser).
- `README.md` — this document (self-sufficient spec + prompt).
