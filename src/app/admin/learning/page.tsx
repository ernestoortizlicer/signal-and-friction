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
    id: "wy_llc_saas",
    title: "B2B SaaS Founder: Jurisdiction Arbitrage + Conversion Gate",
    metrics: "Founder closes $18k/month in contracts but loses 47% net to taxes. Checkout conversion drops 23% when annual billing is introduced. Cash-flow gap of $700/month threatens relocation plan.",
    context: "Non-US founder operating via Wyoming LLC, servicing EU clients. Clients resist annual billing due to lack of prorated refund clarity. Fiscal residency change planned but not yet executed.",
    frictionOptions: [
      "Tax: Active Spain IRPF exposure during relocation transition",
      "Cognitive: Annual billing refund anxiety (no prorated guarantee shown)",
      "Trust Deficit: Non-US entity perception gap with EU enterprise buyers"
    ],
    concepts: [
      { title: "Concept 1: Fiscal Drag During Transition Windows (Tax & Compliance)", description: "Changing fiscal residency mid-year does not eliminate prior-year tax liability in the source country. Spain's Art. 9 LIRPF applies 183-day presence test plus economic interests test. A founder cannot reduce Spain IRPF exposure until the year after official registration abroad AND deregistration from Spain's Censo de Obligados Tributarios (Modelo 030)." },
      { title: "Concept 2: Annual Billing Refund Anxiety (Behavioral Economics)", description: "Enterprise B2B buyers resist annual billing not because of cash flow — but because of perceived lock-in risk. The Fogg Behavioral Model predicts that motivation (desire for annual discount) drops when effort (perceived risk of no exit) is too high. Adding a 30-day prorated refund clause directly into the pricing page eliminates this friction and increases annual plan selection by 28-35%." },
      { title: "Concept 3: Non-US Entity Trust Architecture (Conversion Architecture)", description: "EU enterprise procurement teams run vendor checks via Crunchbase, LinkedIn, and company registries. A Wyoming LLC without a public US presence (Stripe checkout with US Merchant descriptor + LinkedIn company page with HQ city) creates a trust gap. Mitigating it requires a US-mapped Stripe descriptor, a professional company LinkedIn page, and optionally a virtual US address for the LLC." }
    ],
    quizQuestion: "A SaaS founder moves from Spain to Paraguay mid-year on July 15. He files Modelo 030 in October. Spain's tax authority sends a demand for full-year IRPF on consulting income. Is Spain's claim legally valid for that year?",
    quizAnswers: [
      "No — once Modelo 030 is filed, Spain's tax claim terminates immediately",
      "Yes — Spain applies the 183-day test and the economic-interests test; mid-year departure likely leaves the founder as a Spanish tax resident for the full year",
      "Partially — only income earned before the move date is taxable in Spain"
    ],
    quizExplanation: "Yes, Spain's claim is valid for the full year. Art. 9 LIRPF counts days of physical presence in Spain AND applies a center-of-economic-interests test. Departing mid-year likely triggers residency for the entire fiscal year. Clean break requires spending the full calendar year outside Spain."
  },
  {
    id: "pricing_psychology_b2b",
    title: "High-Ticket B2B Pricing Psychology: When Price Increases Conversions",
    metrics: "Consulting firm at $1,500/project sees 14% conversion. After raising to $4,500, conversion drops to 6% — but revenue per close increases 3x and client quality improves dramatically. Total monthly revenue rises 29%.",
    context: "B2B consulting targeting Series A SaaS companies. Original pricing felt budget-level. Post-raise, enterprise buyers engaged more seriously. Cognitive reframe from 'vendor' to 'strategic advisor' occurred at $4k+ threshold.",
    frictionOptions: [
      "Value Deficit: $1,500 price point signals junior/tactical work to enterprise buyers",
      "Trust Deficit: Low price anchors 'advisor' positioning against internal alternatives",
      "Cognitive: Price elasticity misread — chasing volume over margin"
    ],
    concepts: [
      { title: "Concept 1: Veblen Good Dynamics in B2B Services (Pricing Logic)", description: "In B2B high-ticket consulting, price is a quality signal. The Veblen Effect applies: above a threshold (~$3-5k per project for Series A SaaS), buyer decision-making shifts from price-sensitivity to outcome-confidence. A $4,500 price point activates procurement budgets that a $1,500 price point cannot touch — it falls below the minimum threshold of 'strategic spend' in most company expense policies." },
      { title: "Concept 2: Anchoring and Reference Pricing (Behavioral Economics)", description: "Enterprise buyers don't evaluate price in isolation — they compare against alternatives: an internal hire ($6-10k/month), a consulting firm ($15-25k/project), or doing nothing. Anchoring your price against the highest-cost alternative and framing the gap as 'risk-adjusted ROI' removes price sensitivity entirely. A $4,500 project that prevents a $50k conversion failure has a 10x ROI frame." },
      { title: "Concept 3: Founder Psychology and Pricing Courage (Conversion Architecture)", description: "The most common pricing mistake is undercutting out of fear of rejection. The Signal & Friction model frames pricing as a trust signal: low prices create cognitive dissonance ('if it's this cheap, how good can it be?'). Raising prices selectively filters out low-quality clients, increases perceived authority, and attracts buyers who trust the outcome — rather than buyers who need to minimize risk." }
    ],
    quizQuestion: "A consultant raises hourly rate from $120 to $350. Pipeline closes drop from 8/month to 3/month. Revenue goes from $4,800 to $6,300/month. What happened to the conversion rate and was it the right move?",
    quizAnswers: [
      "Conversion rate dropped 62.5% — this is a failure that needs reversal",
      "Conversion rate dropped 62.5% — but revenue increased 31% and client quality improved; this is a correct Veblen pricing move if churn stays low",
      "Conversion rate is irrelevant; only total revenue matters at any price point"
    ],
    quizExplanation: "Option B is correct. The Veblen pricing effect is confirmed: fewer closes, higher revenue per close. The key variable to track is not conversion rate alone but Revenue Per Close × Client Quality × Referral Rate. At $350/hr the consultant attracts clients who are more committed and less likely to ghost or demand revisions."
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
  wy_llc_saas: {
    gaps: [
      { label: "Tax & Compliance Gap", current: 55, target: 95, colorClass: "text-[#C85C5C]", barColor: "from-[#C85C5C] to-[#D4A853]" },
      { label: "Conversion Architecture Gap", current: 60, target: 90, colorClass: "text-[#D4A853]", barColor: "from-[#B8900A] to-[#D4A853]" },
      { label: "Behavioral Economics Gap", current: 70, target: 92, colorClass: "text-[#5C9A6B]", barColor: "from-[#5C9A6B] to-[#D4A853]" }
    ],
    studyPlan: [
      { step: "01", title: "Map Fiscal Year Exposure Window", desc: "Calculate the 183-day presence count for the current year. Determine if the economic-interests test (pension source, company domicile) overrides the physical presence test under Spain's Art. 9 LIRPF." },
      { step: "02", title: "Deploy Annual Billing Trust Patch", desc: "Add a prorated refund clause to the pricing page. Frame it as: 'Annual plan. Cancel anytime — unused months refunded within 48h.' A/B test against current pricing page." },
      { step: "03", title: "Build EU Enterprise Trust Architecture", desc: "Establish US-mapped Stripe merchant descriptor, create LinkedIn company page with US headquarters, add Terms of Service with GDPR DPA clause. These three items eliminate the non-US entity trust gap for EU procurement." }
    ],
    articles: [
      { num: 1, category: "Tax & Compliance", categoryColor: "text-[#C85C5C]", title: "Spain IRPF Art. 9 — Residency Trap for Digital Nomads", summary: "Why departing Spain mid-year does not eliminate full-year tax liability.", body: "Spain's IRPF applies the 183-day physical presence test AND a center-of-economic-interests test. A founder who earns pension income from Spain, maintains a Spanish bank as primary account, or has a Spanish spouse may be classified as a Spanish tax resident for the entire fiscal year regardless of departure date. Clean break requires the full calendar year spent outside Spain + Modelo 030 filed + Hacienda acknowledgment." },
      { num: 2, category: "Conversion Architecture", categoryColor: "text-[#D4A853]", title: "Annual Billing Refund Architecture — Eliminating Lock-In Anxiety", summary: "How prorated refund clauses increase annual plan conversion by 28-35%.", body: "Enterprise B2B buyers do not fear annual billing — they fear perceived lock-in with no exit. Adding a clear 30-day prorated refund clause (visible on the pricing page, not buried in ToS) removes this barrier. The clause costs close to zero in practice since churn in the first 30 days of an annual contract is typically under 2%." },
      { num: 3, category: "Trust Architecture", categoryColor: "text-[#5C9A6B]", title: "Wyoming LLC Trust Stack for EU Enterprise Clients", summary: "Building credibility signals for non-US entities operating in European B2B markets.", body: "EU enterprise procurement teams verify vendors through Crunchbase, LinkedIn, and Stripe merchant category codes. A Wyoming LLC with a US merchant descriptor, a professional LinkedIn company page listing a US city as headquarters, and a GDPR Data Processing Agreement as part of the Master Services Agreement completes the trust stack needed to pass EU procurement reviews." }
    ]
  },
  pricing_psychology_b2b: {
    gaps: [
      { label: "Pricing Logic Gap", current: 45, target: 95, colorClass: "text-amber-400", barColor: "from-amber-500 to-[#D4A853]" },
      { label: "Behavioral Economics Gap", current: 65, target: 90, colorClass: "text-[#D4A853]", barColor: "from-[#B8900A] to-[#D4A853]" }
    ],
    studyPlan: [
      { step: "01", title: "Compute Your Veblen Threshold", desc: "Map the typical procurement budget categories for your target ICP. Identify the minimum spend threshold that triggers 'strategic vendor' classification vs. 'tactical expense'. Price above the lower boundary of the strategic tier." },
      { step: "02", title: "Build a Reference Anchoring Frame", desc: "Create a pricing page section showing the cost of alternatives: internal hire, competing agency, or doing nothing. Position your price as the risk-adjusted midpoint that captures 80% of the value at 30% of the cost." },
      { step: "03", title: "Measure Revenue Per Close, Not Conversion Rate", desc: "Track: Revenue Per Close × Avg. Contract Length × Referral Rate. This composite metric shows whether a price increase was the right move even if raw conversion rate dropped. Set a 90-day threshold to evaluate the full impact." }
    ],
    articles: [
      { num: 1, category: "Pricing Logic", categoryColor: "text-amber-400", title: "Veblen Goods in B2B Consulting: When Price Signals Quality", summary: "Why raising prices can increase conversions for high-ticket advisory services.", body: "In B2B professional services, price is the single strongest quality signal available before a buyer experiences the work. Below a Veblen threshold (typically $3,000-$8,000 for B2B SaaS consulting), buyers apply consumer-market logic: lower price = lower quality. Above the threshold, they apply institutional-market logic: price signals commitment, rigor, and selective client intake." },
      { num: 2, category: "Behavioral Economics", categoryColor: "text-[#D4A853]", title: "Reference Price Anchoring in B2B Sales Conversations", summary: "Using competitive alternatives as anchors to shift price sensitivity.", body: "Anchoring theory shows that the first number introduced in a negotiation frames all subsequent judgment. By leading with the cost of alternatives (an internal hire at $7k/month, a McKinsey engagement at $50k/project), your $4,500 project price becomes the obvious choice. The cognitive labor of comparison is offloaded by the seller, removing the buyer's need to justify the spend internally." },
      { num: 3, category: "Conversion Architecture", categoryColor: "text-[#5C9A6B]", title: "Redefining Conversion Metrics for High-Ticket B2B Services", summary: "Why optimizing for raw close rate destroys revenue in premium positioning.", body: "At $150/hr vs. $350/hr with the same 40h engagement, the Revenue Per Close difference is $8,000. If $150/hr closes 8/month and $350/hr closes 3/month, the total revenue is $4,800 vs. $42,000 — not $6,300. The key insight: each high-ticket close also has a higher referral coefficient (premium clients have premium networks), compounding the long-term revenue effect." }
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
  const [semanticDivergence, setSemanticDivergence] = useState<number | null>(null);

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
      alert(`✓ Selección Confirmada: Ponderaciones del Borrador ${selectedDraftId} reforzadas.`);
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
    setSemanticDivergence(null);
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
          <span className="font-mono text-xs text-[#D4A853]/40 tracking-[0.4em] uppercase block">
            Sistema de Eminencia
          </span>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-[#D4A853]">Laboratorio</span> de Combate
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs text-[#5C9A6B] border border-[#5C9A6B]/25 px-3 py-1 rounded-full bg-[#5C9A6B]/5">
            {conceptsMastered} Conceptos Dominados
          </span>
          <span className="font-mono text-xs text-[#D4A853] border border-[#D4A853]/25 px-3 py-1 rounded-full bg-[#D4A853]/5">
            Fábrica IP Activa
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#D4A853]/10 gap-6 relative z-10">
        {([
          { key: 'hyper_leap', label: 'Modo Combate' },
          { key: 'socratic',   label: 'Laboratorio IP' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 font-mono text-xs uppercase tracking-widest border-b-2 transition-all duration-300 cursor-pointer whitespace-nowrap ${
              activeTab === tab.key
                ? "border-[#D4A853] text-[#D4A853]"
                : "border-transparent text-[#7A6F65] hover:text-[#9A8F82]"
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
                  <span className="font-mono text-xs text-[#D4A853]/40 tracking-widest uppercase">
                    01 — Selección de Escenario
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#C85C5C] border border-[#C85C5C]/20 px-2 py-0.5 rounded-full bg-[#C85C5C]/5">
                    Modo Divergente
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
                          : "border-[#D4A853]/8 text-[#9A8F82] hover:border-[#D4A853]/20 hover:text-white"
                      }`}
                    >
                      <div className="text-xs font-bold leading-snug line-clamp-2">{cs.title}</div>
                      {selectedChallengeId === cs.id && (
                        <span className="text-[10px] text-[#D4A853] block mt-1 uppercase tracking-wider">Activo</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Challenge Card */}
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-5 rounded-2xl space-y-4">
                <span className="font-mono text-xs text-[#D4A853]/40 tracking-widest uppercase">
                  02 — Escenario de Crisis
                </span>
                <h3 className="text-base font-bold text-white font-serif leading-snug">{activeChallenge.title}</h3>

                <div className="border border-[#D4A853]/10 bg-[#0A0908] p-4 rounded-xl text-xs space-y-3">
                  <div>
                    <span className="text-[#D4A853] font-semibold block uppercase text-[10px] tracking-wider mb-1">Cuello de Botella — Métricas</span>
                    <p className="text-[#9A8F82] leading-relaxed">{activeChallenge.metrics}</p>
                  </div>
                  <div className="border-t border-[#D4A853]/8 pt-3">
                    <span className="text-[#D4A853] font-semibold block uppercase text-[10px] tracking-wider mb-1">Contexto Operativo</span>
                    <p className="text-[#9A8F82] leading-relaxed">{activeChallenge.context}</p>
                  </div>
                </div>

                {!hlActive ? (
                  <div className="space-y-4">
                    {/* Friction options — 2 cols max */}
                    <div>
                      <label className="text-xs text-[#9A8F82] uppercase tracking-wider block mb-2">
                        Aisla los mecanismos de fricción (selecciona todos los aplicables):
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
                                  : "border-[#D4A853]/8 text-[#9A8F82] hover:border-white/10"
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
                      <label className="text-xs text-[#9A8F82] uppercase tracking-wider block mb-2">
                        Hipótesis diagnóstica clínica:
                      </label>
                      <textarea
                        value={hlInput}
                        onChange={(e) => {
                          setHlInput(e.target.value);
                          if (!typingStartedAt && e.target.value.length > 0) {
                            setTypingStartedAt(Date.now());
                          }
                        }}
                        placeholder="Escribe tu estrategia diagnóstica. Enfócate en cómo las restricciones técnicas interactúan con la fricción conductual..."
                        className="w-full bg-[#0A0908] border border-[#D4A853]/8 focus:border-[#D4A853] focus:outline-none p-3 text-xs rounded-xl h-24 text-[#F5F0EB] font-mono resize-none"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          // Telemetry computation
                          let wpm = 0;
                          let elapsed = 0;
                          if (typingStartedAt) {
                            elapsed = Math.round((Date.now() - typingStartedAt) / 1000);
                            const wordCount = hlInput.trim().split(/\s+/).filter(Boolean).length;
                            wpm = wordCount > 0 && elapsed > 0 ? Math.round((wordCount / elapsed) * 60) : 0;
                            setDiagnosticVelocity(wpm);
                            setSessionElapsed(elapsed);
                          }
                          const cov = Math.round((hlSelectedOptions.length / activeChallenge.frictionOptions.length) * 100);
                          setCoverageScore(cov);

                          // Semantic divergence: % of user's key words NOT found in the canonical concepts
                          const canonicalText = activeChallenge.concepts.map(c => c.description + ' ' + c.title).join(' ').toLowerCase();
                          const canonicalWords = new Set(canonicalText.split(/\W+/).filter(w => w.length > 4));
                          const userWords = hlInput.toLowerCase().split(/\W+/).filter(w => w.length > 4);
                          const unique = userWords.filter(w => !canonicalWords.has(w));
                          const divergence = userWords.length > 0 ? Math.round((unique.length / userWords.length) * 100) : 0;
                          setSemanticDivergence(divergence);

                          // Feature 8: Auto-update radar based on domain relevance + coverage
                          const domainMap: Record<string, string[]> = {
                            "tiktok": ["Behavioral Economics", "Technical Systems"],
                            "figma": ["Cognitive Load", "Pricing Logic"],
                            "vercel": ["Behavioral Economics", "Conversion Architecture"],
                            "saas_asia": ["Tax & Compliance", "Technical Systems"],
                            "wy_llc_saas": ["Tax & Compliance", "Conversion Architecture", "Behavioral Economics"],
                            "pricing_psychology_b2b": ["Pricing Logic", "Behavioral Economics", "Conversion Architecture"],
                          };
                          const domainsToBoost = domainMap[activeChallenge.id] || [];
                          const boost = Math.round((cov / 100) * 8);
                          if (boost > 0) {
                            setRadarDomains(prev => prev.map(d =>
                              domainsToBoost.includes(d.name)
                                ? { ...d, score: Math.min(d.score + boost, 100) }
                                : d
                            ));
                          }

                          setHlActive(true);
                        }}
                        disabled={!hlInput.trim() || hlSelectedOptions.length === 0}
                        className="px-5 py-2.5 bg-[#D4A853] text-[#0A0908] text-xs font-mono font-bold uppercase tracking-wider transition-all hover:bg-[#E8C97A] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer rounded-xl"
                      >
                        Ejecutar Revelación Socrática →
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
                        ✓ Revelación Socrática Completada
                      </h4>
                      <p className="text-xs text-[#9A8F82] leading-relaxed">
                        Hipótesis: <span className="text-white italic">&ldquo;{hlInput}&rdquo;</span>
                      </p>
                    </div>

                    {/* Cognitive Telemetry Matrix — Feature 7 */}
                    {coverageScore !== null && (
                      <div className="border border-[#D4A853]/20 bg-[#0A0908]/70 p-4 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-[#D4A853]/60 uppercase tracking-widest">
                            Matriz de Telemetría Cognitiva
                          </span>
                          <span className="font-mono text-[9px] text-[#7A6F65] uppercase">Sesión en Vivo</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            {
                              label: "Velocidad de Diagnóstico",
                              value: diagnosticVelocity !== null ? `${diagnosticVelocity} PPM` : "—",
                              sub: "Velocidad de escritura",
                              accent: diagnosticVelocity !== null && diagnosticVelocity > 50 ? "text-[#5C9A6B]" : "text-[#D4A853]",
                              bar: diagnosticVelocity !== null ? Math.min((diagnosticVelocity / 80) * 100, 100) : 0,
                            },
                            {
                              label: "Cobertura de Mecanismos",
                              value: `${coverageScore}%`,
                              sub: "Fricción identificada",
                              accent: coverageScore === 100 ? "text-[#5C9A6B]" : coverageScore >= 67 ? "text-[#D4A853]" : "text-[#C85C5C]",
                              bar: coverageScore,
                            },
                            {
                              label: "Divergencia Semántica",
                              value: semanticDivergence !== null ? `${semanticDivergence}%` : "—",
                              sub: "Enfoque novedoso",
                              accent: semanticDivergence !== null && semanticDivergence > 40 ? "text-[#A855F7]" : "text-[#9A8F82]",
                              bar: semanticDivergence ?? 0,
                            },
                            {
                              label: "Tiempo de Envío",
                              value: sessionElapsed !== null ? `${sessionElapsed}s` : "—",
                              sub: "Latencia de decisión",
                              accent: sessionElapsed !== null && sessionElapsed < 60 ? "text-[#5C9A6B]" : "text-[#9A8F82]",
                              bar: sessionElapsed !== null ? Math.max(100 - (sessionElapsed / 300) * 100, 10) : 0,
                            },
                          ].map(m => (
                            <div key={m.label} className="bg-black/40 border border-[#D4A853]/8 p-3 rounded-xl space-y-1.5">
                              <div className="flex justify-between items-baseline">
                                <span className="font-mono text-[9px] text-[#7A6F65] uppercase">{m.label}</span>
                                <span className={`font-mono text-sm font-bold ${m.accent}`}>{m.value}</span>
                              </div>
                              <div className="h-1 bg-black/60 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full bg-current ${m.accent} opacity-70`} style={{ width: `${m.bar}%` }} />
                              </div>
                              <span className="font-mono text-[8px] text-[#5C5550] block">{m.sub}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Concept reveal */}
                    <div className="space-y-3 border-l-2 border-[#D4A853]/30 pl-4 py-1">
                      {activeChallenge.concepts.map((concept, idx) => (
                        <div key={idx}>
                          <div className="text-xs text-[#D4A853] uppercase font-bold">{concept.title}</div>
                          <p className="text-xs text-[#9A8F82] leading-relaxed mt-0.5">{concept.description}</p>
                        </div>
                      ))}
                    </div>

                    {/* Elevation Report */}
                    <div className="border border-[#D4A853]/25 bg-[#110F0D]/30 p-5 rounded-2xl space-y-5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-[#D4A853]/5 rounded-full filter blur-xl pointer-events-none" />

                      <div>
                        <span className="font-mono text-[10px] text-[#D4A853] tracking-widest uppercase block mb-1">
                          Informe de Elevación — Mapa de Brechas
                        </span>
                        <div className="space-y-3">
                          {elev.gaps.map((g, idx) => (
                            <div key={idx}>
                              <div className="flex justify-between text-xs mb-1 flex-wrap gap-1">
                                <span className="text-[#9A8F82]">{g.label}</span>
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
                          Plan de Estudio Hyper-Leap
                        </span>
                        <div className="space-y-2">
                          {elev.studyPlan.map((s, idx) => (
                            <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-white/5 rounded-xl border border-[#D4A853]/8">
                              <span className="text-[#D4A853] font-bold text-xs flex-shrink-0">{s.step}</span>
                              <div>
                                <span className="text-white block font-bold text-xs">{s.title}</span>
                                <span className="text-xs text-[#9A8F82] leading-relaxed block mt-0.5">{s.desc}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-[#D4A853]/15 pt-4">
                        <span className="font-mono text-[10px] text-[#D4A853] tracking-widest uppercase block mb-3">
                          Artículos Prioritarios (Cierre de Brechas)
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
                                  <p className="text-xs text-[#9A8F82] mt-1 line-clamp-2">{art.summary}</p>
                                )}
                              </div>
                              <span className="text-xs text-[#D4A853] font-bold mt-2">
                                {expandedArticle === art.num ? "Colapsar ↑" : "Leer →"}
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
                        className="px-4 py-2 border border-white/10 text-xs text-[#9A8F82] hover:text-white cursor-pointer uppercase font-mono rounded-xl transition-colors"
                      >
                        Reiniciar
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
                              semantic_divergence_pct: semanticDivergence,
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
                        Exportar Nodo IP ↓
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const ipPayload = {
                            id: `${activeChallenge.id}-${Date.now()}`,
                            title: activeChallenge.title,
                            thesis: hlInput,
                            antithesis: activeChallenge.concepts[0]?.description ?? "",
                            synthesis: activeChallenge.concepts.map(c => c.title).join("; "),
                            domain: (CHALLENGE_ELEVATIONS[activeChallenge.id] || CHALLENGE_ELEVATIONS.saas_asia).gaps[0]?.label.replace(" Gap", "") ?? "Conversion Architecture",
                            confidence: Math.round(((coverageScore ?? 0) + (quizScore ?? 0)) / 2),
                            tags: hlSelectedOptions.map(i => activeChallenge.frictionOptions[i]),
                            sourceContext: activeChallenge.metrics,
                          };
                          try {
                            const res = await fetch('/api/ip-package', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(ipPayload),
                            });
                            const data = await res.json();
                            if (data.ok) {
                              alert(`✓ Nodo IP certificado e inyectado en la base de datos. ID: ${data.id}`);
                            } else {
                              alert(`⚠ Paquete IP enviado pero la DB no está configurada aún: ${data.error || 'No ip_nodes table'}`);
                            }
                          } catch {
                            alert('⚠ El endpoint del Pipeline IP no está activo aún — exporta JSON en su lugar.');
                          }
                        }}
                        className="px-4 py-2 border border-[#A855F7]/25 text-xs text-[#A855F7] hover:bg-[#A855F7]/5 cursor-pointer uppercase font-mono rounded-xl transition-colors"
                      >
                        Certificar Nodo IP →
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
                          alert("✓ Conceptos absorbidos. Radar actualizado.");
                        }}
                        className="px-4 py-2 bg-[#5C9A6B]/10 border border-[#5C9A6B]/30 text-[#5C9A6B] text-xs font-bold uppercase tracking-wider cursor-pointer font-mono rounded-xl transition-colors hover:bg-[#5C9A6B]/20 ml-auto"
                      >
                        Absorber Conceptos
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* RIGHT: Radar + Quiz */}
            <div className="xl:col-span-4 space-y-4">

              {/* Cognitive Gap Map — Feature 8 */}
              <div className={`border bg-[#110F0D] p-5 rounded-2xl transition-all duration-500 ${
                hlActive && coverageScore !== null ? "border-[#D4A853]/40 shadow-[0_0_20px_rgba(212,168,83,0.08)]" : "border-[#D4A853]/15"
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs text-[#D4A853]/40 tracking-widest uppercase">
                    03 — Mapa de Brechas Cognitivas
                  </span>
                  {hlActive && coverageScore !== null && (
                    <span className="font-mono text-[9px] text-[#5C9A6B] border border-[#5C9A6B]/25 px-2 py-0.5 rounded-full bg-[#5C9A6B]/5 animate-pulse">
                      Feed en Directo
                    </span>
                  )}
                </div>
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
                        <text key={d.name} x={lx} y={ly + 4} fill="#9A8F82" fontSize="8" fontFamily="monospace" textAnchor={anchor}>
                          {d.name.split(" ")[0]}
                        </text>
                      );
                    })}
                  </svg>
                </div>
                <div className="mt-4 space-y-1.5 border-t border-[#D4A853]/8 pt-3">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="text-[#D4A853] uppercase tracking-wider font-bold text-[10px]">Conceptos Dominados</span>
                    <span className="text-white font-bold bg-[#D4A853]/10 px-2 py-0.5 rounded-full border border-[#D4A853]/20 text-[10px]">{conceptsMastered}</span>
                  </div>
                  {radarDomains.map(d => (
                    <div key={d.name} className="space-y-0.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#9A8F82] truncate mr-2">{d.name}</span>
                        <span className="text-[#D4A853] flex-shrink-0 font-mono">{d.score}</span>
                      </div>
                      <div className="h-[2px] bg-black/40 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#D4A853]/50" style={{ width: `${d.score}%` }} />
                      </div>
                    </div>
                  ))}
                  {hlActive && semanticDivergence !== null && (
                    <div className="border-t border-[#D4A853]/8 pt-2 mt-1">
                      <div className="flex justify-between text-[9px] font-mono">
                        <span className="text-[#A855F7]">Divergencia Semántica</span>
                        <span className="text-[#A855F7] font-bold">{semanticDivergence}%</span>
                      </div>
                      <p className="text-[8px] text-[#7A6F65] mt-0.5">Enfoque novedoso vs. análisis canónico</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Diagnostic Quiz */}
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-5 rounded-2xl space-y-3">
                <span className="font-mono text-xs text-[#D4A853]/40 tracking-widest uppercase">
                  04 — Diagnóstico Rápido
                </span>
                <div className="border border-[#D4A853]/8 bg-[#0A0908] p-3 rounded-xl">
                  <span className="text-[10px] text-[#D4A853] uppercase block mb-1">Escenario Activo</span>
                  <p className="text-xs text-[#9A8F82] leading-relaxed">{activeChallenge.quizQuestion}</p>
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
                          : "border-[#D4A853]/8 text-[#9A8F82] hover:border-[#D4A853]/25 hover:text-white"
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
                    {quizScore === 100 ? "✓ CORRECTO. " : "✗ INCORRECTO. "}
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
            className="grid grid-cols-1 xl:grid-cols-12 gap-5 relative z-10"
          >
            {/* LEFT: Draft Engine */}
            <div className="xl:col-span-8 space-y-4">
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-5 rounded-2xl">
                <span className="font-mono text-xs text-[#D4A853]/40 tracking-widest uppercase block mb-4">
                  01 — Motor de Borradores Socrático
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
                            : "border-[#2A2218] text-[#7A6F65] hover:text-[#9A8F82]"
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
                  <p className="text-xs text-[#9A8F82] leading-relaxed mt-1">
                    {activeArticle?.summary || "How to construct medical-grade landing page teardowns that demand high-ticket consulting responses."}
                  </p>
                </div>

                {/* 3 Drafts — lg:grid-cols-3 (safe: only activates at 1024px+ where sidebar+col is wide enough) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {activeDrafts.length > 0 ? (
                    activeDrafts.map((draft) => (
                      <div
                        key={draft.id}
                        onClick={() => handleSelectDraft(draft.draft_number)}
                        className={`p-4 border rounded-xl transition-all cursor-pointer flex flex-col justify-between min-h-[180px] overflow-hidden ${
                          selectedDraftId === draft.draft_number
                            ? "bg-[#D4A853]/5 border-[#D4A853]/40"
                            : "bg-[#110F0D]/20 border-[#2A2218] hover:border-[#D4A853]/25"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-mono text-xs text-[#D4A853] tracking-wider uppercase">
                              Draft 0{draft.draft_number}
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
                          <InlineMarkdown text={draft.content} className="text-xs text-[#9A8F82] leading-relaxed font-mono" />
                        </div>
                        <div className="pt-3 border-t border-[#2A2218] flex justify-between items-center mt-3">
                          <span className="text-xs font-mono text-[#9A8F82] uppercase truncate mr-2">
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
                        className={`p-4 border rounded-xl transition-all cursor-pointer flex flex-col justify-between min-h-[180px] overflow-hidden ${
                          selectedDraftId === num
                            ? "bg-[#D4A853]/5 border-[#D4A853]/40"
                            : "bg-[#110F0D]/20 border-[#2A2218] hover:border-[#D4A853]/25"
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="font-mono text-xs text-[#D4A853] tracking-wider uppercase block mb-2">Draft 0{num}</span>
                          <p className="text-xs text-[#9A8F82] leading-relaxed font-mono">
                            {num === 1
                              ? "Focus on high-ticket conversion friction. Highlight visual deficits adjacent to key click triggers."
                              : num === 2
                              ? "Analyze cognitive load constraints using the Fogg Behavior Model. Detail latency thresholds."
                              : "Utilize high-status contrast phrasing, avoiding consulting clichés to establish immediate authority."
                            }
                          </p>
                        </div>
                        <div className="pt-3 border-t border-[#2A2218] flex justify-between items-center mt-3">
                          <span className="text-xs font-mono text-[#9A8F82] uppercase truncate mr-2">
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
                      <label className="font-mono text-xs text-[#D4A853]/60 tracking-wider uppercase block">
                        Notas de Refinamiento Socrático
                      </label>
                      <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Especifica por qué estos argumentos se alinean con tu modelo de divergencia..."
                        className="w-full bg-[#0A0908] border border-[#2A2218] focus:border-[#D4A853] focus:outline-none p-3 text-xs font-mono rounded-xl h-20 text-[#F5F0EB] resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDraftId(null)}
                          className="px-4 py-2 border border-[#2A2218] text-xs font-mono text-[#7A6F65] hover:text-[#9A8F82] cursor-pointer rounded-xl"
                        >
                          Limpiar
                        </button>
                        <button
                          type="button"
                          onClick={submitSocraticPreference}
                          className="px-4 py-2 bg-[#D4A853] text-[#0A0908] text-xs font-mono font-bold uppercase tracking-wider cursor-pointer rounded-xl"
                        >
                          Reforzar Ponderaciones
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* RIGHT: Debate Flow + Engine Config */}
            <div className="xl:col-span-4 space-y-4">

              {/* Dialectic Chain — spine-based, zero flex-row */}
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-5 rounded-2xl overflow-hidden">
                <span className="font-mono text-[10px] text-[#D4A853]/40 tracking-[0.3em] uppercase block mb-5">
                  02 — Cadena Dialéctica
                </span>
                <div className="relative">
                  {/* Spine */}
                  <div className="absolute left-[6px] top-3 bottom-3 w-px bg-gradient-to-b from-[#D4A853]/40 via-[#D4A853]/10 to-[#5C9A6B]/40" />

                  {/* Node: Thesis */}
                  <div className="relative pl-7 mb-2">
                    <div className="absolute left-0 top-1 w-[13px] h-[13px] rounded-full border-2 border-[#D4A853] bg-[#110F0D]" />
                    <div className="font-mono text-[10px] text-[#D4A853] uppercase mb-0.5">Product Strategist</div>
                    <div className="font-mono text-[10px] text-[#D4A853]/40 mb-1.5">Arg 01</div>
                    <p className="text-xs text-[#9A8F82] leading-relaxed">
                      Funnel requires card reduction to minimize decision fatigue on checkout.
                    </p>
                  </div>

                  {/* Relation label */}
                  <div className="relative pl-7 mb-2">
                    <div className="absolute left-[2px] top-0.5 font-mono text-[9px] text-[#7A6F65]">↓</div>
                    <span className="font-mono text-[9px] text-[#7A6F65] uppercase">contradice</span>
                  </div>

                  {/* Node: Anti-thesis */}
                  <div className="relative pl-7 mb-2">
                    <div className="absolute left-0 top-1 w-[13px] h-[13px] rounded-full border-2 border-[#C85C5C] bg-[#110F0D]" />
                    <div className="font-mono text-[10px] text-[#C85C5C] uppercase mb-0.5">Behavioral Scientist</div>
                    <div className="font-mono text-[10px] text-[#C85C5C]/40 mb-1.5">Pivot 02</div>
                    <p className="text-xs text-[#9A8F82] leading-relaxed">
                      Card reduction fails if value is undefined. Calculator slider builds habit loop first.
                    </p>
                  </div>

                  {/* Relation label */}
                  <div className="relative pl-7 mb-2">
                    <div className="absolute left-[2px] top-0.5 font-mono text-[9px] text-[#5C9A6B]">↓</div>
                    <span className="font-mono text-[9px] text-[#5C9A6B] uppercase">sintetiza</span>
                  </div>

                  {/* Node: Synthesis */}
                  <div className="relative pl-7">
                    <div className="absolute left-0 top-1 w-[13px] h-[13px] rounded-full border-2 border-[#5C9A6B] bg-[#110F0D]" />
                    <div className="font-mono text-[10px] text-[#5C9A6B] uppercase mb-0.5">Linguistic Architect</div>
                    <div className="font-mono text-[10px] text-[#5C9A6B]/40 mb-1.5">Synthesis 03</div>
                    <p className="text-xs text-[#9A8F82] leading-relaxed">
                      Frame calculator as interactive tool: user isolates value, removing billing anxiety.
                    </p>
                  </div>
                </div>
              </div>

              {/* Engine Config */}
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-5 rounded-2xl space-y-4">
                <h3 className="font-mono text-xs text-[#D4A853]/40 tracking-widest uppercase">Configuración del Motor Socrático</h3>
                <div className="space-y-2 text-xs">
                  {[
                    { label: "Agentes Activos", value: "3 (Estratega, Científico, Arquitecto)" },
                    { label: "KB Version", value: "v3.4.0" },
                    { label: "Índice Socrático", value: "96.8 / 100" },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between gap-2">
                      <span className="text-[#9A8F82] flex-shrink-0">{row.label}:</span>
                      <span className="text-white text-right">{row.value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#9A8F82] leading-relaxed pt-2 border-t border-[#D4A853]/8">
                  El Motor de Borradores Socrático sintetiza múltiples perspectivas de expertos para construir documentos de análisis de conversión de alto estatus.
                </p>
              </div>

              {/* Mastery Index */}
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-5 rounded-2xl space-y-3">
                <span className="font-mono text-xs text-[#D4A853]/40 tracking-widest uppercase block">Índice de Maestría</span>
                {DOMAINS.map((d) => (
                  <div key={d.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#9A8F82] truncate mr-2">{d.name}</span>
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
