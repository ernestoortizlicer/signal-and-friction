# BUSINESS TRANSFORMATION DOCUMENT — Signal & Friction
**Ernesto Ortiz Licer** | Founder & Principal Consultant | 2026-06-19

---

## 1. THE CORE THESIS

Signal & Friction is a clinical B2B conversion diagnostics firm operating on a Zero-Call, Async-First model. Every engagement is delivered as a visual brief: annotated mockups, Loom walkthroughs, and a structured Socratic diagnostic report. No retainers. No discovery calls. No scope creep.

The model is built on one behavioral insight: **SaaS founders don't need more meetings. They need the answer, delivered with clinical precision, backed by a performance guarantee.**

---

## 2. DUAL BUSINESS MODEL

### Segment A — Done-For-You (DFY) — High-Ticket

**Target:** B2B SaaS platforms doing $50k–$250k+ MRR experiencing measurable conversion decay.  
**Positioning:** Premium clinical service. Ernesto executes everything.  
**Entry:** $2,000 Beta Diagnostic (vetted, performance-gated).

| Phase | Deliverable | Price | LTV Contribution |
|---|---|---|---|
| Beta Diagnostic | Clinical report + Loom + annotated mockup | $2,000 | $2,000 |
| Intervention | Code refactor on staging + live tracking | $3,000 | $5,000 |
| Monitoring | 30-day KPI monitoring + weekly Looms | $2,500/mo | $7,500 (3 mo) |
| Expansion | Secondary friction diagnostic | $2,000 | $9,500 |
| Autonomy Kit | Full methodology transfer + handover Loom | $5,000 | $14,500 |

**Max LTV per client: $14,500**  
**Breakeven per client: 1 Beta Diagnostic covers ~6h of focused work**

### Segment B — Done-With-You (DWY) — Microdosing

**Target:** Early-stage B2B SaaS ($5k–$20k MRR), solo founders, bootstrapped teams.  
**Positioning:** Self-guided diagnostics. Ernesto architects; client implements.  
**Entry:** $350 Beta Diagnostic.

| Phase | Deliverable | Price | LTV Contribution |
|---|---|---|---|
| Beta Diagnostic | Standardized report + 5-min Loom | $350 | $350 |
| Intervention | UI mockup + developer checklist | $750 | $1,100 |
| Monitoring | Pre-configured shared dashboard | $500/mo | $1,600 (2 mo) |
| Expansion | Secondary diagnostic | $350 | $1,950 |
| Autonomy Kit | Methodology docs + final Loom | $1,500 | $3,450 |

**Max LTV per client: $3,450**  
**Volume target: 5–10 DWY clients/month for passive income baseline**

### Segment C — Certified™ Program (Licensing)

**Target:** CRO freelancers, growth agencies, digital consultants.  
**Positioning:** White-label methodology license with S&F brand authority.

| Tier | Price | What's Included |
|---|---|---|
| Certified Practitioner | $2,500 one-time | Badge, 5 templates, 1-year community, methodology access |
| Certified Agency | $5,000 one-time | All Practitioner + white-label audit rights, 10 templates, lead referrals |

**Network effect:** Each Certified partner becomes a distribution channel for S&F methodology and referral source for high-ticket DFY leads.

---

## 3. DELIVERABLE ARCHITECTURE

Every engagement follows the same three-layer structure regardless of segment:

```
Layer 1 — DIAGNOSIS
  Signal: What the data shows (conversion rates, drop-off points, funnel metrics)
  Friction: Root cause of the cognitive/UX barrier (ambiguity, trust deficit, effort overload)

Layer 2 — INTERFACE
  Visual Brief: Annotated Figma/screenshot mockup showing the exact change
  Loom Walkthrough: 5–10 min screen recording explaining the diagnosis and fix

Layer 3 — DECISION
  3 Options (Divergent): Conservative / Aggressive / Lateral
  Ernesto's Recommendation: Clear directive on which to execute first
```

---

## 4. FUNNEL ARCHITECTURE

