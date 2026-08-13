# Decision Log — Agent Roadmap v0.1

DATE: 2026-08-13

QUESTION: What agent systems should Signal and Friction build first, and what is the initial boundary of Agent #1?

EVIDENCE:
- The repository already contains a prospecting-specific scan pipeline (`functions/api/prospecting/scan.ts`) that reuses the shared scan engine and persists raw technical signals plus a deterministic technical score.
- The prospecting scan is intentionally a triage mechanism, not a diagnosis: it excludes interpreted pain narratives and projected business-impact numbers from prospecting-facing signals.
- The current scan covers Core Web Vitals (LCP, CLS, TBT), mobile viewport presence, trust/disclosure signals (pricing, security, third-party reviews, testimonials, privacy, terms), primary CTA presence, and additional informational technical fields.
- The canonical commercial offer catalog currently contains DWY and DFY ladders across Diagnostic, Intervention, Monitoring, Expansion, and Autonomy Kit.
- The first agent must create a measurable commercial outcome for Signal and Friction while remaining simple, observable, eval-driven, and human-approved at material external-action boundaries.

OPTIONS:
1. Build one broad autonomous sales agent covering prospect discovery, qualification, outreach, replies, follow-up, negotiation, and closing.
2. Build several specialized agents immediately: prospecting, conversation, diagnostic, learning, delivery, and customer follow-up.
3. Start with one narrow Opportunity Scout, then add a Diagnostic & Delivery Copilot, and split further agents only when workflow evidence justifies it.

DECISION:
- Freeze Option 3 as roadmap v0.1.
- Agent #1: `Signal and Friction Opportunity Scout` (internal working name).
  - Outcome: identify evidence-backed commercial opportunities for Signal and Friction and prepare a first-contact package ready for human approval.
  - Core stages: discovery -> research -> evidence gathering -> qualification -> service-fit hypothesis -> contact-role selection -> outreach draft -> human approval.
  - The existing Scan is a tool/signal source inside this workflow, not the whole qualification system and not a substitute for diagnosis.
  - Agent #1 v1 must not autonomously send outreach, answer prospect replies, negotiate, price, or close.
- Agent #2: `Signal and Friction Diagnostic & Delivery Copilot` (internal working name).
  - Combines learning and real-work assistance rather than creating a separate learning-only agent.
  - TRAIN mode: teach the method, present cases, require diagnosis, grade reasoning, and convert failures into evals.
  - EXECUTE mode: assist on live diagnostic/delivery work, surface evidence gaps, enforce the service method, and prepare reviewable deliverables.
- Future Sales Conversation Agent and Client Follow-up / Success Agent remain conditional; they are not approved for build until real workflow data shows that separation creates measurable value.
- Do not build a standalone learning-only agent at this stage.

CONFIDENCE: High (0.85) on sequencing; Medium (0.65) on final boundaries because real prospecting and delivery traces may justify later changes.

COST:
- Immediate cost is deliberately low: specification, eval design, and a narrow first build rather than a multi-agent platform.
- Main opportunity cost avoided: premature architecture and duplicated agents before evidence exists.

REVERSIBLE?: Yes. Names, boundaries, tools, orchestration, and agent count are explicitly provisional. The outcome contracts and eval evidence take precedence over the current architecture.

REVISIT CONDITION:
Revisit this decision when any of the following occurs:
1. Agent #1 traces show that prospect research/qualification and conversation handling require materially different context, tools, permissions, or eval criteria.
2. Human-review data shows a safe, economically meaningful action can be automated without degrading quality.
3. Diagnostic/delivery work produces a repeated workflow that warrants a separate specialist agent or deterministic service.
4. A horizontal tool performs the same workflow more reliably or cheaply.
5. Prospecting economics fail: weak qualified-opportunity yield, poor meeting conversion, excessive research cost, or no measurable pipeline impact.

STATUS: FROZEN v0.1 — build may proceed; architecture remains evidence-reversible.
