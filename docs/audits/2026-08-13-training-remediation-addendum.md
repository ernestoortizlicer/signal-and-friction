# Training Audit Remediation Addendum — 2026-08-13

This addendum records what changed after `docs/audits/2026-08-13-repository-capability-audit.md` identified production/repository drift in the analyst Training system.

## Status

### Resolved in repository and/or production

- Canonical capability inventory created: `docs/architecture/capability-registry.md`.
- Future agent build gate added: every `agents/*` directory requires `AGENT_MANIFEST.json` with authorities, reused capabilities, eval path, deterministic-first logic and human approval boundary.
- Product Integrity CI now runs the agent build gate and Training unit integrity tests.
- Latest checked Product Integrity runs are green after the new gates.
- Server-side admin authentication now returns the verified Supabase user id for attempt ownership.
- Training workflow now models the five production case dispositions and first-class professional abstention.
- Cloudflare Training attempt API binds attempts to the verified analyst id.
- Reveal uses the hardened database `finalize_and_reveal_attempt` RPC as deterministic authority.
- AI calibration no longer writes a defensible-disagreement certification rescue by itself.
- Cases API exposes `practice_only` versus `certification_eligible` explicitly.
- Readiness API separates practice calibration from premium authorization and fails closed.
- Diagnostic Calibration UI surfaces disposition/abstention and makes practice-vs-certification status explicit.
- Production DB fixed so `verdict_revealed` no longer sets `completed_at`; Comparative Reflection is mandatory before completion.
- Production DB fixed so direct RPC callers cannot skip stage=Recommendation, Socratic exchange, or Analyst Revision before reveal.
- Production DB fixed so the full preregistered reasoning trail, including Socratic exchanges and revision, is immutable after reveal.
- Production rollback smoke tests pass with zero residual synthetic rows.
- Confirmed administrator identity exists in production Supabase Auth.
- `diagnostic-calibration-tutor` is active in production Supabase.
- Canonical Training production runbook added at `docs/runbooks/training-production.md`.

## New critical findings discovered during remediation

### 1. Reveal was incorrectly equivalent to completion

The live finalizer wrote `completed_at` at verdict reveal even though Comparative Reflection is a mandatory pedagogical stage. Since gate views use completion state, this created a false-positive path.

**Fix:** production finalizer now leaves `completed_at` null at reveal. Only successful reflection completion may set it.

### 2. Direct RPC could bypass mandatory pedagogy

The live finalizer checked many preregistration fields but did not require `stage='recommendation'`, a non-empty Socratic exchange, or `revision`.

**Fix:** database finalizer now enforces all three, so the integrity contract no longer depends on the UI behaving correctly.

### 3. Post-reveal Socratic/revision tampering was possible

The live freeze trigger omitted `socratic_exchanges` and `revision` from its immutable field list.

**Fix:** complete preregistered reasoning is now frozen after verdict reveal.

## Production verification performed

### Transactional smoke A — finalization

A rollback-only synthetic test against production verified:

- wrong-stage finalization rejected;
- no-Socratic finalization rejected;
- valid staged practice attempt revealed;
- reveal stage = `verdict_revealed`;
- `completed_at` remained null;
- practice case did not become gate eligible;
- reference snapshot existed;
- zero synthetic rows remained after rollback.

### Transactional smoke B — post-reveal immutability

A second rollback-only synthetic test verified:

- post-reveal revision mutation rejected;
- post-reveal Socratic exchange mutation rejected;
- zero synthetic rows remained after rollback.

## Still open — hard gates, not polish

### A. Authenticated browser E2E

The tool environment has no Cloudflare connector and cannot impersonate the user's browser session. Therefore the database/runtime contract is verified, but the deployed Cloudflare Pages application must still be exercised with the real admin session through one complete practice attempt.

Until that passes, status is:

> **Production database integrity: VERIFIED. Application deployment: code merged/CI green, authenticated deployment verification still required.**

### B. Certification bank

Current live bank remains insufficient: the existing four published cases are practice-only, with zero certification-eligible cases.

Daily learning can begin once the browser E2E passes. Premium authorization cannot.

### C. Final personal premium-readiness threshold

The case-bank integrity contract exists, but the final personal performance threshold for authorizing premium delivery is not yet frozen. The software deliberately fails closed rather than inventing one.

### D. Historical migration-ledger reconciliation

The repository and production migration ledgers have broader historical drift. Do not run a blind production `supabase db push` until this infrastructure issue is reconciled.

### E. Legacy Learning surfaces

Diagnostic Calibration is already the default tab and `Combat Mode` is visibly labeled legacy. The older IP Lab/Hyper Leap data paths remain present for history/backward compatibility and must remain non-gating. A later cleanup should isolate them more clearly without deleting historical learning data.

## Decision

Daily practice and certification are now explicitly decoupled:

- **Practice launch gate:** authenticated browser E2E against the canonical Diagnostic Calibration path.
- **Premium authorization gate:** certification bank ready + frozen personal threshold + gate-eligible performance evidence.

Do not block learning on the slower certification-bank buildout; do not weaken certification to accelerate learning.
