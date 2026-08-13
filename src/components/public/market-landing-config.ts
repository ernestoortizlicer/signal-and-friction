import type { ScanFunnelOption, ScanFunnelStep } from "@/components/ScanFunnelCard";

export const LANDING_STEPS: ScanFunnelStep[] = [
  { id: 1, code: "CTX.URL", label: "Target", desc: "Enter the product or funnel URL you want reviewed" },
  { id: 2, code: "CTX.SIG", label: "Observed situation", desc: "Where does the problem appear to show up?" },
  { id: 3, code: "OFR.MOD", label: "Delivery mode", desc: "Who should execute after the diagnosis?" },
  { id: 4, code: "CTX.FIT", label: "Operating context", desc: "Give us one constraint that changes how the work should be scoped" },
  { id: 5, code: "INTAKE", label: "Review request", desc: "Confirm urgency and where we should send the next step" },
];

export const LANDING_FUNNEL_OPTIONS: ScanFunnelOption[] = [
  { key: "landing_bounce", label: "Landing / acquisition", sub: "Visitors arrive but do not engage or progress" },
  { key: "paywall_bounce", label: "Pricing / checkout", sub: "Users stall before or during commitment" },
  { key: "onboarding_dropout", label: "Signup / onboarding", sub: "Users start but fail to reach first value" },
  { key: "other", label: "Another product moment", sub: "The visible issue sits elsewhere in the journey" },
];

export const LANDING_SEGMENT_OPTIONS: ScanFunnelOption[] = [
  {
    key: "concierge",
    label: "Done-For-You Diagnostic",
    sub: "Signal & Friction runs the diagnosis. Execution can continue into a separate Intervention scope.",
  },
  {
    key: "autonomy",
    label: "Done-With-You Diagnostic",
    sub: "Signal & Friction runs the diagnosis. Your team owns implementation after the reviewable decision.",
  },
];

export const DFY_CONTEXT_OPTIONS: ScanFunnelOption[] = [
  { key: "early", label: "Under $50k MRR", sub: "Early commercial system; protect learning speed and focus" },
  { key: "scaling", label: "$50k–$150k MRR", sub: "Scaling system; prioritize repeatability and measurable movement" },
  { key: "larger", label: "$150k+ MRR", sub: "Larger operating surface; expect more dependencies and review" },
];

export const DWY_CONTEXT_OPTIONS: ScanFunnelOption[] = [
  { key: "founder", label: "Founder-led execution", sub: "You can ship product or copy changes directly" },
  { key: "team", label: "Internal growth / product team", sub: "A team can implement a scoped decision" },
  { key: "external", label: "External implementation support", sub: "You will hand the decision to an agency or contractor" },
];

export const LANDING_URGENCY_OPTIONS = [
  { key: "now", label: "Now" },
  { key: "quarter", label: "This quarter" },
  { key: "exploring", label: "Exploring" },
];
