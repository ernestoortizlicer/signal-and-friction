# Signal & Friction — Frontend Visual Language v2.1

**Status:** design contract for active/refactored surfaces  
**Authority:** subordinate to Signal & Friction V2 product/evidence/commercial truth  
**Goal:** make the interface feel like a precise evidence instrument, not a generic AI/cyberpunk dashboard.

## 1. Brand premise

Signal & Friction should communicate:

**observation → evidence → judgment → uncertainty → decision**

The visual system exists to make those distinctions easier to understand. Decoration that does not improve trust, comprehension, conversion measurement, accessibility, or operator throughput is optional debt.

The target feeling is **editorial precision + diagnostic instrumentation**.

Avoid:
- terminal/cyberpunk theatre as a default aesthetic;
- fake system-version authority (`Engine v2.5`, presentation versions, runtime labels) unless the version is operationally meaningful;
- decorative grids, glows, animated canvases or oscilloscopes on every page;
- tiny metadata text that becomes an accessibility tax;
- using green/red/gold simply because a screen looks empty.

## 2. Typography roles

### Editorial / decision layer
Use the editorial serif (`font-serif` / Newsreader) for:
- client names;
- major findings;
- decisions;
- section titles where judgment matters;
- short high-salience statements.

### Product / body layer
Use Inter / sans for:
- explanations;
- instructions;
- evidence prose;
- forms;
- legal/product copy;
- longer reading.

### Instrument layer
Use JetBrains Mono / `font-mono` only for:
- evidence tiers;
- field labels;
- timestamps;
- technical metrics;
- state/status chips;
- compact navigation where appropriate.

Mono is not the default body voice.

### Size floor
Public/client surfaces should not rely on text below 11px for information a user must understand or act on. Very small text is allowed only for non-essential metadata with sufficient contrast.

## 3. Semantic color contract

Use semantic tokens on new/refactored public and client surfaces.

- **Gold / accent:** authority, primary action, selected state, evidence boundary. Gold does not mean “positive result.”
- **Green / success:** measured success, verified completion, or a legitimately positive state. Never use it simply to make a KPI feel good.
- **Red / error:** error, denial, destructive/risk state. Never use it as ambient brand decoration.
- **Muted neutral:** pending, unknown, unavailable, historical, non-authoritative.

Do not invent page-local variants of the same semantic state unless a real information distinction exists.

## 4. Epistemic UI contract

The interface must visually preserve these distinctions whenever relevant:

1. **Measured** — directly observed/verified data.
2. **Modeled / assumption-dependent** — derived estimate or scenario.
3. **Pending** — evidence expected but not yet available.
4. **Unknown** — cannot currently be determined.
5. **Hypothesis** — explanatory possibility, not a fact.
6. **Judgment** — analyst decision supported by the current evidence.
7. **Abstention** — explicit state when evidence is insufficient.

A badge or color may reinforce the distinction, but copy must remain understandable without color alone.

No UI may turn a technical signal into a behavioral mechanism merely by where or how it is displayed.

## 5. Voice contract

- Use **“Signal & Friction”** for company, contractual, product-system and policy statements.
- Use **“I”** for genuinely founder-authored method commentary or personal walkthroughs.
- Do not use a fictional corporate **“we”** when a claim is actually the founder speaking.
- Do not use “AI system” language as a substitute for the human diagnostic authority.

Commercial copy should be confident about process and evidence discipline, conservative about causality and outcomes.

## 6. Public acquisition surfaces

Homepage, APAC landing, Scan, Pricing and Portfolio should share:
- the same header/navigation grammar;
- one max-width family;
- one primary CTA treatment;
- semantic tokens;
- restrained borders/surfaces;
- visible evidence/uncertainty boundaries.

Primary flow:
**understand method → observe technical signal / inspect sample → review Diagnostic → checkout**.

The Free Scan is a top-of-funnel observation instrument, not a cheaper diagnosis.

No ambient visual effect is required for brand recognition. Keep one only if measured performance and funnel data justify its cost.

## 7. Client delivery surfaces

Deliverable and SLA should feel calmer and more legible than Admin.

Priority hierarchy:
1. what was observed;
2. what remains unknown;
3. what judgment was made (or why the system abstained);
4. what action is recommended or already executed;
5. what changed afterward.

Client delivery should progressively migrate from literal color classes to the semantic token system when modules are touched for product reasons. A blanket cosmetic rewrite is not required.

Avoid language such as `Initializing diagnostic runtime` unless it communicates a real state the client needs. Prefer plain operational language (`Loading deliverable`, `Access unavailable`, `Waiting for evidence`).

## 8. Internal Admin surfaces

Admin may be denser than public/client UI, but density must serve operator throughput.

Rules:
- module-specific KPIs belong inside the module unless they are truly cross-system;
- status labels must map to authoritative backend state;
- archived/non-gating systems remain visually marked as such;
- unknown/error state is preferable to a placeholder metric;
- presentation-version labels do not imply product/system authority;
- human approval boundaries must be visually obvious for consequential actions.

Do not redesign internal modules merely to achieve visual symmetry with the marketing site.

## 9. Motion

Motion must communicate one of:
- navigation/change of state;
- relationship between before/after;
- progressive disclosure;
- completion/progress that comes from real state.

Do not animate static evidence for ambience.

All motion must respect reduced-motion preferences. Avoid expensive background canvases or continuous animation on conversion-critical routes without measured value.

## 10. Accessibility/performance floor

For refactored public/client surfaces:
- keyboard focus visible;
- form label and error association explicit;
- touch controls target approximately 44px where practical;
- no required information conveyed by color alone;
- avoid fixed `h-screen` transactional layouts that can hide controls on mobile/zoom;
- keep headings semantically ordered;
- preserve global reduced-motion support;
- measure Core Web Vitals rather than assuming a lightweight-looking page is fast.

## 11. Extraction rule

Do not build a general design-system platform now.

Extract a reusable primitive only when:
- at least two active surfaces need it, or
- centralization prevents authority/claim drift, or
- accessibility/performance would otherwise be duplicated incorrectly.

Current high-value shared primitives are likely limited to:
- PublicShell/nav/footer;
- EvidenceBoundary;
- status/evidence badges;
- client section/card primitives;
- common empty/error/pending states.

## Decision

Frontend OS v2.1 optimizes for **truth, comprehension, trust, conversion measurement, accessibility and maintainability**. “More futuristic” is not an acceptance criterion.
