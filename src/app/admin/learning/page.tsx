"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAuthHeaders } from "@/lib/supabase";

interface Draft {
  id: string;
  article_slug: string;
  draft_number: number;
  content: string;
  rating?: number;
  feedback?: string;
  selected_arguments?: string[];
}

interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string;
  body: string;
  read_time_mins: number;
}

const DOMAINS = [
  { name: "Behavioral Economics", score: 85, color: "#D4A853" },
  { name: "Conversion Architecture", score: 90, color: "#5C9A6B" },
  { name: "Copywriting Psychology", score: 75, color: "#3B82F6" },
  { name: "Technical Systems", score: 80, color: "#A855F7" },
  { name: "Pricing Logic", score: 95, color: "#F59E0B" },
  { name: "Tax & Compliance", score: 70, color: "#C85C5C" },
];

interface CaseStudy {
  id: string;
  title: string;
  metrics: string;
  context: string;
  frictionOptions: string[];
  concepts: Array<{ title: string; description: string }>;
  quizQuestion: string;
  quizAnswers: string[];
  quizExplanation: string;
}

const CASE_STUDIES: CaseStudy[] = [
  {
    id: "tiktok",
    title: "TikTok India Localized Onboarding Collapse",
    metrics: "Conversion from install to signup plummeted by 45%. Average time spent on registration form: 4.8 minutes before exit.",
    context: "Users operate on 3G bandwidth under budget Android devices. Signup flow utilizes localized SMS OTP verification codes.",
    frictionOptions: [
      "Technical: Low-bandwidth payload weight",
      "Cognitive: SMS OTP sequence load",
      "Trust Deficit: Localization linguistic translation disconnect"
    ],
    concepts: [
      { title: "Concept 1: Low-Bandwidth Latency Tolerance (Technical Systems)", description: "India's 3G network environments have a high packet loss rate. The heavy initialization package loaded on startup caused app crashes." },
      { title: "Concept 2: SMS OTP Verification Barriers (Behavioral Science)", description: "SMS gateway delays caused users to re-request codes. The Fogg Behavioral Model predicts that high-effort (waiting/switching screens) combined with low motivation (during onboarding) crashes activation." },
      { title: "Concept 3: Localized Trust Sub-Cultures (Linguistic Architecture)", description: "Literal translations of signup directives felt automated and low-status. True localization requires regional sub-culture phrasing to mitigate registration anxiety." }
    ],
    quizQuestion: "SaaS metrics show a 9.2% pricing tier selection rate, but only 0.4% billing confirmation. Users stay on the card details page for 2.2 minutes. Isolate friction mechanism.",
    quizAnswers: [
      "Cognitive Load: Pricing options are too complex",
      "Trust Deficit: Paywall lacks clear SSL / validation parameters",
      "Sequence Order: Billing step occurs before product activation"
    ],
    quizExplanation: "Trust Deficit is isolated. Users spend 2.2 minutes on the CC input field itself, which implies they want to pay but lack security trust. It is a Trust Deficit."
  },
  {
    id: "figma",
    title: "Figma Enterprise Paywall Anxiety",
    metrics: "Enterprise users navigate to payment page but exit within 15 seconds. High click-through on upgrade trigger, but zero purchases.",
    context: "Self-serve team admins trying to upgrade 10+ designer seats. Stripe billing fields request corporate taxation identification keys.",
    frictionOptions: [
      "Cognitive: Massive multi-step inputs field density",
      "Trust Deficit: Unclear corporate data isolation parameters",
      "Value Deficit: Unclear seats pricing increments mapping"
    ],
    concepts: [
      { title: "Concept 1: B2B Tax Deferred Checkout (Pricing Logic)", description: "Forcing VAT/EIN data mid-checkout for high-ticket B2B SaaS increases form abandonment by 40%. Post-purchase billing setup converts 22% better." },
      { title: "Concept 2: Seat Pricing Anxiety (Behavioral Economics)", description: "Ambiguous per-seat cost scaling forces buyers to compute risk in real-time. Interactive invoice simulators reduce seat pricing abandonment by 35%." }
    ],
    quizQuestion: "A developer tool shows 78% of enterprise users reach the pricing page but only 2.1% convert. Average session time on pricing: 8 minutes. What is the primary friction?",
    quizAnswers: [
      "Trust Deficit: Concerns over source code isolation privacy",
      "Value Deficit: Zero immediate benefits for opting in",
      "Cognitive: Too many button triggers on screen"
    ],
    quizExplanation: "Trust Deficit is isolated. Users spend 8 minutes (researching, not deciding) which signals they want the product but fear institutional security risk — a Trust Deficit."
  },
  {
    id: "vercel",
    title: "Vercel Telemetry Opt-In Collapse",
    metrics: "Developer telemetry opt-in drops 60% after GDPR banner update. Product telemetry essential for speed improvements.",
    context: "Technical developers reject opt-in popups. Adding speed dashboard renders 10% faster with telemetry increases opt-in by 35%.",
    frictionOptions: [
      "Trust Deficit: Concerns over source code isolation privacy",
      "Value Deficit: Zero immediate benefits for opting in",
      "Cognitive: Too many button triggers on screen"
    ],
    concepts: [
      { title: "Concept 1: Value Deficit Offset (Behavioral Economics)", description: "Asking for data telemetry without offering a speed upgrade or discount violates reciprocal economics. Users demand a value offset." },
      { title: "Concept 2: Privacy Isolation Transparency (Trust Deficit)", description: "Assuring users that all telemetry tokens are hashed and zero code repositories are indexed removes security anxieties." }
    ],
    quizQuestion: "Developers reject opt-in popups. Adding 'Speed dashboard renders 10% faster with telemetry cached' increases opt-in by 35%. Why?",
    quizAnswers: [
      "Trust Deficit is solved",
      "Reciprocal Value Offset is established",
      "Cognitive load is reduced"
    ],
    quizExplanation: "Reciprocal Value Offset. The user receives a direct performance benefit in exchange for consenting to share usage data."
  },
  {
    id: "churn_loop",
    title: "SaaS Churn Loop: The Silent Revenue Drain",
    metrics: "Monthly churn rate climbs from 2.1% to 6.8% in 90 days post-launch. Revenue churned: $340K ARR. No spike in support tickets — churn happens silently.",
    context: "B2B workflow SaaS. Users activate, complete onboarding, then disappear by day 21. No cancellation reasons collected. NPS surveys unsent.",
    frictionOptions: [
      "Value Deficit: Users never reach the 'aha moment'",
      "Cognitive: Feature complexity overwhelms solo operators",
      "Signal Failure: No behavioral telemetry to detect at-risk users"
    ],
    concepts: [
      { title: "Concept 1: Time-to-Value Compression (Behavioral Science)", description: "The 'aha moment' must occur within the first session. If users don't experience core value in under 7 minutes, churn probability increases by 60%. Onboarding flows must be ruthlessly compressed to the primary use case." },
      { title: "Concept 2: Silent Churn Detection via Behavioral Signals (Data Science)", description: "Users who churn silently show predictable patterns: login frequency drops below 2x/week in week 2, feature breadth narrows to 1–2 actions, and last-session duration shrinks. Real-time behavioral scoring flags these users before they cancel." },
      { title: "Concept 3: Proactive Intervention Sequences (CRM Science)", description: "Automated retention sequences triggered by behavioral signals — not time — intercept churn. A personalized outreach at day 14 (when login frequency drops) converts 22% of at-risk users to champions." }
    ],
    quizQuestion: "A PLG SaaS shows 78% week-1 retention but 31% week-4 retention. Support tickets are flat. Users complete onboarding but stop logging in by day 18. Isolate the primary friction.",
    quizAnswers: [
      "Value Deficit: Users never discovered the core use case that justifies continued use",
      "Cognitive Load: Too many features overwhelm daily operators",
      "Trust Deficit: Users distrust automated notifications"
    ],
    quizExplanation: "Value Deficit. Completed onboarding but low engagement by day 18 is the classic sign of surface-level activation without value internalization. The product solved a pain once, not habitually."
  },
  {
    id: "async_close",
    title: "Async B2B Close: The No-Call Pipeline",
    metrics: "Pipeline of 14 qualified leads stalls for 6 weeks. Discovery calls scheduled, 60% no-show. Deals go cold after 2 follow-up emails. Zero closed.",
    context: "High-ticket B2B consulting offer ($2,000–$5,000). Founder-led sales. Prospects are senior operators (CMOs, founders) with zero calendar availability.",
    frictionOptions: [
      "Trust Deficit: Lack of social proof and outcome specificity",
      "Cognitive: Multi-step friction before experiencing value",
      "Sequence Friction: Discovery call creates calendar barrier for busy executives"
    ],
    concepts: [
      { title: "Concept 1: Value-Before-Call Architecture (Async Sales Design)", description: "Senior operators do not schedule calls to evaluate — they schedule calls to confirm. Sending a personalized 3-minute Loom video diagnostic before any calendar link increases call show rates by 65% and eliminates 80% of unqualified leads." },
      { title: "Concept 2: Evidence-First Positioning (Trust Science)", description: "The Signal & Friction Zero-Call model front-loads specificity: a named friction point, a quantified outcome projection, and a comparison to a named comparable client. This collapses the trust timeline from weeks to hours." },
      { title: "Concept 3: Async Deliverable as Sales Tool (Conversion Architecture)", description: "A public-facing async deliverable — a 1-page teardown of the prospect's specific funnel — serves simultaneously as a trust signal, a capability demonstration, and a natural call to action with zero cognitive friction." }
    ],
    quizQuestion: "A high-ticket consultant sends 12 cold LinkedIn messages. 9 respond. 6 agree to a discovery call. 4 ghost before the call. 0 close. What is the primary friction mechanism?",
    quizAnswers: [
      "Sequence Friction: The call creates a calendar commitment before trust is established",
      "Value Deficit: The offer is not compelling enough",
      "Trust Deficit: The consultant lacks credibility"
    ],
    quizExplanation: "Sequence Friction. The calendar commitment comes before the prospect has experienced any value. Inserting an async value artifact (Loom teardown, 1-page diagnostic) before the call request removes the barrier and front-loads proof."
  },
  {
    id: "saas_asia",
    title: "$50M SaaS Asian Expansion Collapse",
    metrics: "Conversion drops by 60% on Singapore/Japan local checkouts. User dropoff occurs at pricing plan confirmation (4.2 minutes average latency).",
    context: "US-based CRM platform. They localized languages but payments are settled in USD with standard US credit card validation structures.",
    frictionOptions: [
      "Technical: Payment gateway latency (US routing)",
      "Cognitive: Foreign Exchange (FX) billing discrepancy",
      "Trust Deficit: Lack of local payment trust symbols (PayNow / JCB)"
    ],
    concepts: [
      { title: "Concept 1: Cross-Border Card Settlement Latency", description: "Routing local credit card processing through US gateways leads to a 15% transaction decline rate. Local acquirer routing solves this." },
      { title: "Concept 2: Local Payment Trust Gaps (Trust Deficit)", description: "In Singapore, PayNow holds a 65% market share. Rushing to enter SE Asia without integrating local payment paradigms increases abandonment by 40%." },
      { title: "Concept 3: Foreign Exchange Transparency (Cognitive)", description: "Showing USD pricing instead of localized SGD/JPY currencies forces users to compute exchange rates manually, leading to checkout fatigue." }
    ],
    quizQuestion: "CRM platform expands to Japan. Checkout conversion drops 40%. They only accept Visa/Mastercard in USD, ignoring JCB and Yen pricing. Identify primary friction.",
    quizAnswers: [
      "Value Deficit: Japanese users don't see CRM value",
      "Trust & Cognitive: Lack of local Yen pricing and JCB payment channels",
      "Technical: Slow page loads from US servers"
    ],
    quizExplanation: "Trust & Cognitive. Japanese B2B users require local payment options (JCB) and absolute pricing clarity (JPY) to authorize corporate spending."
  }
];