```
LinkedIn Outreach (Sniper DMs)
        ↓
signal-and-friction.com (5-step diagnostic form)
        ↓
/confirmed (booking confirmation + Stripe payment link)
        ↓
Supabase DB (client + beta_project auto-created)
        ↓
Admin Dashboard (/admin/dashboard) — Ernesto manages pipeline
        ↓
Deliverable Portal (/deliverable/[clientKey]) — client receives report
        ↓
Certified Portal (/certified) — upgrade path for agencies
```

---

## 5. PROSPECTION STRATEGY

**Primary Channel: LinkedIn Sniper DM**

Protocol per lead:
1. Analyze the target's SaaS product (public pricing page, onboarding flow, checkout)
2. Identify the dominant friction signal visually
3. Send a 3-sentence observation DM — no pitch, no CTA, just clinical insight
4. Follow up with a specific data question (e.g. "What's your paywall conversion rate?")
5. If engaged: send the diagnostic URL, let the form qualify them

**Secondary Channel: Tally Form (Embedded)**  
The tally-banner at `/public/sf_tally_banner.png` is used in LinkedIn posts to drive form completions. The Tally webhook feeds directly into Supabase.

**Tertiary Channel: Certified Partner Referrals**  
Each Certified partner refers DFY leads in exchange for priority support access.

---

## 6. UPGRADE PATH (VIRALITY DESIGN)

```
DWY Beta ($350)
    → DWY Intervention ($750)
    → DWY Monitoring ($500/mo)
    → DFY Upgrade (when MRR crosses $50k)
    → DFY Expansion ($2,000)
    → DFY Autonomy Kit ($5,000)

OR:

DWY Beta ($350)
    → Certified Practitioner ($2,500) — they sell DWY diagnostics independently
    → Certified Agency ($5,000) — white-label + referrals back to DFY pipeline
```

**Key Insight:** The Autonomy Kit is the exit monetization at every tier. It converts a service client into a licensed partner.

---

## 7. FINANCIAL MODEL PROJECTIONS

### Conservative (Year 1 — Launch Phase)
- 2 DFY clients/month × $5,000 avg engagement = $10,000/mo
- 8 DWY clients/month × $800 avg engagement = $6,400/mo
- 2 Certified sales/month × $3,000 avg = $6,000/mo
- **MRR Target: $22,400** | **Annual: ~$270k**

### Moderate (Year 2 — Authority Phase)
- 4 DFY clients/month × $8,000 avg = $32,000/mo
- 15 DWY clients/month × $1,200 avg = $18,000/mo
- 4 Certified sales/month × $3,500 avg = $14,000/mo
- **MRR Target: $64,000** | **Annual: ~$770k**

### Aggressive (Year 3 — Scale Phase)
- 8 DFY + monitoring retainers = $80,000/mo
- 30 DWY pipeline = $40,000/mo
- Certified network (50+ partners) = $25,000/mo
- **MRR Target: $145,000** | **Annual: ~$1.74M**

---

## 8. ZERO-CALL GUARANTEE

Every service is explicitly delivered without video calls. This is a feature, not a limitation:

1. **Loom replaces the call.** The 5–10 min walkthrough contains more signal than a 60-min Zoom.
2. **Written delivery = searchable asset.** The client can share the report internally, reference it in 6 months, and send it to their dev team.
3. **Speed premium.** Zero scheduling friction = faster delivery = premium price justified.
4. **Qualification filter.** Clients who demand calls are filtered out. They are the wrong clients.

---

## 9. COMPETITIVE MOAT

| Moat | Signal & Friction Advantage |
|---|---|
| Methodology | Proprietary Signal→Friction→3 Decisions framework. Not replicable without training. |
| Brand | S&F Certified™ network creates self-reinforcing authority at scale. |
| Performance Guarantee | 20% conversion lift or full refund. Competitors don't offer this. |
| Visual Brief Format | Annotated mockup + Loom combination eliminates ambiguity. Zero "what do you mean?" follow-ups. |
| Zero-Call Model | Scalable, async, timezone-agnostic. Competes globally from day one. |
| Platform | Admin OS, CRM, Finance, Learning, Priorities — all in one diagnostic cockpit. |
