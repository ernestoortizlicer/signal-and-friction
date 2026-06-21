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
