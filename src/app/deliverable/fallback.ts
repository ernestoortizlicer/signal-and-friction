export interface Decision {
  type: string;
  label: string;
  action: string;
  reasoning: string;
  tradeoff: string;
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  content: string;
}

export interface ChecklistItem {
  id: string;
  task: string;
  done: boolean;
  tip: string;
}

export interface BeforeAfterData {
  beforeTitle: string;
  beforeIssue: string;
  beforeFields: string[];
  beforeBounce: string;
  afterTitle: string;
  afterDomain: string;
  afterGain: string;
}

export interface DeliverableData {
  clientKey?: string;
  clientName: string;
  date: string;
  consultant: string;
  loomUrl: string;
  segment?: 'high_ticket' | 'microdosing';
  currentPhase?: 'diagnostic' | 'intervention' | 'monitoring' | 'expansion' | 'autonomy';
  progressPercent?: number;
  // Previously hardcoded — now dynamic per client
  founderFocusScore?: number;
  daysRemaining?: number;
  guaranteeStatus?: string;
  telemetryStatus?: string;
  beforeAfter?: BeforeAfterData;
  learningModules?: LearningModule[];
  checklist?: ChecklistItem[];
  diagnosis: {
    signal: string;
    friction: {
      mechanism: string;
      rootCause: string;
    };
    decisions: Decision[];
  };
}