const CHALLENGE_ELEVATIONS: Record<string, {
  gaps: Array<{ label: string; current: number; target: number; colorClass: string; barColor: string }>;
  studyPlan: Array<{ step: string; title: string; desc: string }>;
  articles: Array<{ num: number; category: string; categoryColor: string; title: string; summary: string; body: string }>;
}> = {
  tiktok: {
    gaps: [
      { label: "Cognitive Load Gap", current: 40, target: 85, colorClass: "text-[#C85C5C]", barColor: "from-[#C85C5C] to-[#D4A853]" },
      { label: "Behavioral Science Gap", current: 45, target: 90, colorClass: "text-[#D4A853]", barColor: "from-[#B8900A] to-[#D4A853]" }
    ],
    studyPlan: [
      { step: "01", title: "Mobile Payload Weight Reduction", desc: "Bundle split and lazy load heavy assets to ensure the initial JS chunk is under 150KB for poor 3G connections." },
      { step: "02", title: "SMS Gateway Delay Mitigations", desc: "Optimize SMS provider routing and integrate a 60-second countdown before re-requests, matching Fogg's effort reduction protocols." },
      { step: "03", title: "Linguistic Trust Alignment", desc: "Rewrite onboarding instructions using common Hindi/regional colloquialisms rather than cold, machine-translated English." }
    ],
    articles: [
      { num: 1, category: "Cognitive Load", categoryColor: "text-[#C85C5C]", title: "Mobile Form Friction & Fogg Behavioral Optimization", summary: "Reducing task effort in onboarding pages for high-friction mobile environments.", body: "When operating in mobile environments with high latency (e.g., 3G network), any minor task increase (like switching screens or waiting for SMS codes) causes user drop-off. By optimizing form fields, reducing input requirements, and designing simple inline instructions, SaaS platforms can increase their mobile signup completion rates by up to 45%." },
      { num: 2, category: "Behavior", categoryColor: "text-[#D4A853]", title: "SMS Gateway Resilience Protocols in Developing Markets", summary: "Handling delayed OTP verification codes using local transactional SMS routes.", body: "Delayed OTP codes lead to users clicking 'Resend' repeatedly, compounding gateway queues. Implementing smart client-side countdowns and choosing top-tier regional SMS aggregators (e.g., Twilio local routes) prevents activation failure." },
      { num: 3, category: "Trust", categoryColor: "text-[#D4A853]", title: "Linguistic Trust Signals & Hyper-Localized Copywriting", summary: "How translation nuances impact perceived security and status in localized apps.", body: "Literal translations lack local authority and breed trust deficits. Collaborating with local copywriters to use regional idioms for critical trust-building actions (like billing permissions) dramatically improves conversion." }
    ]
  },
  figma: {
    gaps: [
      { label: "Cognitive Load Gap", current: 55, target: 90, colorClass: "text-[#D4A853]", barColor: "from-[#B8900A] to-[#D4A853]" },
      { label: "Pricing Logic Gap", current: 60, target: 95, colorClass: "text-[#5C9A6B]", barColor: "from-[#5C9A6B] to-[#D4A853]" }
    ],
    studyPlan: [
      { step: "01", title: "Deferred Tax Ingestion Flow", desc: "Allow team admins to pay first, and ingest VAT/corporate tax identifiers post-purchase inside the billing portal." },
      { step: "02", title: "Interactive Invoice Expansion Simulator", desc: "Build an inline interactive slider showing the precise monthly cost per designer seat change before clicking 'Upgrade'." },
      { step: "03", title: "B2B Payment Form Simplification", desc: "Remove unnecessary Billing Address input fields, relying on Stripe's smart postal-code-only verification where possible." }
    ],
    articles: [
      { num: 1, category: "Cognitive Load", categoryColor: "text-[#D4A853]", title: "B2B Checkout Optimization & Deferring Tax Friction", summary: "Why demanding corporate tax ID numbers during checkout increases cart abandonment.", body: "Demanding VAT/EIN registration numbers mid-checkout forces corporate buyers to search internal documents, increasing checkout time and exit rates. Moving tax profile verification to the post-purchase setup increases immediate conversion by 22%." },
      { num: 2, category: "Pricing", categoryColor: "text-[#5C9A6B]", title: "Seat-Based Pricing Models & Invoice Simulator Widgets", summary: "Using interactive widgets to clear ambiguity in high-ticket SaaS pricing expansion.", body: "Pricing expansion anxiety occurs when corporate buyers fear hidden charges. Renders of clear, real-time calculations showing price changes per seat addition build confidence and lead to 30% larger average order sizes." },
      { num: 3, category: "Trust", categoryColor: "text-[#D4A853]", title: "Enterprise Trust Signals & Corporate Card Authorization Rates", summary: "Minimizing bank declines and authorization errors for high-value B2B transactions.", body: "High-value corporate card transactions face aggressive fraud checking. Using Stripe Radar, 3D Secure, and clear merchant category codes prevents false declines and provides an elegant fallback path." }
    ]
  },
  vercel: {
    gaps: [
      { label: "Value Deficit Gap", current: 30, target: 85, colorClass: "text-[#C85C5C]", barColor: "from-[#C85C5C] to-[#D4A853]" },
      { label: "Trust Deficit Gap", current: 50, target: 90, colorClass: "text-[#D4A853]", barColor: "from-[#B8900A] to-[#D4A853]" }
    ],
    studyPlan: [
      { step: "01", title: "Reciprocal Value Offset Design", desc: "Explicitly reward opting in to telemetry by unlocking a premium dashboard feature (e.g. 10% faster load caching)." },
      { step: "02", title: "Anonymized Hash Verification", desc: "Publish open source code detailing how client code is hashed locally, proving zero raw repositories are transmitted." },
      { step: "03", title: "Micro-Copy Consent Redesign", desc: "Change standard 'Allow tracking' to 'Accelerate UI rendering with cloud-cached analytics metrics'." }
    ],
    articles: [
      { num: 1, category: "Value Deficit", categoryColor: "text-[#C85C5C]", title: "Reciprocity Principle & Value Offsets in Opt-in Flows", summary: "Designing mutual-benefit exchanges to bypass user data privacy walls.", body: "Asking for user telemetry without an immediate reciprocal benefit leads to automatic opt-out. Offering clear advantages (such as performance upgrades or localized caching) increases consent rates by up to 35%." },
      { num: 2, category: "Trust Deficit", categoryColor: "text-[#D4A853]", title: "Privacy-First Analytics Telemetry & Data Sovereignty", summary: "Gaining technical developer trust through cryptographic transparency.", body: "Developers are highly suspicious of telemetry trackers. Demonstrating that all ingested data points are salted and hashed client-side, with full adherence to GDPR, removes corporate liability fears." },
      { num: 3, category: "Copywriting", categoryColor: "text-[#D4A853]", title: "Micro-Copy Teardown: Designing Frictionless Consent Elements", summary: "How micro-copy adjustments change user perception from 'spying' to 'optimizing'.", body: "Words matter. Shifting consent banner text from passive telemetry-oriented tracking jargon to active user-performance enhancements alters the cognitive frame from defense to cooperation." }
    ]
  },
  churn_loop: {
    gaps: [
      { label: "Retention Signal Gap", current: 25, target: 90, colorClass: "text-[#C85C5C]", barColor: "from-[#C85C5C] to-[#D4A853]" },
      { label: "Behavioral Telemetry Gap", current: 35, target: 88, colorClass: "text-[#D4A853]", barColor: "from-[#B8900A] to-[#D4A853]" }
    ],
    studyPlan: [
      { step: "01", title: "Time-to-Value Audit", desc: "Map every step from signup to first value event. Remove every step not directly required to reach the core 'aha moment'. Target: under 7 minutes." },
      { step: "02", title: "Behavioral Churn Scoring Model", desc: "Instrument login frequency, feature breadth, and session duration. Flag users with a churn score above 70 by day 10. Trigger automated intervention." },
      { step: "03", title: "Day-14 Retention Sequence Design", desc: "Build a 3-message behavioral sequence triggered by drop in engagement — not by calendar date. Personalize with the specific use case the user activated with." }
    ],
    articles: [
      { num: 1, category: "Retention", categoryColor: "text-[#C85C5C]", title: "The Churn Signal Stack: Detecting Silent Exit Before It Happens", summary: "Using behavioral telemetry to intercept at-risk users before they cancel.", body: "Silent churn occurs when users stop logging in without cancelling — a signal failure, not a product failure. By tracking login frequency, feature engagement breadth, and session duration as a composite churn score, SaaS operators can identify at-risk users by day 10 — 11 days before the typical silent exit at day 21." },
      { num: 2, category: "Onboarding", categoryColor: "text-[#D4A853]", title: "Time-to-Value: The 7-Minute Activation Rule", summary: "Why every minute past 7 in onboarding reduces 30-day retention by measurable degrees.", body: "The 7-minute rule emerges from activation data across 200+ SaaS products: users who experience the primary value event (the 'aha moment') within the first session retain at 4.2x the rate of those who don't. Ruthless onboarding compression — removing educational detours and feature showcases — is the single highest-leverage retention lever." },
      { num: 3, category: "CRM", categoryColor: "text-[#5C9A6B]", title: "Proactive Retention: Behavioral Triggers vs. Calendar Sequences", summary: "Why time-based email sequences fail and behavioral triggers convert.", body: "Standard 'day 7, day 14, day 30' retention emails ignore individual behavioral signals and produce 2–4% re-engagement rates. Behavioral trigger sequences — fired when login frequency drops below threshold — produce 18–24% re-engagement because they reach users at the exact moment of disengagement, with personalized context." }
    ]
  },
  async_close: {
    gaps: [
      { label: "Async Sales Design Gap", current: 20, target: 92, colorClass: "text-[#C85C5C]", barColor: "from-[#C85C5C] to-[#D4A853]" },
      { label: "Evidence Architecture Gap", current: 30, target: 88, colorClass: "text-[#D4A853]", barColor: "from-[#B8900A] to-[#D4A853]" }
    ],
    studyPlan: [
      { step: "01", title: "Value-Before-Call Artifact Design", desc: "Build a 3-minute Loom video template for each ICP segment. The Loom must contain: one named friction point, one quantified projection, and one comparable client outcome. Send before any calendar link." },
      { step: "02", title: "Async Deliverable as Sales Tool", desc: "Convert the standard proposal deck into a 1-page public-facing teardown. The teardown is the sales tool — it demonstrates capability before a call is ever scheduled." },
      { step: "03", title: "Zero-Call Close Protocol", desc: "Design a proposal that closes without a call: Problem → Signal Evidence → Quantified Projection → Investment → One clear CTA (payment link). Eliminate all decision friction." }
    ],
    articles: [
      { num: 1, category: "Async Sales", categoryColor: "text-[#C85C5C]", title: "The Loom Diagnostic: How to Close Before the Discovery Call", summary: "Using personalized video teardowns to front-load trust and eliminate no-shows.", body: "Senior operators — CMOs, founders, VPs — do not schedule calls to evaluate. They schedule calls to confirm a decision they've already made. The Loom diagnostic inverts the sequence: you demonstrate specific insight about their exact problem before requesting calendar time. Show rate increases by 65%. Close rate increases by 40%. Unqualified leads self-select out." },
      { num: 2, category: "Pipeline", categoryColor: "text-[#D4A853]", title: "Sequence Friction in High-Ticket B2B Sales", summary: "Why calendar-first pipelines kill warm leads and how to fix the sequence.", body: "Every step added before a prospect experiences value is a compounding drop-off point. The standard sequence (cold outreach → calendar link → discovery call → proposal → close) has 5 friction gates. The Signal & Friction zero-call protocol collapses this to 3: outreach → async artifact → close. Response-to-close time drops from 6 weeks to 8 days." },
      { num: 3, category: "Positioning", categoryColor: "text-[#5C9A6B]", title: "Evidence-First Positioning: The Specificity Advantage", summary: "How named client outcomes and quantified projections collapse the trust timeline.", body: "Generic positioning ('I help companies grow') forces prospects to do mental work to connect your service to their problem. Evidence-first positioning does that work for them: 'I identified the checkout sequence friction that was losing Formbricks 23% of enterprise trials, and rebuilt the flow. They recovered $18K MRR in 6 weeks.' Specificity collapses the trust timeline from weeks to hours." }
    ]
  },
  saas_asia: {
    gaps: [
      { label: "Tax & Compliance Gap", current: 50, target: 95, colorClass: "text-[#C85C5C]", barColor: "from-[#C85C5C] to-[#D4A853]" },
      { label: "Technical Systems Gap", current: 40, target: 90, colorClass: "text-[#D4A853]", barColor: "from-[#B8900A] to-[#D4A853]" }
    ],
    studyPlan: [
      { step: "01", title: "Sovereign Acquirer Routing Setup", desc: "Establish local acquiring rails in Singapore (e.g., DBS/UOB card processors) to bypass international settlement delays and 15%+ decline rates." },
      { step: "02", title: "Linguistic and Currency Localization Audit", desc: "Ensure pricing plans resolve immediately in native currency (SGD or JPY) with local tax rates (GST) automatically factored in or deferred post-checkout." },
      { step: "03", title: "Local Wallet & Bank Transfer Integration", desc: "Configure PayNow (Singapore) and JCB (Japan) endpoints. Verify automatic webhook-based provisioning to capture the 60%+ non-card buyer share." }
    ],
    articles: [
      { num: 1, category: "Tax", categoryColor: "text-[#C85C5C]", title: "Tax-Free Reinvestment & PASS-Through LLCs in SE Asia", summary: "Structuring holding companies under Singapore FSI-S and Section 13(1)(a) tax exemption frameworks for reinvesting SaaS profits.", body: "By establishing a Singapore Private Limited (Pte. Ltd.) holding structure, founders access a single-tier territorial tax system. Under Section 13(1)(a) of the Income Tax Act, foreign-sourced service income received in Singapore is fully tax-exempt if the source country corporate tax rate is at least 15%." },
      { num: 2, category: "Law", categoryColor: "text-[#D4A853]", title: "SaaS Compliance Protocols under SG MAS Guidelines", summary: "Mastering technology risk management (TRM) and outsourcing directives defined by the Monetary Authority of Singapore.", body: "SaaS architectures operating in Singapore that serve fintechs, financial consultancies, or handle high-frequency payment rails fall within the advisory scope of the Monetary Authority of Singapore (MAS) Guidelines on Outsourcing and Technology Risk Management (TRM)." },
      { num: 3, category: "Checkout", categoryColor: "text-[#D4A853]", title: "Cross-Border Payment Friction: Optimizing Local Checkout Rates", summary: "Resolving regional gateway latency, currency mismatches, and credit card decline codes by using local acquiring endpoints.", body: "Cross-border credit card settlement is one of the most common causes of silent conversion leakage. Routing transactions through local merchant acquiring banks (e.g. DBS/UOB in Singapore, Sumitomo Mitsui in Japan) achieves a 98%+ authorization rate." }
    ]
  }
};

