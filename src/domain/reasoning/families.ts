import type { ReasoningFamily } from "./types";

export const FAMILIES: ReasoningFamily[] = [
  {
    id: "cognitive-load", num: "01", stage: "Perception",
    title: "Cognitive Load & Information Processing",
    intro: "Before a visitor can decide, they must first process — and processing has a capacity limit. These mechanisms concern what happens when a funnel demands more mental bandwidth than the visitor has available.",
  },
  {
    id: "trust-credibility", num: "02", stage: "Perception",
    title: "Trust, Credibility & Authority",
    intro: "Once information is processed, it must be believed. These mechanisms concern how a visitor decides whether a claim, a company, or an offer is credible — often before they've verified anything themselves.",
  },
  {
    id: "risk-loss-aversion", num: "03", stage: "Evaluation",
    title: "Risk Perception & Loss Aversion",
    intro: "Once a claim is believed, it must be weighed against what the visitor stands to gain or lose. These mechanisms describe systematic asymmetries in how gains and losses — real or merely framed — are valued.",
  },
  {
    id: "choice-architecture", num: "04", stage: "Structure",
    title: "Choice Architecture & Decision Complexity",
    intro: "The structure of a choice set shapes the decision as much as its content. These mechanisms describe how defaults, comparisons, and option count steer outcomes independent of the options' actual merits.",
  },
  {
    id: "anchoring-framing", num: "05", stage: "Judgment",
    title: "Anchoring, Reference Points & Framing",
    intro: "Judgments of value are relative, not absolute. These mechanisms describe how the first number seen, the phrasing of a fact, and what a claim is compared against shape its perceived magnitude.",
  },
  {
    id: "narrative-clarity", num: "06", stage: "Coherence",
    title: "Narrative Clarity & Expectation-Reality Alignment",
    intro: "A decision doesn't end at conversion — it's re-evaluated against what actually happens next. These mechanisms describe how expectations and salient moments shape the retrospective judgment that drives retention.",
  },
  {
    id: "motivation-emotion", num: "07", stage: "Action",
    title: "Motivation, Emotion & Psychological Friction",
    intro: "Belief and favorable judgment aren't sufficient for action. These mechanisms concern what actually moves a person from evaluation to commitment — and what quietly erodes the will to act even after everything else is resolved.",
  },
];