export const COMMAND_CENTER_GUIDE: DeliverableData = {
  clientKey: "command-center-guide",
  clientName: "Command Center",
  date: "June 22, 2026",
  consultant: "Signal & Friction",
  loomUrl: "",
  segment: "microdosing",
  currentPhase: "autonomy",
  progressPercent: 0,
  founderFocusScore: 100,
  daysRemaining: 365,
  guaranteeStatus: "V2.0 Sovereign — Fully Operational",
  telemetryStatus: "Vault Active · Cloudflare Edge Live · claude-opus-4-8",
  beforeAfter: {
    beforeTitle: "Operating Without the System",
    beforeIssue: "Operational Fragmentation — 5 disconnected tools, no unified diagnostic layer",
    beforeFields: ["Manual CRM (Notion)", "Finance in spreadsheets", "Leads tracked in DMs", "No AI diagnostic engine", "Tax estimates per jurisdiction: manual", "Deliverable delivery: email attachments"],
    beforeBounce: "Cognitive Overhead: ~3h/day in coordination",
    afterTitle: "Command Center Operational",
    afterDomain: "signal-and-friction.com/admin",
    afterGain: "Operational Load Reduction: ~2.5h/day recovered",
  },
  learningModules: [
    {
      id: "m-1",
      title: "The 10-Minute Daily Protocol",
      description: "The exact sequence to run every morning before touching anything else. Keeps you in control of pipeline, cash, and clients in under 10 minutes.",
      completed: false,
      content: "1. Sidebar stats first — Active Leads, Net Worth, Pending. If Pending > 0, go to Priorities before Pipeline.\n\n2. Pipeline → ARR Tracker. One number, one progress bar. If it did not move since yesterday, something in the conversion queue is stalled.\n\n3. Cola de Conversión — sort by urgency. Hot leads (< 2h) get contacted today. Cold leads (> 24h) get deprioritized unless they are DFY.\n\n4. Scan guaranteed clients panel. Any red gate (✗) near a deadline goes immediately to Priorities.\n\n5. Finance → Resumen. Four cells: ARR, Liquid Buffer, Buffer/ARR%, Runway. If Runway < 6 months, that day's priority is closing a client — not content, not optimization.",
    },
    {
      id: "m-2",
      title: "Pipeline — States, Modal, and the Kanban",
      description: "How to move clients through the pipeline without skipping states, and what each transition actually triggers in the system.",
      completed: false,
      content: "The 5 pipeline states in order: prospecting → outreach_sent → diagnostic_in_progress → delivered → closed_completed. Each state unlocks a specific button in the client modal. Never skip states — the system is designed so each transition triggers the correct next action.\n\nThe client modal has two columns. Left: parameters, pipeline actions, AI Diagnostic Engine, guarantee protocol. Right: activity log, interaction history, project data.\n\nThe Lead Drawer (click any lead card) shows segment, estimated value, form answers, and website. The 'Copiar Borrador de Acción' button generates the correct outreach phrase for that segment and copies it to clipboard. Paste it directly into LinkedIn.\n\nKey rule: for any DFY lead with a website, run the AI Diagnostic Engine before first contact. You arrive to the conversation with data, not questions.",
    },
    {
      id: "m-3",
      title: "AI Diagnostic Engine — Correct Usage",
      description: "The Motor de Diagnóstico IA runs inside every client modal. This module covers how to maximize the quality of the output before hitting the button.",
      completed: false,
      content: "The engine builds its prompt from whatever is in the client modal at the moment you press the button. More context = higher confidence index.\n\nBefore pressing 'Generar diagnóstico': fill the Founder Psychology / Private Notes field with known constraints, objections, and market segment. Set the Cognitive Fatigue slider to the real level — a survival-mode founder at 75+ gets a simpler hypothesis than one at 30.\n\nThe result has 5 zones. Confidence Index (color-coded bar): green ≥ 65 is usable, amber ≥ 40 needs manual validation, red < 40 means add context and regenerate. Signal: copy this verbatim into your written diagnostic. Friction Mechanism: use as the form field type. Causal Hypothesis: the opening sentence of the deliverable, already in correct English tone. Decision A/B/C: present all three to the client — making them choose is part of the zero-call protocol.\n\nRule: never copy the output directly to the deliverable. Use it as the structural skeleton and add the specific client metrics that the engine does not have (exact PostHog numbers, industry context).",
    },
    {
      id: "m-4",
      title: "Finance Center — The 6 Sub-Views",
      description: "Which Finance sub-view to open and when. The Resumen view is the daily instrument. The others are weekly or monthly tools.",
      completed: false,
      content: "Resumen (daily): The ARR/Liquid Buffer widget is 4 cells — ARR (MRR × 12), Liquid Buffer (total cash assets), Buffer/ARR%, Runway with burn multiple. Below: Stripe dashboard with last 4 transactions in real time. If you see a Refunded entry, go to Pipeline immediately to check that client.\n\nContabilidad (monthly): Double-entry ledger. Balance sheet and P&L auto-calculate from transactions. Review at month close — no manual entry required.\n\nROI y Capitalización (before any purchase > $500): The Opportunity Cost comparison runs three scenarios — index fund vs hardware vs AI credits. Change the inputs and the answer is immediate. The Retirement Calculator shows projected net worth at any savings rate and time horizon.\n\nAsesor IA: Accepts any opportunity cost question. Best prompts include a specific number.\n\nOptimizador Fiscal: Update the consulting income slider to your real projected annual number. The 7-jurisdiction table recalculates instantly. Uruguay row shows 0% IRNR on foreign income under the 10-year fiscal holiday — this is your confirmed structure.",
    },
    {
      id: "m-5",
      title: "Priorities + Learning OS",
      description: "How to use the Priorities queue so you always work on the highest-revenue task first, and how the Learning OS compounds your diagnostic quality over time.",
      completed: false,
      content: "Priorities: at the start of each day, the queue shows tasks ranked by revenue impact. Execute the top task before opening LinkedIn, email, or any other tool. Rule: a DFY lead diagnostic always outranks a landing page update regardless of deadlines. Direct revenue > indirect revenue.\n\nLearning OS (AI Incidents): every time something goes wrong — a misdiagnosis, a client pushback, a failed automation — log it here with severity, root cause, and lesson. The 'Applied Improvement' field must be specific: not 'improve the diagnostic' but 'add company headcount question to Tally form to segment DFY vs DWY before first contact.'\n\nPrompt Versions: every prompt iteration is versioned here. If the Diagnostic Engine starts producing lower-quality output than a previous version, check this log first — something in the system prompt changed. You can identify the exact version and revert.\n\nWeekly cadence: Friday is the Learning OS day. Log every incident from the week and update any prompt that produced suboptimal results. This 20-minute weekly review compounds into measurably better diagnostics over 90 days.",
    },
    {
      id: "m-6",
      title: "Power Shortcuts — Features Most Users Miss",
      description: "Five non-obvious capabilities built into the Command Center that save 45+ minutes per client engagement when used correctly.",
      completed: false,
      content: "1. MCP Button in client modal: when you execute a pipeline action (send outreach, request testimonial), the MCP button copies the exact command to clipboard. That command goes directly into Claude in another window — it is the automation instruction for the next step, not a decorative label.\n\n2. Deliverable and SLA links in the diagnostic form: when you fill the delivery form, the system generates two live URLs instantly — /deliverable/[clientKey] and /sla/[clientKey]. Both are active with zero rebuild.\n\n3. Lead website link in the Drawer: if the lead left their website on the Tally form, it appears in the Drawer as a direct link. Open it, run /api/scan-url with their domain, and have their LCP, TBT, and abandonment delta ready before the first message.\n\n4. Cognitive Fatigue Slider is strategic data: a founder scoring > 70 needs a simpler pitch and fewer decision variables in the deliverable. One scoring < 30 can receive the full technical diagnostic.\n\n5. Fiscal Optimizer inputs are editable: the income slider accepts your real projected annual number. If you are evaluating a large contract that moves you from $30K to $60K annual revenue, update the slider and see how the 7-jurisdiction table shifts before you decide whether to accept it.",
    },
  ],
  checklist: [
    { id: "c-1", task: "Check sidebar stats: Active Leads, Net Worth, Pending", done: false, tip: "If Pending > 0, go to Priorities before Pipeline. Non-negotiable." },
    { id: "c-2", task: "Pipeline → ARR Tracker: did the number move since yesterday?", done: false, tip: "Flat ARR two days in a row = something is stalled in the conversion queue." },
    { id: "c-3", task: "Cola de Conversión: process hot leads first (< 2h urgency)", done: false, tip: "For DFY leads with a website, run AI Diagnostic Engine before first contact." },
    { id: "c-4", task: "Guaranteed clients: scan for red gates near deadline", done: false, tip: "Any red gate (✗) close to expiry goes to Priorities immediately." },
    { id: "c-5", task: "Finance → Resumen: check Runway metric", done: false, tip: "Runway < 6 months means today's priority is closing a client — not content or optimization." },
    { id: "c-6", task: "[Weekly — Friday] Log AI incidents in Learning OS", done: false, tip: "The Applied Improvement field must be specific and actionable. Vague lessons do not compound." },
    { id: "c-7", task: "[Weekly — Friday] Review and version any updated prompts", done: false, tip: "If diagnostic output quality dropped this week, check Prompt Versions before touching anything else." },
    { id: "c-8", task: "[Monthly] Close accounting in Finance → Contabilidad", done: false, tip: "Review P&G and Balance Sheet. Transactions sync automatically — no manual entry needed." },
    { id: "c-9", task: "[Quarterly] Update Fiscal Optimizer income slider to real YTD projection", done: false, tip: "Uruguay 0% IRNR on foreign income under 10-year holiday. Confirmed structure — verify annually." },
    { id: "c-10", task: "[Per client] Run AI Diagnostic Engine before first DFY outreach", done: false, tip: "Add Founder Psychology notes + set Cognitive Fatigue slider before pressing the button. Context drives confidence." },
  ],
  diagnosis: {
    signal: "The Command Center is fully operational across 5 functional modules — Pipeline, Finance, Priorities, Learning, and Certified — with a Vault-secured AI Diagnostic Engine running on claude-opus-4-8 at the Cloudflare edge. The system is designed for single-operator management from any device, zero calls required.",
    friction: {
      mechanism: "Operational Complexity",
      rootCause: "Managing a high-ticket consulting pipeline, real-time revenue tracking, AI-assisted diagnostics, and continuous learning across disconnected tools produces 3+ hours of coordination overhead per day. The Command Center eliminates this by unifying all operational layers into one authenticated interface.",
    },
    decisions: [
      {
        type: "A — Conservative",
        label: "Run the 10-minute daily protocol every morning",
        action: "Open Pipeline first. Check ARR Tracker, then Cola de Conversión, then guaranteed clients. Close in Finance with the Runway metric. Total: 10 minutes. Nothing else gets opened until this sequence completes.",
        reasoning: "The daily protocol is the minimum viable interaction with the system. It surfaces every critical signal — stalled leads, failing guarantee gates, cash runway risk — before they become emergencies.",
        tradeoff: "Requires discipline to run the sequence in order. Skipping Finance on a day when Stripe shows a refund means missing a client risk signal for 24 hours.",
      },
      {
        type: "B — Aggressive",
        label: "Use the AI Diagnostic Engine before every DFY outreach",
        action: "Before sending the first LinkedIn message to any DFY lead, open their modal, fill Private Notes with known context, set the Cognitive Fatigue slider, and press Generar diagnóstico. Use the Signal and Hypothesis fields as the opening lines of the outreach.",
        reasoning: "Arriving with specific data converts a cold outreach into a clinical observation. The conversion rate on data-led outreach is structurally higher than question-based outreach.",
        tradeoff: "Adds 5 minutes per outreach. Worth it only for DFY ($2,800) leads — the ROI on a 5-minute diagnostic before a $2,800 conversation is mathematically inarguable.",
      },
      {
        type: "C — Lateral",
        label: "Treat the Learning OS as the compound interest mechanism",
        action: "Every Friday, spend 20 minutes in the Learning tab. Log every incident from the week with a specific Applied Improvement. Review Prompt Versions. If the AI Diagnostic Engine produced a low-confidence result, trace why and update the system prompt context.",
        reasoning: "The diagnostic quality of the AI engine compounds with each prompt iteration. A practitioner who reviews and updates weekly produces measurably better hypotheses at week 12 than at week 1.",
        tradeoff: "The compounding effect is invisible in the first 30 days. It becomes measurable between days 60 and 90. Requires patience to trust the process before the signal is visible.",
      },
    ],
  },
};

