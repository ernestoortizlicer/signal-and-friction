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
      { title: "Concept 1: Inline Tax Ingestion Fatigue (Cognitive Load)", description: "Forcing B2B users to input tax numbers during checkout increases processing latency. Deferring tax verification post-checkout boosts rates by 22%." },
      { title: "Concept 2: Seat Expansion Transparency (Pricing Logic)", description: "Users exit if they cannot visualize the exact monthly invoice change. Inline invoice calculation simulators solve seat billing anxiety." }
    ],
    quizQuestion: "Corporate designers upgrade checkout dropoff is 80%. They must fill tax details, credit card, and invite 3 team members before paying. Isolate main friction.",
    quizAnswers: [
      "Cognitive Load: High task density before commitment",
      "Value Deficit: Designers do not see value of seats",
      "Trust Deficit: Concern over card security sharing"
    ],
    quizExplanation: "Cognitive Load. Forcing user to invite teammates and complete tax forms before completing payment creates high cognitive barrier."
  },
  {
    id: "vercel",
    title: "Vercel Analytics Opt-in Drop",
    metrics: "Telemetry opt-in popup triggers 70% bounce rate on first visit.",
    context: "The banner says: 'Allow us to gather usage optimization metrics to train analytics models'.",
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
    id: "saas_asia",
    title: "$50M SaaS Company Asian Expansion Collapse",
    metrics: "Conversion drops by 60% on Singapore/Japan local checkouts. User dropoff occurs at pricing plan confirmation (4.2 minutes average latency).",
    context: "Client is a US-based CRM platform. They localized languages but payments are settled in USD with standard US credit card validation structures.",
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
      {
        num: 1,
        category: "Cognitive Load",
        categoryColor: "text-[#C85C5C]",
        title: "Mobile Form Friction & Fogg Behavioral Optimization",
        summary: "Reducing task effort in onboarding pages for high-friction mobile environments.",
        body: "When operating in mobile environments with high latency (e.g., 3G network), any minor task increase (like switching screens or waiting for SMS codes) causes user drop-off. By optimizing form fields, reducing input requirements, and designing simple inline instructions, SaaS platforms can increase their mobile signup completion rates by up to 45%."
      },
      {
        num: 2,
        category: "Behavior",
        categoryColor: "text-[#D4A853]",
        title: "SMS Gateway Resilience Protocols in Developing Markets",
        summary: "Handling delayed OTP verification codes using local transactional SMS routes.",
        body: "Delayed OTP codes lead to users clicking 'Resend' repeatedly, compounding gateway queues. Implementing smart client-side countdowns and choosing top-tier regional SMS aggregators (e.g., Twilio local routes) prevents activation failure."
      },
      {
        num: 3,
        category: "Trust",
        categoryColor: "text-[#D4A853]",
        title: "Linguistic Trust Signals & Hyper-Localized Copywriting",
        summary: "How translation nuances impact perceived security and status in localized apps.",
        body: "Literal translations lack local authority and breed trust deficits. Collaborating with local copywriters to use regional idioms for critical trust-building actions (like billing permissions) dramatically improves conversion."
      }
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
      {
        num: 1,
        category: "Cognitive Load",
        categoryColor: "text-[#D4A853]",
        title: "B2B Checkout Optimization & Deferring Tax Friction",
        summary: "Why demanding corporate tax ID numbers during checkout increases cart abandonment.",
        body: "Demanding VAT/EIN registration numbers mid-checkout forces corporate buyers to search internal documents, increasing checkout time and exit rates. Moving tax profile verification to the post-purchase setup increases immediate conversion by 22%."
      },
      {
        num: 2,
        category: "Pricing",
        categoryColor: "text-[#5C9A6B]",
        title: "Seat-Based Pricing Models & Invoice Simulator Widgets",
        summary: "Using interactive widgets to clear ambiguity in high-ticket SaaS pricing expansion.",
        body: "Pricing expansion anxiety occurs when corporate buyers fear hidden charges. Renders of clear, real-time calculations showing price changes per seat addition build confidence and lead to 30% larger average order sizes."
      },
      {
        num: 3,
        category: "Trust",
        categoryColor: "text-[#D4A853]",
        title: "Enterprise Trust Signals & Corporate Card Authorization Rates",
        summary: "Minimizing bank declines and authorization errors for high-value B2B transactions.",
        body: "High-value corporate card transactions face aggressive fraud checking. Using Stripe Radar, 3D Secure, and clear merchant category codes prevents false declines and provides an elegant fallback path."
      }
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
      {
        num: 1,
        category: "Value Deficit",
        categoryColor: "text-[#C85C5C]",
        title: "Reciprocity Principle & Value Offsets in Opt-in Flows",
        summary: "Designing mutual-benefit exchanges to bypass user data privacy walls.",
        body: "Asking for user telemetry without an immediate reciprocal benefit leads to automatic opt-out. Offering clear advantages (such as performance upgrades or localized caching) increases consent rates by up to 35%."
      },
      {
        num: 2,
        category: "Trust Deficit",
        categoryColor: "text-[#D4A853]",
        title: "Privacy-First Analytics Telemetry & Data Sovereignty",
        summary: "Gaining technical developer trust through cryptographic transparency.",
        body: "Developers are highly suspicious of telemetry trackers. Demonstrating that all ingested data points are salted and hashed client-side, with full adherence to GDPR, removes corporate liability fears."
      },
      {
        num: 3,
        category: "Copywriting",
        categoryColor: "text-[#D4A853]",
        title: "Micro-Copy Teardown: Designing Frictionless Consent Elements",
        summary: "How micro-copy adjustments change user perception from 'spying' to 'optimizing'.",
        body: "Words matter. Shifting consent banner text from passive telemetry-oriented tracking jargon to active user-performance enhancements alters the cognitive frame from defense to cooperation."
      }
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
      {
        num: 1,
        category: "Tax",
        categoryColor: "text-[#C85C5C]",
        title: "Tax-Free Reinvestment & PASS-Through LLCs in SE Asia",
        summary: "Structuring holding companies under Singapore FSI-S and Section 13(1)(a) tax exemption frameworks for reinvesting SaaS profits.",
        body: "By establishing a Singapore Private Limited (Pte. Ltd.) holding structure, founders access a single-tier territorial tax system. Under Section 13(1)(a) of the Income Tax Act, foreign-sourced service income received in Singapore is fully tax-exempt if the source country corporate tax rate is at least 15%."
      },
      {
        num: 2,
        category: "Law",
        categoryColor: "text-[#D4A853]",
        title: "SaaS Compliance Protocols under SG MAS Guidelines",
        summary: "Mastering technology risk management (TRM) and outsourcing directives defined by the Monetary Authority of Singapore.",
        body: "SaaS architectures operating in Singapore that serve fintechs, financial consultancies, or handle high-frequency payment rails fall within the advisory scope of the Monetary Authority of Singapore (MAS) Guidelines on Outsourcing and Technology Risk Management (TRM)."
      },
      {
        num: 3,
        category: "Checkout",
        categoryColor: "text-[#D4A853]",
        title: "Cross-Border Payment Friction: Optimizing Local Checkout Rates",
        summary: "Resolving regional gateway latency, currency mismatches, and credit card decline codes by using local acquiring endpoints.",
        body: "Cross-border credit card settlement is one of the most common causes of silent conversion leakage. Routing transactions through local merchant acquiring banks (e.g. DBS/UOB in Singapore, Sumitomo Mitsui in Japan) achieves a 98%+ authorization rate."
      }
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
  const [activeTab, setActiveTab] = useState<'socratic' | 'hyper_leap'>('socratic');
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
        dataDrafts.forEach((d: Draft) => {
          if (d.rating) {
            initialRatings[d.id] = d.rating;
          }
        });
        setRatings(initialRatings);

        if (dataArticles.length > 0 && !selectedArticleSlug) {
          setSelectedArticleSlug(dataArticles[0].slug);
        }
      } catch (err) {
        console.error("Error loading learning dashboard data", err);
      }
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedArticleSlug]);

  const activeArticle = articles.find(a => a.slug === selectedArticleSlug) || articles[0];
  const activeDrafts = drafts.filter(d => d.article_slug === selectedArticleSlug);

  const activeChallenge = CASE_STUDIES.find(c => c.id === selectedChallengeId) || CASE_STUDIES[0];

  const handleSelectDraft = (draftNumber: number) => {
    setSelectedDraftId(draftNumber);
  };

  const handleRating = async (draftId: string, rating: number) => {
    setRatings(prev => ({ ...prev, [draftId]: rating }));
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${supabaseUrl}/rest/v1/education_drafts?id=eq.${draftId}`, {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ rating })
      });
      if (!res.ok) throw new Error("Failed to update rating in DB");
    } catch (err) {
      console.error("Error saving draft rating:", err);
    }
  };

  const submitSocraticPreference = async () => {
    if (!selectedDraftId) return;
    const targetDraft = activeDrafts.find(d => d.draft_number === selectedDraftId);
    if (!targetDraft) return;

    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${supabaseUrl}/rest/v1/education_drafts?id=eq.${targetDraft.id}`, {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          feedback: feedbackText
        })
      });
      if (!res.ok) throw new Error("Failed to save feedback");
      alert(`✓ Selection Confirmed: You selected Draft ${selectedDraftId} arguments. Reinforcing AI weights...`);
      setFeedbackText("");
      setSelectedDraftId(null);
    } catch (err) {
      console.error("Error saving draft feedback:", err);
    }
  };

  const checkQuiz = (answerIdx: number) => {
    setSelectedAnswer(answerIdx);
    if (answerIdx === 1) {
      setQuizScore(100);
    } else {
      setQuizScore(0);
    }
  };

  const radarWidth = 260;
  const radarHeight = 260;
  const cx = radarWidth / 2;
  const cy = radarHeight / 2;
  const r = 80;

  const getCoordinates = (index: number, score: number) => {
    const angle = (index * 2 * Math.PI) / radarDomains.length - Math.PI / 2;
    const value = score / 100;
    const x = cx + r * value * Math.cos(angle);
    const y = cy + r * value * Math.sin(angle);
    return { x, y };
  };

  const getWebCoordinates = (index: number, level: number) => {
    const angle = (index * 2 * Math.PI) / radarDomains.length - Math.PI / 2;
    const value = level / 4;
    const x = cx + r * value * Math.cos(angle);
    const y = cy + r * value * Math.sin(angle);
    return { x, y };
  };

  const scorePoints = radarDomains.map((d, i) => {
    const coords = getCoordinates(i, d.score);
    return `${coords.x},${coords.y}`;
  }).join(" ");

  return (
    <div className="min-h-screen bg-[#0A0908] text-[#F5F0EB] p-6 space-y-8 font-mono relative overflow-x-hidden">

      {/* Background Grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(212,168,83,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,83,0.02) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#D4A853]/15 pb-4 relative z-10">
        <div>
          <span className="font-mono text-xs text-[#D4A853]/40 tracking-[0.4em] uppercase block">
            Eminence System
          </span>
          <h1 className="text-3xl font-bold tracking-tight">
            Ernesto&apos;s Socratic <span className="text-[#D4A853] glow-text">Learning Command</span>
          </h1>
        </div>
        <span className="font-mono text-xs uppercase tracking-widest text-[#D4A853] border border-[#D4A853]/25 px-3 py-1 rounded-full bg-[#D4A853]/5">
          Eminence Route Active
        </span>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-[#D4A853]/10 gap-8 relative z-10">
        <button
          onClick={() => setActiveTab('socratic')}
          className={`pb-4 font-mono text-xs uppercase tracking-widest border-b-2 transition-all duration-300 cursor-pointer ${
            activeTab === 'socratic' ? "border-[#D4A853] text-[#D4A853]" : "border-transparent text-[#7A6F65] hover:text-[#9A8F82]"
          }`}
        >
          Socratic Drafts &amp; Debates
        </button>
        <button
          onClick={() => setActiveTab('hyper_leap')}
          className={`pb-4 font-mono text-xs uppercase tracking-widest border-b-2 transition-all duration-300 cursor-pointer relative ${
            activeTab === 'hyper_leap' ? "border-[#D4A853] text-[#D4A853]" : "border-transparent text-[#7A6F65] hover:text-[#9A8F82]"
          }`}
        >
          Hyper-Leap Cognitive Challenges
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'socratic' ? (
          <motion.div
            key="socratic"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 xl:grid-cols-12 gap-8 relative z-10"
          >
            {/* Left: Drafts engine */}
            <div className="xl:col-span-8 space-y-6">
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-6 rounded-2xl glow-border">
                <span className="font-mono text-xs text-[#D4A853]/40 tracking-widest uppercase block mb-3">
                  01 — Socratic Draft Engine
                </span>

                {/* Article Selector */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-thin">
                  {articles.length === 0 ? (
                    <button className="px-4 py-2 text-xs font-mono border border-[#D4A853] bg-[#D4A853]/10 text-[#D4A853] rounded-md">
                      Socratic Funnel Diagnostics
                    </button>
                  ) : (
                    articles.map(article => (
                      <button
                        key={article.id}
                        onClick={() => { setSelectedArticleSlug(article.slug); setSelectedDraftId(null); }}
                        className={`px-4 py-2 text-xs font-mono border rounded-md transition-all duration-300 flex-shrink-0 cursor-pointer ${
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

                {/* Article Details */}
                {activeArticle ? (
                  <div className="mb-6 space-y-2 border-l-2 border-[#D4A853]/30 pl-4 py-1">
                    <h2 className="text-lg font-bold font-mono text-white">{activeArticle.title}</h2>
                    <p className="text-sm text-[#9A8F82] leading-relaxed max-w-2xl font-mono">{activeArticle.summary}</p>
                  </div>
                ) : (
                  <div className="mb-6 space-y-2 border-l-2 border-[#D4A853]/30 pl-4 py-1">
                    <h2 className="text-lg font-bold font-mono text-white">Socratic Funnel Diagnostics</h2>
                    <p className="text-sm text-[#9A8F82] leading-relaxed max-w-2xl font-mono">How to construct medical-grade landing page teardowns that demand high-ticket consulting responses.</p>
                  </div>
                )}

                {/* 3 Drafts Side-By-Side */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                  {activeDrafts.length > 0 ? (
                    activeDrafts.map((draft) => (
                      <div
                        key={draft.id}
                        onClick={() => handleSelectDraft(draft.draft_number)}
                        className={`p-4 border rounded-xl transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[200px] overflow-hidden ${
                          selectedDraftId === draft.draft_number
                            ? "bg-[#D4A853]/5 border-[#D4A853]/40"
                            : "bg-[#110F0D]/20 border-[#2A2218] hover:border-[#D4A853]/25"
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-mono text-xs text-[#D4A853] tracking-wider uppercase">
                              Draft 0{draft.draft_number}
                            </span>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(star => (
                                <span
                                  key={star}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRating(draft.id, star);
                                  }}
                                  className={`text-xs cursor-pointer transition-colors ${
                                    star <= (ratings[draft.id] || 0) ? "text-[#D4A853]" : "text-[#7A6F65]"
                                  }`}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                          <InlineMarkdown text={draft.content} className="text-sm text-[#9A8F82] leading-relaxed font-mono" />
                        </div>

                        <div className="pt-3 border-t border-[#2A2218] flex justify-between items-center mt-3">
                          <span className="text-xs font-mono text-[#9A8F82] uppercase">
                            {draft.draft_number === 1 ? "Product Strategist" : draft.draft_number === 2 ? "Behavioral Scientist" : "Linguistic Architect"}
                          </span>
                          <div className={`w-3 h-3 rounded-full border ${
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
                        className={`p-4 border rounded-xl transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[200px] overflow-hidden ${
                          selectedDraftId === num
                            ? "bg-[#D4A853]/5 border-[#D4A853]/40"
                            : "bg-[#110F0D]/20 border-[#2A2218] hover:border-[#D4A853]/25"
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-mono text-xs text-[#D4A853] tracking-wider uppercase">
                              Draft 0{num}
                            </span>
                          </div>
                          <p className="text-sm text-[#9A8F82] leading-relaxed font-mono">
                            {num === 1
                              ? "Focus on high-ticket conversion friction. Highlight visual deficits adjacent to key click triggers."
                              : num === 2
                              ? "Analyze cognitive load constraints using the Fogg Behavior Model. Detail latency thresholds."
                              : "Utilize high-status contrast phrasing, avoiding consulting clichés to establish immediate authority."
                            }
                          </p>
                        </div>
                        <div className="pt-3 border-t border-[#2A2218] flex justify-between items-center mt-3">
                          <span className="text-xs font-mono text-[#9A8F82] uppercase">
                            {num === 1 ? "Product Strategist" : num === 2 ? "Behavioral Scientist" : "Linguistic Architect"}
                          </span>
                          <div className={`w-3 h-3 rounded-full border ${
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
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="space-y-4 border-t border-[#D4A853]/15 pt-4"
                    >
                      <div>
                        <label className="font-mono text-xs text-[#D4A853]/60 tracking-wider uppercase block mb-1">
                          Socratic Refinement Notes &amp; Selected Arguments
                        </label>
                        <textarea
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder="Specify why these arguments align with your divergence model, or detail concept changes..."
                          className="w-full bg-[#0A0908] border border-[#2A2218] focus:border-[#D4A853] focus:outline-none p-3 text-xs font-mono rounded-md h-20 text-[#F5F0EB]"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedDraftId(null)}
                          className="px-4 py-2 border border-[#2A2218] text-xs font-mono text-[#7A6F65] hover:text-[#9A8F82] cursor-pointer rounded-md"
                        >
                          Clear Selection
                        </button>
                        <button
                          onClick={submitSocraticPreference}
                          className="px-4 py-2 bg-[#D4A853] text-[#0A0908] text-xs font-mono font-bold uppercase tracking-wider transition-colors hover:bg-[#E8C97A] cursor-pointer rounded-md"
                        >
                          Reinforce Socratic weights
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Socratic Debate Node Graph */}
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-6 rounded-2xl">
                <span className="font-mono text-xs text-[#D4A853]/40 tracking-widest uppercase block mb-4">
                  02 — Live Socratic Debate Node Flow
                </span>
                <div className="border border-[#D4A853]/5 bg-[#110F0D]/10 p-5 rounded-xl space-y-4">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Agent node 1 */}
                    <div className="border border-[#D4A853]/25 bg-[#0A0908] p-3 rounded-xl w-full md:w-1/3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs text-[#D4A853]">Product Strategist</span>
                        <span className="text-xs font-mono text-[#5C9A6B]">Argument 01</span>
                      </div>
                      <p className="text-xs text-[#9A8F82] font-mono">
                        Funnel requires card reduction to minimize decision fatigue on checkout.
                      </p>
                    </div>

                    <div className="hidden md:block text-[#D4A853]/40 text-xs font-mono select-none">
                      ──[Contradicts]──&gt;
                    </div>

                    {/* Agent node 2 */}
                    <div className="border border-[#C85C5C]/20 bg-[#C85C5C]/5 p-3 rounded-xl w-full md:w-1/3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs text-[#C85C5C]">Behavioral Scientist</span>
                        <span className="text-xs font-mono text-[#C85C5C]">Pivot 02</span>
                      </div>
                      <p className="text-xs text-[#9A8F82] font-mono">
                        Card reduction fails if value is undefined. Calculator slider builds habit loop first.
                      </p>
                    </div>

                    <div className="hidden md:block text-[#D4A853]/40 text-xs font-mono select-none">
                      ──[Synthesizes]──&gt;
                    </div>

                    {/* Agent node 3 */}
                    <div className="border border-[#5C9A6B]/20 bg-[#5C9A6B]/5 p-3 rounded-xl w-full md:w-1/3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs text-[#5C9A6B]">Linguistic Architect</span>
                        <span className="text-xs font-mono text-[#5C9A6B]">Synthesis 03</span>
                      </div>
                      <p className="text-xs text-[#9A8F82] font-mono">
                        Frame calculator as an interactive tool: user isolates value, removing billing anxiety.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Engine Config + Mastery Index */}
            <div className="xl:col-span-4 space-y-6">
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-6 rounded-2xl space-y-4">
                <h3 className="font-serif text-lg text-white border-b border-[#D4A853]/10 pb-2">Socratic Engine Config</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#9A8F82]">Active Agents:</span>
                    <span className="text-white">3 (Strategist, Scientist, Architect)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9A8F82]">Knowledge Base Version:</span>
                    <span className="text-white">v3.4.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9A8F82]">Socratic Feedback Index:</span>
                    <span className="text-[#D4A853]">96.8 / 100</span>
                  </div>
                </div>
                <p className="text-xs text-[#9A8F82] leading-relaxed pt-2 border-t border-[#D4A853]/8">
                  The Socratic Draft Engine synthesizes multiple expert viewpoints to construct high-status conversion analysis documents.
                </p>
              </div>

              {/* Mastery Index */}
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-6 rounded-2xl space-y-4">
                <span className="font-mono text-xs text-[#D4A853]/40 tracking-widest uppercase block">
                  Mastery Index
                </span>
                <div className="space-y-3">
                  {DOMAINS.map((d) => (
                    <div key={d.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#9A8F82]">{d.name}</span>
                        <span className="text-[#D4A853]">{d.score}%</span>
                      </div>
                      <div className="h-1 bg-[#1A1815] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#D4A853] rounded-full"
                          style={{ width: `${d.score}%`, opacity: 0.6 + d.score / 500 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-[#D4A853]/8 pt-3 flex justify-between items-center text-xs">
                  <span className="text-[#9A8F82]">Overall Mastery</span>
                  <span className="text-[#D4A853] font-bold">
                    {Math.round(DOMAINS.reduce((a, d) => a + d.score, 0) / DOMAINS.length)}%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="hyper_leap"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 xl:grid-cols-12 gap-8 relative z-10"
          >
            {/* Left: Challenge generation */}
            <div className="xl:col-span-8 space-y-6">
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-6 rounded-2xl glow-border">

                {/* Challenge picker header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="font-mono text-xs text-[#D4A853]/40 tracking-widest uppercase block mb-1">
                      Cognitive Challenge Selector
                    </span>
                    <h3 className="text-sm font-bold font-mono text-white">Select Socratic Case Study</h3>
                  </div>
                  <span className="font-mono text-xs uppercase tracking-wider text-[#C85C5C] border border-[#C85C5C]/25 px-2 py-0.5 rounded-full bg-[#C85C5C]/5">
                    Divergent Mode Active
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6 font-mono">
                  {CASE_STUDIES.map(cs => (
                    <button
                      key={cs.id}
                      type="button"
                      onClick={() => {
                        setSelectedChallengeId(cs.id);
                        setHlActive(false);
                        setHlInput("");
                        setHlSelectedOptions([]);
                      }}
                      className={`p-3 border rounded-xl text-left transition-all cursor-pointer ${
                        selectedChallengeId === cs.id
                          ? "border-[#D4A853] bg-[#D4A853]/5 text-white"
                          : "border-[#D4A853]/8 text-[#9A8F82] hover:border-[#D4A853]/25 hover:text-white"
                      }`}
                    >
                      <div className="text-xs font-bold leading-snug">{cs.title.split(":")[0]}</div>
                      <span className="text-xs text-[#9A8F82] block mt-1.5 uppercase">Load Case Study</span>
                    </button>
                  ))}
                </div>

                {/* Case Study Details */}
                <div className="space-y-4 font-mono">
                  <h3 className="text-lg font-bold text-white font-serif">{activeChallenge.title}</h3>
                  <div className="border border-[#D4A853]/10 bg-[#0A0908] p-4 rounded-xl text-xs leading-relaxed text-[#9A8F82] space-y-3">
                    <div>
                      <span className="text-[#D4A853] font-semibold block uppercase text-xs tracking-wider mb-1">Metrics Bottleneck:</span>
                      {activeChallenge.metrics}
                    </div>
                    <div className="border-t border-[#D4A853]/8 pt-2">
                      <span className="text-[#D4A853] font-semibold block uppercase text-xs tracking-wider mb-1">Environmental Context:</span>
                      {activeChallenge.context}
                    </div>
                  </div>

                  {!hlActive ? (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs text-[#9A8F82] uppercase tracking-wider block">
                          Isolate suspected friction mechanisms (Select all that apply):
                        </label>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
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
                                className={`p-2.5 text-xs text-left border rounded-xl transition-all cursor-pointer ${
                                  isSel ? "border-[#D4A853] bg-[#D4A853]/5 text-[#F5F0EB]" : "border-[#D4A853]/8 text-[#9A8F82] hover:border-white/10"
                                }`}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs text-[#9A8F82] uppercase tracking-wider block">
                          Formulate your clinical diagnostic hypothesis:
                        </label>
                        <textarea
                          value={hlInput}
                          onChange={(e) => setHlInput(e.target.value)}
                          placeholder="Write your diagnostic strategy. Focus on how technical constraints interact with behavioral friction..."
                          className="w-full bg-[#0A0908] border border-[#D4A853]/8 focus:border-[#D4A853] focus:outline-none p-3 text-xs rounded-md h-20 text-[#F5F0EB] font-mono"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setHlActive(true)}
                          disabled={!hlInput.trim() || hlSelectedOptions.length === 0}
                          className="w-full md:w-auto px-4 py-2.5 bg-[#D4A853] text-[#0A0908] text-xs font-mono font-bold uppercase tracking-wider transition-all hover:bg-[#E8C97A] active:scale-[0.98] disabled:opacity-30 disabled:scale-100 cursor-pointer rounded-md"
                        >
                          Execute Socratic Reverse-Reveal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4 border-t border-[#D4A853]/15 pt-4"
                    >
                      <div className="space-y-2">
                        <h4 className="text-xs text-[#5C9A6B] uppercase tracking-widest font-semibold">
                          ✓ Socratic Reverse-Reveal Complete
                        </h4>
                        <p className="text-xs text-[#9A8F82] leading-relaxed">
                          Your hypothesis focused on: <span className="text-white italic">&ldquo;{hlInput}&rdquo;</span>
                        </p>
                      </div>

                      {/* Retrospective reveal */}
                      <div className="space-y-3 border-l-2 border-[#D4A853]/30 pl-4 py-1">
                        {activeChallenge.concepts.map((concept, idx) => (
                          <div key={idx}>
                            <div className="text-xs text-[#D4A853] uppercase font-bold">{concept.title}</div>
                            <p className="text-sm text-[#9A8F82] leading-relaxed mt-0.5">
                              {concept.description}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Dynamic Elevation Content */}
                      {(() => {
                        const elev = CHALLENGE_ELEVATIONS[activeChallenge.id] || CHALLENGE_ELEVATIONS.saas_asia;
                        return (
                          <div className="mt-6 border border-[#D4A853]/25 bg-[#110F0D]/30 p-5 rounded-2xl space-y-6 relative overflow-hidden text-left">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4A853]/5 rounded-full filter blur-xl pointer-events-none" />

                            <div>
                              <span className="font-mono text-xs text-[#D4A853] tracking-widest uppercase block mb-1">
                                Elevation Report — Cognitive Gap Map
                              </span>
                              <h4 className="text-xs font-bold text-white font-mono uppercase mb-3">Identified Friction Divergences</h4>
                              <div className="space-y-4 font-mono">
                                {elev.gaps.map((g, idx) => (
                                  <div key={idx}>
                                    <div className="flex justify-between text-xs mb-1">
                                      <span className="text-[#9A8F82]">{g.label}</span>
                                      <span className={`${g.colorClass} font-bold`}>{g.target - g.current}% Remaining (Current: {g.current}% | Target: {g.target}%)</span>
                                    </div>
                                    <div className="w-full bg-white/5 h-1.5 rounded overflow-hidden">
                                      <div className={`bg-gradient-to-r ${g.barColor} h-full`} style={{ width: `${g.current}%` }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="border-t border-[#D4A853]/15 pt-4">
                              <span className="font-mono text-xs text-[#D4A853] tracking-widest uppercase block mb-3">
                                Personalized Hyper-Leap Study Plan
                              </span>
                              <div className="space-y-3 font-mono text-sm text-[#9A8F82]">
                                {elev.studyPlan.map((s, idx) => (
                                  <div key={idx} className="flex items-start gap-2.5 p-2 bg-white/5 rounded-md border border-[#D4A853]/8">
                                    <span className="text-[#D4A853] font-bold text-xs">{s.step}</span>
                                    <div>
                                      <span className="text-white block font-bold text-xs">{s.title}</span>
                                      <span className="leading-relaxed block mt-1">{s.desc}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="border-t border-[#D4A853]/15 pt-4">
                              <span className="font-mono text-xs text-[#D4A853] tracking-widest uppercase block mb-3">
                                Priority Educational Articles (Gap Closure)
                              </span>
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                                {elev.articles.map((art) => (
                                  <div
                                    key={art.num}
                                    className={`p-3 border rounded-xl flex flex-col justify-between min-h-[11rem] cursor-pointer transition-all ${
                                      expandedArticle === art.num ? "border-[#D4A853] bg-[#D4A853]/10" : "border-[#D4A853]/8 bg-[#0A0908] hover:border-[#D4A853]/25"
                                    }`}
                                    onClick={() => setExpandedArticle(expandedArticle === art.num ? null : art.num)}
                                  >
                                    <div>
                                      <span className={`font-mono text-xs ${art.categoryColor} uppercase block mb-1`}>Article 0{art.num} — {art.category}</span>
                                      <h5 className="text-xs font-bold text-white font-mono leading-snug">{art.title}</h5>
                                      {expandedArticle === art.num ? (
                                        <p className="text-sm text-[#F5F0EB] mt-1.5 leading-relaxed">{art.body}</p>
                                      ) : (
                                        <p className="text-xs text-[#9A8F82] mt-1.5 line-clamp-3">{art.summary}</p>
                                      )}
                                    </div>
                                    <span className="text-xs text-[#D4A853] font-bold mt-2">{expandedArticle === art.num ? "Collapse" : "Read Full Article →"}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setHlActive(false);
                            setHlInput("");
                            setHlSelectedOptions([]);
                            setExpandedArticle(null);
                          }}
                          className="px-4 py-2 border border-white/10 text-xs text-[#9A8F82] hover:text-white cursor-pointer uppercase font-mono rounded-md"
                        >
                          Reset Case Study
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
                            alert("✓ Concepts absorbed! Cognitive Radar Scores updated.");
                          }}
                          className="px-4 py-2 bg-[#5C9A6B]/10 border border-[#5C9A6B]/30 text-[#5C9A6B] text-xs font-bold uppercase tracking-wider transition-colors hover:bg-[#5C9A6B]/20 cursor-pointer font-mono rounded-md"
                        >
                          Absorb Theoretical Concepts
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Radar and Quiz */}
            <div className="xl:col-span-4 space-y-6">

              {/* Radar Chart */}
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-6 rounded-2xl flex flex-col items-center">
                <span className="font-mono text-xs text-[#D4A853]/40 tracking-widest uppercase block self-start mb-4">
                  03 — Cognitive Evolution Radar
                </span>
                <div className="relative overflow-x-auto max-w-full flex justify-center">
                  <svg width={radarWidth} height={radarHeight} className="overflow-visible flex-shrink-0">
                    {[1, 2, 3, 4].map((level) => {
                      const points = radarDomains.map((_, idx) => {
                        const coords = getWebCoordinates(idx, level);
                        return `${coords.x},${coords.y}`;
                      }).join(" ");
                      return (
                        <polygon
                          key={level}
                          points={points}
                          fill="none"
                          stroke="#D4A853"
                          strokeOpacity={0.06}
                          strokeWidth={1}
                        />
                      );
                    })}

                    {radarDomains.map((_, idx) => {
                      const end = getWebCoordinates(idx, 4);
                      return (
                        <line
                          key={idx}
                          x1={cx}
                          y1={cy}
                          x2={end.x}
                          y2={end.y}
                          stroke="#D4A853"
                          strokeOpacity={0.1}
                          strokeWidth={1}
                        />
                      );
                    })}

                    <polygon
                      points={scorePoints}
                      fill="url(#radarGlow)"
                      stroke="#D4A853"
                      strokeWidth={2}
                      style={{ filter: "drop-shadow(0 0 4px rgba(212, 168, 83, 0.3))" }}
                    />

                    {radarDomains.map((d, i) => {
                      const labelRadius = r + 24;
                      const angle = (i * 2 * Math.PI) / radarDomains.length - Math.PI / 2;
                      const labelX = cx + labelRadius * Math.cos(angle);
                      const labelY = cy + labelRadius * Math.sin(angle);
                      const isRight = Math.cos(angle) > 0.1;
                      const isLeft = Math.cos(angle) < -0.1;
                      const anchor = isRight ? "start" : isLeft ? "end" : "middle";

                      return (
                        <text
                          key={d.name}
                          x={labelX}
                          y={labelY + 4}
                          fill="#9A8F82"
                          fontSize="9"
                          fontFamily="monospace"
                          textAnchor={anchor}
                        >
                          {d.name.split(" ")[0]}
                        </text>
                      );
                    })}

                    <defs>
                      <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#D4A853" stopOpacity={0.05} />
                        <stop offset="100%" stopColor="#D4A853" stopOpacity={0.3} />
                      </radialGradient>
                    </defs>
                  </svg>
                </div>
                <div className="w-full mt-4 space-y-2 border-t border-[#D4A853]/5 pt-4">
                  <div className="flex justify-between items-center font-mono text-xs border-b border-[#D4A853]/10 pb-2 mb-2">
                    <span className="text-[#D4A853] uppercase tracking-wider font-bold">Concepts Mastered</span>
                    <span className="text-white font-bold bg-[#D4A853]/15 px-2 py-0.5 rounded-full border border-[#D4A853]/30">{conceptsMastered}</span>
                  </div>
                  {radarDomains.map(d => (
                    <div key={d.name} className="flex justify-between items-center font-mono text-xs">
                      <span className="text-[#9A8F82]">{d.name}</span>
                      <span className="text-[#D4A853]">{d.score}/100</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diagnostic Quiz */}
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-6 rounded-2xl space-y-4">
                <span className="font-mono text-xs text-[#D4A853]/40 tracking-widest uppercase block mb-1">
                  04 — Funnel Challenge Diagnostic
                </span>
                <div className="space-y-3 font-mono">
                  <div className="border border-[#D4A853]/5 bg-[#110F0D]/25 p-3 rounded-xl">
                    <span className="text-xs text-[#D4A853] uppercase tracking-wider block mb-1">Active Scenario</span>
                    <p className="text-xs text-[#9A8F82] leading-relaxed">
                      {activeChallenge.quizQuestion}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    {activeChallenge.quizAnswers.map((ans, idx) => (
                      <button
                        key={idx}
                        onClick={() => checkQuiz(idx)}
                        disabled={selectedAnswer !== null}
                        className={`w-full text-left p-3 text-xs border rounded-xl transition-all cursor-pointer ${
                          selectedAnswer === idx
                            ? idx === 1
                              ? "bg-[#5C9A6B]/10 border-[#5C9A6B]/30 text-[#5C9A6B]"
                              : "bg-[#C85C5C]/10 border-[#C85C5C]/30 text-[#C85C5C]"
                            : "border-[#D4A853]/8 text-[#9A8F82] hover:border-[#D4A853]/25 hover:text-white"
                        }`}
                      >
                        {ans}
                      </button>
                    ))}
                  </div>

                  {quizScore !== null && (
                    <div className={`p-2.5 border text-xs leading-relaxed rounded-xl ${
                      quizScore === 100 ? "bg-[#5C9A6B]/5 border-[#5C9A6B]/20 text-[#5C9A6B]" : "bg-[#C85C5C]/5 border-[#C85C5C]/20 text-[#C85C5C]"
                    }`}>
                      {quizScore === 100
                        ? `✓ CORRECT. ${activeChallenge.quizExplanation}`
                        : `✗ INCORRECT. ${activeChallenge.quizExplanation}`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
