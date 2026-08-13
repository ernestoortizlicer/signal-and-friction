# Decision Log — Backend OS v3

## 2026-08-13 — Replace route inventory with an outcome-driven operating system

**QUESTION**  
How should the admin backend be organized so the operator can understand what every module does, what truth it owns, and how modules interact without reading repository history?

**EVIDENCE**  
- The repository already has canonical domain/runbook authorities and a capability registry; greenfield module redesign would create duplicate authority.
- Existing navigation exposed implementation-history labels (`Pipeline`, `Prospecting`, `Scaffolds`, `Learning`, `Certified`, `Priorities`) with overlapping responsibilities.
- `src/app/admin/dashboard/page.tsx` combines commercial pipeline and other historical concerns, increasing cognitive load and making route names a poor architecture map.
- Current product integrity already treats Training, Finance, diagnosis, payments and scaffolds as governed domains with deterministic boundaries.
- Backend OS v3 already established two live cross-domain projections: `beta_projects`/`ai_incidents` → `priority_tasks`, plus stricter Training completion truth.

**OPTIONS**  
1. Keep all existing top-level modules and improve labels locally.
2. Build a new backend/platform from scratch.
3. Preserve canonical domain authorities but introduce one operator module registry and control plane over them.

**DECISION**  
Choose option 3.

Primary operator vocabulary becomes:

`Overview / Command / Sales / Delivery / Training / Finance / Reliability`

Each module contract declares purpose, source of truth, inputs, outputs, surfaces and connections. Connections are explicitly `LIVE` or `PLANNED`; planned edges are admitted integration debt and cannot be presented as implemented.

`src/lib/admin-module-registry.ts` is the canonical **operator projection**, while the domain authorities named in `docs/architecture/capability-registry.md` remain canonical business truth.

`GET /api/system/overview` provides read-only live health signals and degrades per-module rather than manufacturing a global green state.

**CONFIDENCE**  
High. This reduces parallel authority and aligns the UI with existing canonical contracts rather than inventing new domain objects.

**COST**  
Moderate UI/control-plane refactor; low data migration cost. Existing routes remain available as compatibility surfaces.

**REVERSIBLE?**  
Yes for navigation/UI. No domain truth is deleted or redefined.

**REVISIT CONDITION**  
Revisit module boundaries only when a repeated workflow demonstrates that two modules must share one transaction boundary, or a module cannot be described with a single operator outcome without persistent ambiguity.
