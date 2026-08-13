# Decision Log — Project Design System v1 + Sales lifecycle

**DATE:** 2026-08-13

## QUESTION

How should Signal & Friction eliminate page-by-page visual drift while restructuring Sales around one coherent operator lifecycle without duplicating business authority?

## EVIDENCE

- The Command Center already shared brand colors and fonts, but page composition remained local: arbitrary 9–11 px operational text, inconsistent content widths, card radii, spacing, control density and table behavior.
- Prospecting had become a heterogeneous workflow rendered as a wide spreadsheet even though each row contained identity, technical evidence, contact discovery, provenance, state and actions rather than a pure column-comparison task.
- The Backend OS architecture already defines outcome modules and one canonical authority per kind of truth. Sales nevertheless exposed legacy implementation vocabulary and mixed system-learning UI into a commercial surface.
- Existing canonical Sales truth is split by purpose: `prospect_candidates` for pre-commitment evidence, `beta_projects` for commercial/project progression and `clients` for relationship identity. Command owns action priority, Finance owns money truth, Delivery owns diagnostic work and Reliability owns incidents/system learning.
- The current database schema and production data do not need modification to express the corrected information architecture.

## OPTIONS

1. **Continue page-by-page redesign.** Lowest immediate code change, but preserves the root cause: every module can invent its own visual grammar and entropy returns.
2. **Rewrite the whole frontend before shipping.** Maximum theoretical consistency, but high cost, high regression surface and poor leverage relative to the actual operator problem.
3. **Create one project-wide design authority, enforce a safe baseline at the shell/root, migrate high-frequency surfaces first, and make Sales a lifecycle projection over existing canonical truth.** Moderate change, immediately compounds across the product, preserves current data/action boundaries and supports incremental migration.

## DECISION

Choose option 3.

- `src/styles/sf-design-system.css` is the semantic visual authority above individual modules.
- The root app template loads the project design scope; `AdminShellV3` applies the stricter Command Center scope to every `/admin/*` surface.
- Shared admin primitives own page headers, panels, metrics, status and action patterns.
- Operationally important microcopy has a 12 px floor; content width, spacing, radii, controls and heading hierarchy are centralized.
- Prospecting is projected as responsive operational row-cards, not a horizontally dependent spreadsheet. Contact Discovery uses `summary → evidence` progressive disclosure and never auto-fills or contacts a person.
- Sales becomes `Prospects → human promotion → Opportunities → Clients`.
- `/admin/dashboard` remains compatibility-only until its remaining write actions are extracted. It does not define the Sales mental model.
- System learning remains a Reliability responsibility, not a Sales tab.
- No DDL or production-data mutation is part of this decision.

## CONFIDENCE

**High (0.91).** The change removes observed structural drift while preserving canonical data and action boundaries. Remaining uncertainty is primarily visual/browser behavior on the full production surface set, not architecture or data semantics.

## COST

- One shared stylesheet and root/admin scoping layer.
- Shared admin presentation primitives.
- Three Sales lifecycle surfaces plus Prospecting composition changes.
- Compatibility CSS for the legacy dashboard.
- Documentation and deterministic Product Integrity guards.
- Ongoing migration cost as legacy pages are converted from inherited baseline rules to explicit shared primitives.

## REVERSIBLE?

**Yes.** The cut is presentation/information architecture only. No schema or data migration is required. Individual surfaces can be reverted independently, and the legacy dashboard remains available during extraction.

## REVISIT CONDITION

Revisit this decision when any of the following is true:

- operator testing shows the shared type/spacing/content-width baseline reduces task efficiency on a specific high-density workflow;
- a workflow genuinely requires a different interaction grammar that cannot be expressed through shared semantic tokens/primitives;
- public-site migration reveals a brand requirement that should become a new shared token rather than a local exception;
- the legacy Sales dashboard has no remaining unique write capability, at which point remove the compatibility route instead of styling around it;
- deterministic guards stop catching meaningful regressions, at which point add browser-level visual/interaction regression tests rather than weakening the architecture contract.
