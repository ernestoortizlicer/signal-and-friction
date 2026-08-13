# Signal & Friction — Project Design System v1

**Status:** PROPOSED PROJECT-WIDE VISUAL AUTHORITY  
**Effective target:** 2026-08-13  
**Scope:** public site, scan/pricing flows, client surfaces, Command Center and future product surfaces.

## 1. Design premise

Signal & Friction is one product, not a federation of pages. A route may have different information density or purpose, but it may not invent its own typography hierarchy, spacing rhythm, surface language, control sizing or interaction grammar.

The design system therefore sits above individual modules. Module code composes the system; module code does not redefine it.

## 2. Authority hierarchy

1. `src/app/globals.css` — brand palette, fonts and foundation utilities.
2. `src/styles/sf-design-system.css` — project-wide semantic design tokens, type scale, spacing, radii, controls, content widths and system-level composition rules.
3. Shared components — reusable page headers, panels, metrics, status and action primitives.
4. Route composition — workflow-specific layout using the authorities above.

A local page style may solve a genuinely local problem. It may not become a second design system.

## 3. One visual grammar

### Typography

Operationally important information must not be microscopic.

Canonical scale:
- micro / metadata: 12 px minimum;
- label: 13 px;
- body: 15–16 px;
- card title: 18 px;
- section title: 24 px;
- page title: responsive 32–44 px;
- public display: responsive 44–80 px when the surface genuinely needs a hero.

Monospace is for metadata, evidence labels, identifiers and system state. It is not the default font for long explanatory copy.

### Spacing

All surfaces use the shared 4 px-based rhythm. Page padding, card padding and section gaps come from the same scale. Density may vary by context but not arbitrarily.

### Surfaces

Controls, cards and feature surfaces have a stable radius hierarchy. Borders use semantic gold/neutral emphasis rather than one-off literal styles.

### Controls

Interactive controls have a readable type size and minimum target height. A primary action must be visually distinguishable from destructive, secondary and status-only UI.

## 4. Command Center contract

Every `/admin/*` route is scoped by `AdminShellV3` with `sf-admin` and `sf-admin-content`.

That shell enforces:
- a common maximum content width;
- one page gutter and vertical rhythm;
- one heading hierarchy;
- a 12 px minimum for legacy microcopy;
- common control sizing;
- common card radius;
- readable table typography;
- one navigation density.

This means older modules improve immediately even before every JSX tree is migrated to shared primitives. New modules must use the explicit primitives directly.

## 5. Public-surface contract

The root app template loads the same project design constitution for every route. Public pages may use more whitespace and larger display typography than the Command Center, but they consume the same semantic color, spacing, radius, content-width and control rules.

A marketing page and an admin workflow should feel like different rooms in the same building, not different products.

## 6. Data-heavy workflow rule

A table is appropriate only when column-to-column comparison is the operator's primary task.

When a row contains heterogeneous workflow state, evidence, actions and expandable provenance, use an operational row-card or master/detail pattern instead of forcing everything into columns.

Primary workflows must not require horizontal scrolling on a normal desktop viewport.

### Prospecting reference implementation

Prospecting keeps its existing evidence and action semantics but presents each company as a responsive operational row-card:
- company identity;
- technical triage signals;
- explicit founder-contact state;
- compact Contact Discovery summary;
- expandable evidence/provenance;
- status;
- actions.

Contact Discovery follows `summary → evidence`. Search/provider logs are hidden until requested. No discovery result auto-fills founder contact and no contact action occurs automatically.

## 7. Empty and unknown states

Blank space is not a state.

Examples:
- `No founder contact saved yet` rather than an unexplained empty input area;
- `No discovery run yet` rather than a missing result;
- `No canonical target URL` rather than an empty client field;
- `Unavailable` rather than silently hiding a failed subsystem.

Unknown, not-run, no-result, failure and verified are distinct states and must look distinct.

## 8. Sales information architecture

Sales is a lifecycle, not a dashboard bucket:

`Prospects → Opportunities → Clients`

- **Prospects** owns evidence gathering before commercial commitment.
- **Opportunities** owns commercial stage for relationships explicitly chosen for pursuit.
- **Clients** owns relationship/contact identity once a real relationship exists.
- **Command** owns priority.
- **Finance** owns money truth.
- **Delivery** owns diagnostic/deliverable work.
- **Reliability** owns system learning and incidents.

The legacy `/admin/dashboard` remains a compatibility workspace only while its remaining write actions are extracted. `Continuous Learning OS` is not a Sales surface.

## 9. Progressive disclosure

Evidence, logs, provenance, raw responses and advanced controls should be available without occupying primary visual hierarchy at all times.

Default view answers the operator's decision question. Secondary evidence is one action away.

## 10. Responsive contract

Desktop layouts must work without horizontal workflow scrolling. At narrower widths, multi-column row-cards collapse predictably into two/one-column arrangements while preserving information priority.

Responsive behavior is part of the component contract, not an afterthought implemented separately by each route.

## 11. Regression requirements

A release should fail design integrity when the project loses any of these structural invariants:
- project design stylesheet not loaded globally;
- Command Center shell not scoped to shared design authority;
- Sales primary navigation points back to legacy Pipeline instead of the lifecycle hub;
- Prospecting reverts to horizontal table dependence;
- Contact Discovery loses progressive disclosure or explicit provenance;
- legacy Continuous Learning becomes a first-class Sales surface again;
- shared visual tokens/type floor are removed.

Visual regression screenshots can be added later, but deterministic structural guards come first.

## 12. Migration strategy

Do not pause the business to rewrite every page.

1. Establish the authority once.
2. Make the shell enforce the safe baseline globally.
3. Migrate high-frequency surfaces to shared primitives first.
4. Extract legacy monolith functions only when the new surface can preserve the real workflow.
5. Convert each repeated visual failure into a token, primitive or regression guard.

The goal is not aesthetic uniformity for its own sake. The goal is lower cognitive load, faster operation, fewer accidental inconsistencies and a product that can scale without visual entropy.