function parseInlineMd(text: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIdx = 0;
  let match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) result.push(<span key={key++}>{text.slice(lastIdx, match.index)}</span>);
    if (match[0].startsWith("**")) {
      result.push(<strong key={key++} className="text-[#F5F0EB] font-semibold">{match[2]}</strong>);
    } else {
      result.push(<em key={key++} className="text-[#D4A853] not-italic">{match[3]}</em>);
    }
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) result.push(<span key={key++}>{text.slice(lastIdx)}</span>);
  return result;
}

function InlineMarkdown({ text, className }: { text: string; className?: string }) {
  const lines = text.split("\n");
  return (
    <span className={className}>
      {lines.map((line, li) => {
        const hMatch = line.match(/^#{1,3}\s+(.+)/);
        if (hMatch) {
          return <span key={li} className="block text-[#F5F0EB] font-bold text-xs uppercase tracking-wider mt-1.5">{hMatch[1]}</span>;
        }
        return <span key={li} className="block">{parseInlineMd(line)}</span>;
      })}
    </span>
  );
}

export default function LearningDashboard() {
  const [activeTab, setActiveTab] = useState<'socratic' | 'hyper_leap'>('hyper_leap');
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticleSlug, setSelectedArticleSlug] = useState<string>("socratic-funnel-diagnostics");
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const [selectedDraftId, setSelectedDraftId] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>({});

  const [selectedChallengeId, setSelectedChallengeId] = useState<string>("tiktok");
  const [hlActive, setHlActive] = useState(false);
  const [hlInput, setHlInput] = useState("");
  const [hlSelectedOptions, setHlSelectedOptions] = useState<number[]>([]);
  const [radarDomains, setRadarDomains] = useState(DOMAINS);
  const [expandedArticle, setExpandedArticle] = useState<number | null>(null);
  const [conceptsMastered, setConceptsMastered] = useState(14);

  // Cognitive Telemetry
  const [typingStartedAt, setTypingStartedAt] = useState<number | null>(null);
  const [diagnosticVelocity, setDiagnosticVelocity] = useState<number | null>(null);
  const [coverageScore, setCoverageScore] = useState<number | null>(null);
  const [sessionElapsed, setSessionElapsed] = useState<number | null>(null);

  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tsaarsuuclvkjsgjcmoj.supabase.co";

  useEffect(() => {
    async function fetchData() {
      try {
        const headers = getAuthHeaders();
        const [resArticles, resDrafts] = await Promise.all([
          fetch(`${supabaseUrl}/rest/v1/education_content?select=*`, { headers }),
          fetch(`${supabaseUrl}/rest/v1/education_drafts?select=*`, { headers }),
        ]);
        const dataArticles = resArticles.ok ? await resArticles.json() : [];
        const dataDrafts = resDrafts.ok ? await resDrafts.json() : [];
        setArticles(dataArticles);
        setDrafts(dataDrafts);
        const initialRatings: Record<string, number> = {};
        dataDrafts.forEach((d: Draft) => { if (d.rating) initialRatings[d.id] = d.rating; });
        setRatings(initialRatings);
        if (dataArticles.length > 0 && !selectedArticleSlug) setSelectedArticleSlug(dataArticles[0].slug);
      } catch (err) {
        console.error("Error loading learning data", err);
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedArticleSlug]);

  const activeArticle = articles.find(a => a.slug === selectedArticleSlug) || articles[0];
  const activeDrafts = drafts.filter(d => d.article_slug === selectedArticleSlug);
  const activeChallenge = CASE_STUDIES.find(c => c.id === selectedChallengeId) || CASE_STUDIES[0];

  const handleSelectDraft = (draftNumber: number) => setSelectedDraftId(draftNumber);

  const handleRating = async (draftId: string, rating: number) => {
    setRatings(prev => ({ ...prev, [draftId]: rating }));
    try {
      const headers = getAuthHeaders();
      await fetch(`${supabaseUrl}/rest/v1/education_drafts?id=eq.${draftId}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ rating })
      });
    } catch (err) { console.error("Error saving draft rating:", err); }
  };

  const submitSocraticPreference = async () => {
    if (!selectedDraftId) return;
    const targetDraft = activeDrafts.find(d => d.draft_number === selectedDraftId);
    if (!targetDraft) return;
    try {
      const headers = getAuthHeaders();
      await fetch(`${supabaseUrl}/rest/v1/education_drafts?id=eq.${targetDraft.id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedbackText })
      });
      alert(`✓ Selection Confirmed: Draft ${selectedDraftId} weights reinforced.`);
      setFeedbackText("");
      setSelectedDraftId(null);
    } catch (err) { console.error("Error saving draft feedback:", err); }
  };

  const checkQuiz = (answerIdx: number) => {
    setSelectedAnswer(answerIdx);
    setQuizScore(answerIdx === 1 ? 100 : 0);
  };

  const resetChallenge = () => {
    setHlActive(false);
    setHlInput("");
    setHlSelectedOptions([]);
    setExpandedArticle(null);
    setTypingStartedAt(null);
    setDiagnosticVelocity(null);
    setCoverageScore(null);
    setSessionElapsed(null);
  };

  // Radar math
  const radarW = 240;
  const radarH = 240;
  const cx = radarW / 2;
  const cy = radarH / 2;
  const r = 76;

  const getCoords = (index: number, score: number) => {
    const angle = (index * 2 * Math.PI) / radarDomains.length - Math.PI / 2;
    const val = score / 100;
    return { x: cx + r * val * Math.cos(angle), y: cy + r * val * Math.sin(angle) };
  };

  const getWebCoords = (index: number, level: number) => {
    const angle = (index * 2 * Math.PI) / radarDomains.length - Math.PI / 2;
    const val = level / 4;
    return { x: cx + r * val * Math.cos(angle), y: cy + r * val * Math.sin(angle) };
  };

  const scorePoints = radarDomains.map((d, i) => {
    const c = getCoords(i, d.score);
    return `${c.x},${c.y}`;
  }).join(" ");

  const elev = CHALLENGE_ELEVATIONS[activeChallenge.id] || CHALLENGE_ELEVATIONS.saas_asia;

  return (
    <div className="min-h-screen bg-[#0A0908] text-[#F5F0EB] p-4 md:p-6 space-y-5 font-mono relative overflow-x-hidden">

      {/* Background grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(212,168,83,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,83,0.02) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-3 border-b border-[#D4A853]/15 pb-4 relative z-10">
        <div>
          <span className="font-mono text-xs text-[#D4A853]/70 tracking-[0.4em] uppercase block">
            Eminence System
          </span>
          <h1 className="text-2xl font-bold tracking-tight">
            Combat <span className="text-[#D4A853]">Learning Lab</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs text-[#5C9A6B] border border-[#5C9A6B]/25 px-3 py-1 rounded-full bg-[#5C9A6B]/5">
            {conceptsMastered} {"Concepts Mastered"}
          </span>
          <span className="font-mono text-xs text-[#D4A853] border border-[#D4A853]/25 px-3 py-1 rounded-full bg-[#D4A853]/5">
            {"IP Factory Active"}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#D4A853]/10 gap-6 relative z-10">
        {([
          { key: 'hyper_leap', label: 'Combat Mode' },
          { key: 'socratic',   label: 'IP Lab' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 font-mono text-xs uppercase tracking-widest border-b-2 transition-all duration-300 cursor-pointer whitespace-nowrap ${
              activeTab === tab.key
                ? "border-[#D4A853] text-[#D4A853]"
                : "border-transparent text-[#7A6F65] hover:text-[#B0A89E]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── COMBAT MODE (Hyper-Leap) ─────────────────────────────── */}
        {activeTab === 'hyper_leap' && (
          <motion.div
            key="combat"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-1 xl:grid-cols-12 gap-5 relative z-10"
          >
            {/* LEFT: Challenge engine */}
            <div className="xl:col-span-8 space-y-4">

              {/* Scenario Selector */}
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-5 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs text-[#D4A853]/70 tracking-widest uppercase">
                    {"01 — Scenario Selection"}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#C85C5C] border border-[#C85C5C]/20 px-2 py-0.5 rounded-full bg-[#C85C5C]/5">
                    {"Divergent Mode"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {CASE_STUDIES.map(cs => (
                    <button
                      key={cs.id}
                      type="button"
                      onClick={() => {
                        setSelectedChallengeId(cs.id);
                        resetChallenge();
                        setQuizScore(null);
                        setSelectedAnswer(null);
                      }}
                      className={`p-3 border rounded-xl text-left transition-all cursor-pointer ${
                        selectedChallengeId === cs.id
                          ? "border-[#D4A853] bg-[#D4A853]/5 text-white"
                          : "border-[#D4A853]/8 text-[#B0A89E] hover:border-[#D4A853]/20 hover:text-white"
                      }`}
                    >
                      <div className="text-xs font-bold leading-snug line-clamp-2">{cs.title}</div>
                      {selectedChallengeId === cs.id && (
                        <span className="text-[10px] text-[#D4A853] block mt-1 uppercase tracking-wider">{"Active"}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Challenge Card */}
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-5 rounded-2xl space-y-4">
                <span className="font-mono text-xs text-[#D4A853]/70 tracking-widest uppercase">
                  {"02 — Crisis Scenario"}
                </span>
                <h3 className="text-base font-bold text-white font-serif leading-snug">{activeChallenge.title}</h3>

                <div className="border border-[#D4A853]/10 bg-[#0A0908] p-4 rounded-xl text-xs space-y-3">
                  <div>
                    <span className="text-[#D4A853] font-semibold block uppercase text-[10px] tracking-wider mb-1">{"Metrics Bottleneck"}</span>
                    <p className="text-[#B0A89E] leading-relaxed">{activeChallenge.metrics}</p>
                  </div>
                  <div className="border-t border-[#D4A853]/8 pt-3">
                    <span className="text-[#D4A853] font-semibold block uppercase text-[10px] tracking-wider mb-1">{"Environmental Context"}</span>
                    <p className="text-[#B0A89E] leading-relaxed">{activeChallenge.context}</p>
                  </div>
                </div>

                {!hlActive ? (
                  <div className="space-y-4">
                    {/* Friction options — 2 cols max */}
                    <div>
                      <label className="text-xs text-[#B0A89E] uppercase tracking-wider block mb-2">
                        {"Isolate friction mechanisms (select all that apply):"}
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activeChallenge.frictionOptions.map((option, idx) => {
                          const isSel = hlSelectedOptions.includes(idx);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                if (isSel) {
                                  setHlSelectedOptions(prev => prev.filter(i => i !== idx));
                                } else {
                                  setHlSelectedOptions(prev => [...prev, idx]);
                                }
                              }}
                              className={`p-3 text-xs text-left border rounded-xl transition-all cursor-pointer leading-relaxed ${
                                isSel
                                  ? "border-[#D4A853] bg-[#D4A853]/5 text-[#F5F0EB]"
                                  : "border-[#D4A853]/8 text-[#B0A89E] hover:border-white/10"
                              }`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Hypothesis */}
                    <div>
                      <label className="text-xs text-[#B0A89E] uppercase tracking-wider block mb-2">
                        {"Clinical diagnostic hypothesis:"}
                      </label>
                      <textarea
                        value={hlInput}
                        onChange={(e) => {
                          setHlInput(e.target.value);
                          if (!typingStartedAt && e.target.value.length > 0) {
                            setTypingStartedAt(Date.now());
                          }
                        }}
                        placeholder={"Write your diagnostic strategy. Focus on how technical constraints interact with behavioral friction..."}
                        className="w-full bg-[#0A0908] border border-[#D4A853]/8 focus:border-[#D4A853] focus:outline-none p-3 text-xs rounded-xl h-24 text-[#F5F0EB] font-mono resize-none"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (typingStartedAt) {
                            const elapsedSecs = (Date.now() - typingStartedAt) / 1000;
                            const wordCount = hlInput.trim().split(/\s+/).filter(Boolean).length;
                            const wpm = wordCount > 0 && elapsedSecs > 0 ? Math.round((wordCount / elapsedSecs) * 60) : 0;
                            setDiagnosticVelocity(wpm);
                            setSessionElapsed(Math.round(elapsedSecs));
                          }
                          setCoverageScore(Math.round((hlSelectedOptions.length / activeChallenge.frictionOptions.length) * 100));
                          setHlActive(true);
                        }}
                        disabled={!hlInput.trim() || hlSelectedOptions.length === 0}
                        className="px-5 py-2.5 bg-[#D4A853] text-[#0A0908] text-xs font-mono font-bold uppercase tracking-wider transition-all hover:bg-[#E8C97A] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer rounded-xl"
                      >
                        {"Execute Socratic Reverse-Reveal →"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-5 border-t border-[#D4A853]/15 pt-4"
                  >
                    {/* Hypothesis recap */}
                    <div>
                      <h4 className="text-xs text-[#5C9A6B] uppercase tracking-widest font-semibold mb-1">
                        {"✓ Socratic Reverse-Reveal Complete"}
                      </h4>
                      <p className="text-xs text-[#B0A89E] leading-relaxed">
                        {"Hypothesis: "}<span className="text-white italic">&ldquo;{hlInput}&rdquo;</span>
                      </p>
                    </div>

                    {/* Cognitive Telemetry */}
                    {coverageScore !== null && (
                      <div className="border border-[#D4A853]/15 bg-[#0A0908]/60 p-4 rounded-xl">
                        <span className="font-mono text-[10px] text-[#D4A853]/70 uppercase tracking-widest block mb-3">
                          {"Cognitive Telemetry"}
                        </span>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div>
                            <span className="font-mono text-[10px] text-[#B0A89E] uppercase block mb-1">{"Velocity"}</span>
                            <span className="font-serif text-xl font-bold text-[#D4A853]">{diagnosticVelocity ?? "—"}</span>
                            <span className="font-mono text-[10px] text-[#7A6F65] block">WPM</span>
                          </div>
                          <div>
                            <span className="font-mono text-[10px] text-[#B0A89E] uppercase block mb-1">{"Coverage"}</span>
                            <span className={`font-serif text-xl font-bold ${
                              coverageScore === 100 ? "text-[#5C9A6B]" :
                              coverageScore >= 67 ? "text-[#D4A853]" :
                              "text-[#C85C5C]"
                            }`}>{coverageScore}%</span>
                            <span className="font-mono text-[10px] text-[#7A6F65] block">{"Mechanisms"}</span>
                          </div>
                          <div>
                            <span className="font-mono text-[10px] text-[#B0A89E] uppercase block mb-1">{"Session"}</span>
                            <span className="font-serif text-xl font-bold text-[#F5F0EB]">{sessionElapsed ?? "—"}s</span>
                            <span className="font-mono text-[10px] text-[#7A6F65] block">{"Elapsed"}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Concept reveal */}
                    <div className="space-y-3 border-l-2 border-[#D4A853]/30 pl-4 py-1">
                      {activeChallenge.concepts.map((concept, idx) => (
                        <div key={idx}>
                          <div className="text-xs text-[#D4A853] uppercase font-bold">{concept.title}</div>
                          <p className="text-xs text-[#B0A89E] leading-relaxed mt-0.5">{concept.description}</p>
                        </div>
                      ))}
                    </div>

                    {/* Elevation Report */}
                    <div className="border border-[#D4A853]/25 bg-[#110F0D]/30 p-5 rounded-2xl space-y-5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-[#D4A853]/5 rounded-full filter blur-xl pointer-events-none" />

                      <div>
                        <span className="font-mono text-[10px] text-[#D4A853] tracking-widest uppercase block mb-1">
                          {"Elevation Report — Cognitive Gap Map"}
                        </span>
                        <div className="space-y-3">
                          {elev.gaps.map((g, idx) => (
                            <div key={idx}>
                              <div className="flex justify-between text-xs mb-1 flex-wrap gap-1">
                                <span className="text-[#B0A89E]">{g.label}</span>
                                <span className={`${g.colorClass} font-bold`}>{g.target - g.current}% Gap</span>
                              </div>
                              <div className="w-full bg-white/5 h-1.5 rounded overflow-hidden">
                                <div className={`bg-gradient-to-r ${g.barColor} h-full`} style={{ width: `${g.current}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-[#D4A853]/15 pt-4">
                        <span className="font-mono text-[10px] text-[#D4A853] tracking-widest uppercase block mb-3">
                          {"Hyper-Leap Study Plan"}
                        </span>
                        <div className="space-y-2">
                          {elev.studyPlan.map((s, idx) => (
                            <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-white/5 rounded-xl border border-[#D4A853]/8">
                              <span className="text-[#D4A853] font-bold text-xs flex-shrink-0">{s.step}</span>
                              <div>
                                <span className="text-white block font-bold text-xs">{s.title}</span>
                                <span className="text-xs text-[#B0A89E] leading-relaxed block mt-0.5">{s.desc}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-[#D4A853]/15 pt-4">
                        <span className="font-mono text-[10px] text-[#D4A853] tracking-widest uppercase block mb-3">
                          {"Priority Articles (Gap Closure)"}
                        </span>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {elev.articles.map((art) => (
                            <div
                              key={art.num}
                              className={`p-3 border rounded-xl flex flex-col justify-between cursor-pointer transition-all ${
                                expandedArticle === art.num
                                  ? "border-[#D4A853] bg-[#D4A853]/10"
                                  : "border-[#D4A853]/8 bg-[#0A0908] hover:border-[#D4A853]/25"
                              }`}
                              onClick={() => setExpandedArticle(expandedArticle === art.num ? null : art.num)}
                            >
                              <div>
                                <span className={`font-mono text-[10px] ${art.categoryColor} uppercase block mb-1`}>
                                  {art.category}
                                </span>
                                <h5 className="text-xs font-bold text-white leading-snug">{art.title}</h5>
                                {expandedArticle === art.num ? (
                                  <p className="text-xs text-[#F5F0EB] mt-2 leading-relaxed">{art.body}</p>
                                ) : (
                                  <p className="text-xs text-[#B0A89E] mt-1 line-clamp-2">{art.summary}</p>
                                )}
                              </div>
                              <span className="text-xs text-[#D4A853] font-bold mt-2">
                                {expandedArticle === art.num ? "Collapse ↑" : "Read →"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={resetChallenge}
                        className="px-4 py-2 border border-white/10 text-xs text-[#B0A89E] hover:text-white cursor-pointer uppercase font-mono rounded-xl transition-colors"
                      >
                        {"Reset"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const node = {
                            schema: "sf-ip-node-v1",
                            generated_at: new Date().toISOString(),
                            challenge: {
                              id: activeChallenge.id,
                              title: activeChallenge.title,
                              metrics: activeChallenge.metrics,
                              context: activeChallenge.context,
                            },
                            diagnostic_session: {
                              hypothesis: hlInput,
                              selected_friction_mechanisms: hlSelectedOptions.map(i => activeChallenge.frictionOptions[i]),
                              coverage_score_pct: coverageScore,
                              diagnostic_velocity_wpm: diagnosticVelocity,
                              time_to_submit_seconds: sessionElapsed,
                            },
                            elevation_report: {
                              gaps: elev.gaps.map(g => ({ label: g.label, current: g.current, target: g.target })),
                              study_plan: elev.studyPlan,
                            },
                            cognitive_radar_snapshot: radarDomains.map(d => ({ domain: d.name, score: d.score })),
                          };
                          const blob = new Blob([JSON.stringify(node, null, 2)], { type: "application/json" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `sf-ip-node-${activeChallenge.id}-${Date.now()}.json`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                        className="px-4 py-2 border border-[#D4A853]/25 text-xs text-[#D4A853] hover:bg-[#D4A853]/5 cursor-pointer uppercase font-mono rounded-xl transition-colors"
                      >
                        {"Export IP Node ↓"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRadarDomains(prev =>
                            prev.map(d => {
                              if (d.name === "Behavioral Economics") return { ...d, score: Math.min(d.score + 10, 100) };
                              if (d.name === "Technical Systems") return { ...d, score: Math.min(d.score + 12, 100) };
                              if (d.name === "Tax & Compliance") return { ...d, score: Math.min(d.score + 8, 100) };
                              return d;
                            })
                          );
                          setConceptsMastered(prev => prev + 3);
                          alert("✓ Concepts absorbed. Radar updated.");
                        }}
                        className="px-4 py-2 bg-[#5C9A6B]/10 border border-[#5C9A6B]/30 text-[#5C9A6B] text-xs font-bold uppercase tracking-wider cursor-pointer font-mono rounded-xl transition-colors hover:bg-[#5C9A6B]/20 ml-auto"
                      >
                        {"Absorb Concepts"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* RIGHT: Radar + Quiz */}
            <div className="xl:col-span-4 space-y-4">

              {/* Cognitive Radar */}
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-5 rounded-2xl">
                <span className="font-mono text-xs text-[#D4A853]/70 tracking-widest uppercase block mb-4">
                  {"03 — Cognitive Radar"}
                </span>
                <div className="flex justify-center">
                  <svg width={radarW} height={radarH} className="overflow-visible">
                    <defs>
                      <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#D4A853" stopOpacity={0.05} />
                        <stop offset="100%" stopColor="#D4A853" stopOpacity={0.28} />
                      </radialGradient>
                    </defs>
                    {[1, 2, 3, 4].map((level) => {
                      const pts = radarDomains.map((_, idx) => {
                        const c = getWebCoords(idx, level);
                        return `${c.x},${c.y}`;
                      }).join(" ");
                      return <polygon key={level} points={pts} fill="none" stroke="#D4A853" strokeOpacity={0.06} strokeWidth={1} />;
                    })}
                    {radarDomains.map((_, idx) => {
                      const end = getWebCoords(idx, 4);
                      return <line key={idx} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#D4A853" strokeOpacity={0.1} strokeWidth={1} />;
                    })}
                    <polygon
                      points={scorePoints}
                      fill="url(#radarFill)"
                      stroke="#D4A853"
                      strokeWidth={2}
                      style={{ filter: "drop-shadow(0 0 4px rgba(212,168,83,0.3))" }}
                    />
                    {radarDomains.map((d, i) => {
                      const labelR = r + 22;
                      const angle = (i * 2 * Math.PI) / radarDomains.length - Math.PI / 2;
                      const lx = cx + labelR * Math.cos(angle);
                      const ly = cy + labelR * Math.sin(angle);
                      const anchor = Math.cos(angle) > 0.1 ? "start" : Math.cos(angle) < -0.1 ? "end" : "middle";
                      return (
                        <text key={d.name} x={lx} y={ly + 4} fill="#B0A89E" fontSize="8" fontFamily="monospace" textAnchor={anchor}>
                          {d.name.split(" ")[0]}
                        </text>
                      );
                    })}
                  </svg>
                </div>
                <div className="mt-4 space-y-1.5 border-t border-[#D4A853]/8 pt-3">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="text-[#D4A853] uppercase tracking-wider font-bold text-[10px]">{"Concepts Mastered"}</span>
                    <span className="text-white font-bold bg-[#D4A853]/10 px-2 py-0.5 rounded-full border border-[#D4A853]/20 text-[10px]">{conceptsMastered}</span>
                  </div>
                  {radarDomains.map(d => (
                    <div key={d.name} className="flex justify-between items-center text-xs">
                      <span className="text-[#B0A89E] truncate mr-2">{d.name}</span>
                      <span className="text-[#D4A853] flex-shrink-0 font-mono">{d.score}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Diagnostic Quiz */}
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-5 rounded-2xl space-y-3">
                <span className="font-mono text-xs text-[#D4A853]/70 tracking-widest uppercase">
                  {"04 — Quick Diagnostic"}
                </span>
                <div className="border border-[#D4A853]/8 bg-[#0A0908] p-3 rounded-xl">
                  <span className="text-[10px] text-[#D4A853] uppercase block mb-1">{"Active Scenario"}</span>
                  <p className="text-xs text-[#B0A89E] leading-relaxed">{activeChallenge.quizQuestion}</p>
                </div>
                <div className="space-y-1.5">
                  {activeChallenge.quizAnswers.map((ans, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => checkQuiz(idx)}
                      disabled={selectedAnswer !== null}
                      className={`w-full text-left p-2.5 text-xs border rounded-xl transition-all cursor-pointer ${
                        selectedAnswer === idx
                          ? idx === 1
                            ? "bg-[#5C9A6B]/10 border-[#5C9A6B]/30 text-[#5C9A6B]"
                            : "bg-[#C85C5C]/10 border-[#C85C5C]/30 text-[#C85C5C]"
                          : "border-[#D4A853]/8 text-[#B0A89E] hover:border-[#D4A853]/25 hover:text-white"
                      } disabled:cursor-not-allowed`}
                    >
                      {ans}
                    </button>
                  ))}
                </div>
                {quizScore !== null && (
                  <div className={`p-2.5 border text-xs leading-relaxed rounded-xl ${
                    quizScore === 100
                      ? "bg-[#5C9A6B]/5 border-[#5C9A6B]/20 text-[#5C9A6B]"
                      : "bg-[#C85C5C]/5 border-[#C85C5C]/20 text-[#C85C5C]"
                  }`}>
                    {quizScore === 100 ? "✓ CORRECT. " : "✗ INCORRECT. "}
                    {activeChallenge.quizExplanation}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── IP LAB (Socratic Drafts) ──────────────────────────────── */}
        {activeTab === 'socratic' && (
          <motion.div
            key="lab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-1 xl:grid-cols-12 gap-5 relative z-10 min-h-[75vh] items-stretch"
          >
            {/* LEFT: Draft Engine */}
            <div className="xl:col-span-8 flex flex-col">
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-5 rounded-2xl flex flex-col flex-1">
                <span className="font-mono text-xs text-[#D4A853]/70 tracking-widest uppercase block mb-4">
                  {"01 — Socratic Draft Engine"}
                </span>

                {/* Article selector chips — always scrollable, never grid */}
                <div className="flex gap-2 pb-2 overflow-x-auto flex-nowrap scrollbar-thin">
                  {articles.length === 0 ? (
                    <button className="px-4 py-2 text-xs font-mono border border-[#D4A853] bg-[#D4A853]/10 text-[#D4A853] rounded-xl flex-shrink-0 cursor-pointer">
                      Socratic Funnel Diagnostics
                    </button>
                  ) : (
                    articles.map(article => (
                      <button
                        key={article.id}
                        type="button"
                        onClick={() => { setSelectedArticleSlug(article.slug); setSelectedDraftId(null); }}
                        className={`px-4 py-2 text-xs font-mono border rounded-xl transition-all flex-shrink-0 cursor-pointer ${
                          selectedArticleSlug === article.slug
                            ? "border-[#D4A853] bg-[#D4A853]/10 text-[#D4A853]"
                            : "border-[#2A2218] text-[#7A6F65] hover:text-[#B0A89E]"
                        }`}
                      >
                        {article.title}
                      </button>
                    ))
                  )}
                </div>

                {/* Article brief */}
                <div className="mt-4 mb-5 border-l-2 border-[#D4A853]/30 pl-4 py-1">
                  <h2 className="text-base font-bold font-mono text-white">
                    {activeArticle?.title || "Socratic Funnel Diagnostics"}
                  </h2>
                  <p className="text-xs text-[#B0A89E] leading-relaxed mt-1">
                    {activeArticle?.summary || "How to construct medical-grade landing page teardowns that demand high-ticket consulting responses."}
                  </p>
                </div>

                {/* 3 Drafts — lg:grid-cols-3 (safe: only activates at 1024px+ where sidebar+col is wide enough) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1">
                  {activeDrafts.length > 0 ? (
                    activeDrafts.map((draft) => (
                      <div
                        key={draft.id}
                        onClick={() => handleSelectDraft(draft.draft_number)}
                        className={`p-4 border rounded-xl transition-all cursor-pointer flex flex-col justify-between h-full overflow-hidden ${
                          selectedDraftId === draft.draft_number
                            ? "bg-[#D4A853]/5 border-[#D4A853]/40"
                            : "bg-[#110F0D]/20 border-[#2A2218] hover:border-[#D4A853]/25"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-mono text-xs text-[#D4A853] tracking-wider uppercase">
                              {"Draft"} 0{draft.draft_number}
                            </span>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(star => (
                                <span
                                  key={star}
                                  onClick={(e) => { e.stopPropagation(); handleRating(draft.id, star); }}
                                  className={`text-xs cursor-pointer ${star <= (ratings[draft.id] || 0) ? "text-[#D4A853]" : "text-[#7A6F65]"}`}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                          <InlineMarkdown text={draft.content} className="text-xs text-[#B0A89E] leading-relaxed font-mono" />
                        </div>
                        <div className="pt-3 border-t border-[#2A2218] flex justify-between items-center mt-3">
                          <span className="text-xs font-mono text-[#B0A89E] uppercase truncate mr-2">
                            {draft.draft_number === 1 ? "Product Strategist" : draft.draft_number === 2 ? "Behavioral Scientist" : "Linguistic Architect"}
                          </span>
                          <div className={`w-2.5 h-2.5 rounded-full border flex-shrink-0 ${
                            selectedDraftId === draft.draft_number ? "bg-[#D4A853] border-[#D4A853]" : "border-[#7A6F65]"
                          }`} />
                        </div>
                      </div>
                    ))
                  ) : (
                    [1, 2, 3].map((num) => (
                      <div
                        key={num}
                        onClick={() => handleSelectDraft(num)}
                        className={`p-4 border rounded-xl transition-all cursor-pointer flex flex-col justify-between h-full overflow-hidden ${
                          selectedDraftId === num
                            ? "bg-[#D4A853]/5 border-[#D4A853]/40"
                            : "bg-[#110F0D]/20 border-[#2A2218] hover:border-[#D4A853]/25"
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="font-mono text-xs text-[#D4A853] tracking-wider uppercase block mb-2">{"Draft"} 0{num}</span>
                          <p className="text-xs text-[#B0A89E] leading-relaxed font-mono">
                            {num === 1
                              ? "Focus on high-ticket conversion friction. Highlight visual deficits adjacent to key click triggers."
                              : num === 2
                              ? "Analyze cognitive load constraints using the Fogg Behavior Model. Detail latency thresholds."
                              : "Utilize high-status contrast phrasing, avoiding consulting clichés to establish immediate authority."
                            }
                          </p>
                        </div>
                        <div className="pt-3 border-t border-[#2A2218] flex justify-between items-center mt-3">
                          <span className="text-xs font-mono text-[#B0A89E] uppercase truncate mr-2">
                            {num === 1 ? "Product Strategist" : num === 2 ? "Behavioral Scientist" : "Linguistic Architect"}
                          </span>
                          <div className={`w-2.5 h-2.5 rounded-full border flex-shrink-0 ${
                            selectedDraftId === num ? "bg-[#D4A853] border-[#D4A853]" : "border-[#7A6F65]"
                          }`} />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Socratic Feedback */}
                <AnimatePresence>
                  {selectedDraftId && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="space-y-3 border-t border-[#D4A853]/15 pt-4 mt-4"
                    >
                      <label className="font-mono text-xs text-[#D4A853]/70 tracking-wider uppercase block">
                        {"Socratic Refinement Notes"}
                      </label>
                      <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder={"Specify why these arguments align with your divergence model..."}
                        className="w-full bg-[#0A0908] border border-[#2A2218] focus:border-[#D4A853] focus:outline-none p-3 text-xs font-mono rounded-xl h-20 text-[#F5F0EB] resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDraftId(null)}
                          className="px-4 py-2 border border-[#2A2218] text-xs font-mono text-[#7A6F65] hover:text-[#B0A89E] cursor-pointer rounded-xl"
                        >
                          {"Clear"}
                        </button>
                        <button
                          type="button"
                          onClick={submitSocraticPreference}
                          className="px-4 py-2 bg-[#D4A853] text-[#0A0908] text-xs font-mono font-bold uppercase tracking-wider cursor-pointer rounded-xl"
                        >
                          {"Reinforce Weights"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* RIGHT: Debate Flow + Engine Config */}
            <div className="xl:col-span-4 flex flex-col gap-4">

              {/* Dialectic Chain — spine-based, zero flex-row */}
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-5 rounded-2xl overflow-hidden">
                <span className="font-mono text-[10px] text-[#D4A853]/70 tracking-[0.3em] uppercase block mb-5">
                  {"02 — Dialectic Chain"}
                </span>
                <div className="relative">
                  {/* Spine */}
                  <div className="absolute left-[6px] top-3 bottom-3 w-px bg-gradient-to-b from-[#D4A853]/40 via-[#D4A853]/10 to-[#5C9A6B]/40" />

                  {/* Node: Thesis */}
                  <div className="relative pl-7 mb-2">
                    <div className="absolute left-0 top-1 w-[13px] h-[13px] rounded-full border-2 border-[#D4A853] bg-[#110F0D]" />
                    <div className="font-mono text-[10px] text-[#D4A853] uppercase mb-0.5">{"Product Strategist"}</div>
                    <div className="font-mono text-[10px] text-[#D4A853]/70 mb-1.5">Arg 01</div>
                    <p className="text-xs text-[#B0A89E] leading-relaxed">
                      Funnel requires card reduction to minimize decision fatigue on checkout.
                    </p>
                  </div>

                  {/* Relation label */}
                  <div className="relative pl-7 mb-2">
                    <div className="absolute left-[2px] top-0.5 font-mono text-[9px] text-[#7A6F65]">↓</div>
                    <span className="font-mono text-[9px] text-[#7A6F65] uppercase">{"contradicts"}</span>
                  </div>

                  {/* Node: Anti-thesis */}
                  <div className="relative pl-7 mb-2">
                    <div className="absolute left-0 top-1 w-[13px] h-[13px] rounded-full border-2 border-[#C85C5C] bg-[#110F0D]" />
                    <div className="font-mono text-[10px] text-[#C85C5C] uppercase mb-0.5">{"Behavioral Scientist"}</div>
                    <div className="font-mono text-[10px] text-[#C85C5C]/40 mb-1.5">Pivot 02</div>
                    <p className="text-xs text-[#B0A89E] leading-relaxed">
                      Card reduction fails if value is undefined. Calculator slider builds habit loop first.
                    </p>
                  </div>

                  {/* Relation label */}
                  <div className="relative pl-7 mb-2">
                    <div className="absolute left-[2px] top-0.5 font-mono text-[9px] text-[#5C9A6B]">↓</div>
                    <span className="font-mono text-[9px] text-[#5C9A6B] uppercase">{"synthesizes"}</span>
                  </div>

                  {/* Node: Synthesis */}
                  <div className="relative pl-7">
                    <div className="absolute left-0 top-1 w-[13px] h-[13px] rounded-full border-2 border-[#5C9A6B] bg-[#110F0D]" />
                    <div className="font-mono text-[10px] text-[#5C9A6B] uppercase mb-0.5">{"Linguistic Architect"}</div>
                    <div className="font-mono text-[10px] text-[#5C9A6B]/40 mb-1.5">Synthesis 03</div>
                    <p className="text-xs text-[#B0A89E] leading-relaxed">
                      Frame calculator as interactive tool: user isolates value, removing billing anxiety.
                    </p>
                  </div>
                </div>
              </div>

              {/* Engine Config */}
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-5 rounded-2xl space-y-4">
                <h3 className="font-mono text-xs text-[#D4A853]/70 tracking-widest uppercase">{"Socratic Engine Config"}</h3>
                <div className="space-y-2 text-xs">
                  {[
                    { label: "Active Agents", value: "3 (Strategist, Scientist, Architect)" },
                    { label: "KB Version", value: "v3.4.0" },
                    { label: "Socratic Index", value: "96.8 / 100" },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between gap-2">
                      <span className="text-[#B0A89E] flex-shrink-0">{row.label}:</span>
                      <span className="text-white text-right">{row.value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#B0A89E] leading-relaxed pt-2 border-t border-[#D4A853]/8">
                  {"The Socratic Draft Engine synthesizes multiple expert viewpoints to construct high-status conversion analysis documents."}
                </p>
              </div>

              {/* Mastery Index */}
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-5 rounded-2xl space-y-3 flex-1">
                <span className="font-mono text-xs text-[#D4A853]/70 tracking-widest uppercase block">{"Mastery Index"}</span>
                {DOMAINS.map((d) => (
                  <div key={d.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#B0A89E] truncate mr-2">{d.name}</span>
                      <span className="text-[#D4A853] flex-shrink-0">{d.score}%</span>
                    </div>
                    <div className="h-1 bg-[#1A1815] rounded-full overflow-hidden">
                      <div className="h-full bg-[#D4A853] rounded-full" style={{ width: `${d.score}%`, opacity: 0.6 + d.score / 500 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