export const ACME_FALLBACK: DeliverableData = {
  clientKey: "acme-corp",
  clientName: "Acme Corp",
  date: "June 19, 2026",
  consultant: "Signal & Friction",
  loomUrl: "https://www.loom.com/embed/placeholder",
  segment: "microdosing",
  currentPhase: "diagnostic",
  progressPercent: 25,
  founderFocusScore: 85,
  daysRemaining: 23,
  guaranteeStatus: "20% Growth Guarantee Active",
  telemetryStatus: "✓ Traffic & Baseline Confirmed",
  beforeAfter: {
    beforeTitle: "Verify Billing & Setup Server",
    beforeIssue: "Cognitive Load — 6 decision variables before dashboard access",
    beforeFields: ["Phone Number", "Company Size", "Industry Type", "CRM Version", "AWS Region", "Billing Email"],
    beforeBounce: "Bounce Probability: ~88%",
    afterTitle: "Access Your Workspace",
    afterDomain: "acme.signal-and-friction.app",
    afterGain: "Calculated Conversion Gain: +350%",
  },
  learningModules: [
    {
      id: "m-1",
      title: "Module 1: Funnel Diagnostics Briefing",
      description: "Understand the isolated cognitive load friction bottleneck on your pricing selector page.",
      completed: true,
      content: "Identify plan options complexity (Hick's Law). The current interface exposes 4 complex plans with 12+ features, stalling conversion."
    },
    {
      id: "m-2",
      title: "Module 2: Progressive Interaction Design",
      description: "Replace the static grid with a usage-based cost calculator to defer pricing anxiety.",
      completed: false,
      content: "Build a single slider representing scale. Show value clearly before requesting financial commitment."
    },
    {
      id: "m-3",
      title: "Module 3: PostHog Conversion Telemetry",
      description: "Deploy targeted PostHog tracking events to monitor checkout drop-offs.",
      completed: false,
      content: "Track price_card_hover, pricing_slider_change, and paywall_trigger events to isolate future friction."
    },
    {
      id: "m-4",
      title: "Module 4: Autonomy Checklist",
      description: "Formulate your team's routine checklists to ensure conversion optimization ownership.",
      completed: false,
      content: "Establish weekly telemetry scans, bi-weekly copy iterations, and monthly speed audit checks."
    }
  ],
  checklist: [
    { id: "c-1", task: "Isolate plans on pricing page from 4 down to 2 visible cards", done: true, tip: "Put the Enterprise plan behind a contact sales trigger." },
    { id: "c-2", task: "Simplify bullet points: display maximum of 5 comparison items", done: false, tip: "Hide secondary features under a collapsible section." },
    { id: "c-3", task: "Implement a usage slider calculator in local branch", done: false, tip: "Default the slider to the most profitable average user tier." },
    { id: "c-4", task: "Deploy PostHog tracking snippet on billing checkout button", done: false, tip: "Send custom events containing selected plan parameters." }
  ],
  diagnosis: {
    signal:
      "85% of high-intent trial signups land on the pricing selector page. Only 12% proceed to billing checkout. Drop-off is localized at the pricing tier selection step, where users spend an average of 3.8 minutes before bouncing, indicating extreme choice anxiety rather than price rejection.",
    friction: {
      mechanism: "Cognitive Load",
      rootCause:
        "The pricing interface exposes 4 complex plans with 12+ feature bullet points each. Users must mathematically model their own server usage before selecting a plan. The cognitive overhead required to guess the correct tier exceeds their current motivation.",
    },
    decisions: [
      {
        type: "A — Conservative",
        label: "Collapse pricing options from 4 to 2 visible tiers",
        action:
          "Redesign the selector to display only 'Starter' and 'Growth' plans. Gate 'Enterprise' behind a clear, high-contrast contact sales trigger.",
        reasoning:
          "Reducing options immediately reduces decision latency. Hick's Law mathematically predicts that minimizing active variables prevents choice paralysis.",
        tradeoff:
          "Power buyers might feel the self-serve options are constrained. Mitigate by adding a subtle progressive comparison toggle.",
      },
      {
        type: "B — Aggressive",
        label: "Replace static tiers with a single usage calculator",
        action:
          "Eliminate grid cards entirely. Build a clean, single-slider calculator where the founder inputs their user count and the system outputs one number.",
        reasoning:
          "Removes 100% of the cognitive estimation burden. Instantly converts value uncertainty into cost certainty in under 5 seconds.",
        tradeoff:
          "Requires custom engineering effort. Slide pricing must be meticulously modeled to prevent contract size drop-offs.",
      },
      {
        type: "C — Lateral",
        label: "Defer monetization — start with a zero-barrier free trial",
        action:
          "Remove pricing from the onboarding loop entirely. Let users experience the dashboard first. Prompt upgrade options on day 7 once utility is verified.",
        reasoning:
          "Corrects the Ordering Error. Demanding credit card details or financial commitments before demonstrating core utility violates PLG activation logic.",
        tradeoff:
          "Slightly delays short-term subscription revenue, but trial-to-paid conversion rates typically scale by up to 25%.",
      },
    ],
  },
};
