# Decision Log — Command Center Visual Contract v2

**DATE:** 2026-08-13

## QUESTION

How do we eliminate page-by-page visual drift in the Command Center so every first-class module reads as one operating system rather than a federation of independently styled tools?

## EVIDENCE

- Prospecting used `AdminSectionHeader`, which rendered the primary page title as an `h2` with a local `text-xl` scale.
- Priorities, Training, Finance, Reliability and Overview each declared their own local page-title sizes (`text-3xl`, `text-4xl`, etc.).
- The project already had shared typography/spacing/radius tokens and `AdminPageHeader`, but adoption was incomplete.
- The operator noticed the inconsistency immediately in production, demonstrating that token existence alone was not sufficient product governance.

## OPTIONS

1. Fix Prospecting only by increasing its title size.
2. Rewrite every admin page immediately around new components.
3. Make semantic page headers a shell-level contract, convert the legacy header component into a canonical compatibility alias, and progressively remove inert local styling while CI protects the invariant.

## DECISION

Choose option 3.

The Command Center now has two layers of visual enforcement:

1. **Canonical primitives** — `AdminPageHeader` and the legacy-compatible `AdminSectionHeader` both emit `sf-page-header` + semantic `h1.sf-page-title`.
2. **Shell authority** — any page-level `header` containing an `h1` inside `.sf-admin-content` receives the same page-header composition, eyebrow treatment, title scale, subtitle scale and lower border regardless of local legacy Tailwind classes.

The shared design stylesheet remains the runtime authority for content width, gutters, type floor, control height, card radii and responsive Prospecting composition.

First-class Command Center surfaces must expose a semantic page-heading contract and are enumerated by the design-system regression guard.

## CONFIDENCE

High. The failure was directly observable in production and the remedy operates at the shared composition layer rather than at individual page font sizes.

## COST

Low implementation cost; moderate cleanup debt remains because some legacy pages still carry now-inert local heading classes. Those classes are no longer authoritative and can be removed opportunistically without changing runtime appearance.

## REVERSIBLE?

Yes. The shared CSS and compatibility component can be reverted without database changes.

## REVISIT CONDITION

Revisit if:
- visual regression testing becomes reliable enough to supplement deterministic structural guards;
- a first-class surface needs a genuinely different information-density pattern that cannot be expressed through the shared primitives;
- browser support for the `:has()` selector becomes a real compatibility constraint for supported operator browsers.
