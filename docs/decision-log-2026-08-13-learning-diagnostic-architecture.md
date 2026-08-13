# Decision Log — Learning & Diagnostic Architecture Alignment

DATE: 2026-08-13

QUESTION: Should Project B build a new Learning / Diagnostic & Delivery Copilot from scratch, or reuse the learning and diagnostic architecture already present in Signal and Friction?

EVIDENCE:
- `src/domain/reasoning/types.ts` explicitly defines the canonical `Diagnosis` domain object and states that scaffold UI, deliverables, Learning activities, and future AI agents derive from it rather than creating parallel domain models.
- The canonical diagnosis preserves six distinct epistemic layers: evidence -> observation -> hypothesis -> judgment -> recommendation -> uncertainty.
- `src/domain/reasoning/mechanisms.ts` is the canonical 21-mechanism reasoning registry, including evidence strength, epistemic warnings, diagnostic questions, misinterpretations, contraindications, references, and only defensible mappings to measured performance signals.
- `src/domain/reasoning/learning-prompts.ts` derives Learning prompts programmatically from that registry rather than maintaining a separate Learning-only copy of theory.
- `src/app/admin/learning/ReasoningActivities.tsx` explicitly replaced passive theory browsing with retrieval practice and evidence calibration.
- Diagnostic Calibration System v3 already implements a 10-stage case-method workflow: observation -> evidence review -> hypothesis -> counter-hypothesis -> Socratic challenge -> revision -> judgment -> recommendation -> reference verdict reveal -> comparative reflection.
- Hidden reference verdict fields are withheld server-side until the analyst has committed judgment and recommendation.
- `supabase/functions/diagnostic-calibration-tutor/index.ts` already provides the Socratic tutor and post-reveal calibration assessment; the Socratic step is structurally unable to receive the hidden reference answer.
- `src/lib/calibration-readiness.ts` already defines an explicit multi-criterion readiness model rather than an opaque score.
- `functions/api/scaffolds/challenge-reasoning.ts` already provides an AI reasoning partner for live diagnostic work that challenges the analyst without diagnosing or deciding for them.
- `scripts/check-domain-drift.mjs` makes divergence between canonical reasoning/training copies a build failure across the separate Next.js, Cloudflare and Supabase runtimes.

OPTIONS:
1. Build the previously proposed Agent #2 as an independent Learning + Diagnostic agent with its own prompts, state, grading and domain model.
2. Keep the existing training system untouched and build a separate diagnostic copilot beside it.
3. Treat the existing canonical reasoning domain + Diagnostic Calibration System v3 + live reasoning-challenge endpoint as the authoritative substrate, and add only missing capabilities/integration where evidence shows a gap.

DECISION:
- Choose Option 3.
- Do NOT build a parallel Learning agent or parallel diagnostic domain model.
- The existing Diagnostic Calibration System v3 is the authoritative pedagogy for analyst training.
- The existing canonical reasoning registry and `Diagnosis` object are the authoritative knowledge/domain model for diagnostic work and any future diagnostic AI assistance.
- The previously named "Agent #2 — Diagnostic & Delivery Copilot" is reinterpreted as an integration/evolution track, not a greenfield agent build. Any future functionality must reuse the canonical domain, existing calibration workflow and reasoning-partner boundary.
- Learning for the founder/analyst must happen through the product's active case-method workflow, not through explanatory chat as a substitute.
- ChatGPT/Claude may review architecture, generate candidate improvements, audit cases/evals and challenge design assumptions, but must not create a second pedagogy that bypasses the canonical training workflow.
- Agent #1 Opportunity Scout remains separate because it solves market discovery/qualification, not premium behavioral diagnosis. It must not silently promote technical signals into a diagnosis.

CONFIDENCE: High (0.95) that reuse is superior to rebuilding. Medium (0.70) on whether all future Diagnostic/Delivery assistance can remain within the current surfaces; real delivery traces may expose missing capabilities.

COST:
- Avoids duplicated prompts, data models, graders, state and pedagogy.
- Preserves prior refinement work and lowers drift risk.
- Main new cost becomes audit/integration and adding only proven gaps.

REVERSIBLE?: Yes at the interface/implementation level; no parallel domain model should be introduced without explicit evidence that the canonical model cannot represent a required capability.

REVISIT CONDITION:
Revisit only if real training or client-delivery traces demonstrate a concrete missing capability that cannot be represented safely in the canonical `Diagnosis` model or existing staged learning workflow.

STATUS: FROZEN v0.1 — canonical-reuse-first.
