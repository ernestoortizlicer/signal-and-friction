# Decision Log — Frontend OS v2.1

**DATE:** 2026-08-13  
**QUESTION:** Should the frontend drift be treated as a Signal & Friction V3 rewrite or as a V2 reconciliation?

**EVIDENCE:**
- `docs/canonical/V2-OPERATING-STANDARD.md` says V3 requires material invalidation of V2 from primary evidence, production failure, economic result, or protocol/regulatory change.
- Current canonical market, claims and offer authorities already exist.
- Active public surfaces still contain legacy causal copy, generic lift framing, duplicated metadata/prices and path-based market logic.
- `/sg` already proves a shared-engine migration is possible without a country fork.

**OPTIONS:**
1. Full V3 product/frontend rewrite now.
2. Preserve V2 authority and execute a bounded Frontend OS v2.1 reconciliation.
3. Freeze all frontend changes until more sales evidence.

**DECISION:** Option 2. Fix truth/authority drift now; defer cosmetic/platform work unless it improves conversion measurement, accessibility/performance, reliability or maintainability. Treat future visual redesign as an experiment, not as constitutional change.

**CONFIDENCE:** High.

**COST:** Moderate engineering cut across public landing, metadata, pricing, confirmation and market routing; lower than a full rewrite.

**REVERSIBLE?:** Yes at implementation level. Canonical authority remains V2.

**REVISIT CONDITION:** Create a V3 constitution only if paid-market evidence, production failure, new primary technical evidence or a material business-model change invalidates a V2 principle rather than merely exposing frontend drift.
