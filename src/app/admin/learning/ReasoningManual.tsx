"use client";

// Internal reasoning manual — 7 decision-mechanism families, 21 entries.
// Content is shared verbatim with the standalone reference artifact built
// 2026-08-03; this is the same document ported into the Learning module as
// a real in-app reference tab, styled with the app's existing Tailwind
// tokens (font-serif/font-mono are already wired to Newsreader/JetBrains
// Mono site-wide) instead of re-embedding fonts the way the standalone
// artifact had to.
//
// Every entry is a hypothesis for interpretation, never an automatic
// explanation for why a page converts poorly — see the epistemic-standard
// callout at the top. Evidence-strength ratings are not decoration: Choice
// Overload and the Zeigarnik Effect are flagged weaker than their popular
// reputation on purpose, because the actual replication record doesn't
// support treating them as settled.

type Evidence = "strong" | "mixed" | "contextual" | "weak";

interface Entry {
  name: string;
  evidence: Evidence;
  evidenceLabel?: string;
  definition: string;
  mechanism: string;
  evidenceNote: string;
  manifestation: string;
  question: string;
  misreadings: string;
  connection: { mechanism: string; primary: boolean }[];
}

interface Family {
  num: string;
  stage: string;
  title: string;
  intro: string;
  entries: Entry[];
}

const EVIDENCE_STYLES: Record<Evidence, string> = {
  strong: "text-[#5C9A6B] border-[#5C9A6B]/40 bg-[#5C9A6B]/8",
  mixed: "text-[#C85C5C] border-[#C85C5C]/40 bg-[#C85C5C]/8",
  contextual: "text-[#D4A853] border-[#D4A853]/40 bg-[#D4A853]/8",
  weak: "text-[#C85C5C] border-[#C85C5C]/40 bg-[#C85C5C]/8",
};

const FAMILIES: Family[] = [
  {
    num: "01", stage: "Perception", title: "Cognitive Load & Information Processing",
    intro: "Before a visitor can decide, they must first process — and processing has a capacity limit. These mechanisms concern what happens when a funnel demands more mental bandwidth than the visitor has available.",
    entries: [
      {
        name: "Cognitive Load Theory", evidence: "strong",
        definition: "Working memory has limited capacity, and interface design that exceeds it degrades comprehension regardless of the information's intrinsic value.",
        mechanism: "Working memory holds only a small number of active chunks. Three load types compete for it: intrinsic (the task's real complexity), extraneous (imposed by poor presentation), germane (effort building real understanding). The only lever a page controls is extraneous load.",
        evidenceNote: "Sweller's theory (1988 onward) is among the most replicated frameworks in educational psychology. Its extension to web/UX design is a reasonable but less formally tested extrapolation — the underlying working-memory constraint (Baddeley's model) is not in serious dispute.",
        manifestation: "A pricing page listing fourteen feature bullets per tier with no visual grouping, forcing the visitor to hold all fourteen in mind simultaneously.",
        question: "Is the visitor's difficulty about not understanding the offer — or about how much they must hold in mind at once to evaluate it?",
        misreadings: "Not every confusing page is a load problem — a simple page can still fail on trust or motivation grounds. Overuse shows up as stripping decision-relevant information in the name of \"simplicity,\" trading a load problem for a value-uncertainty problem.",
        connection: [{ mechanism: "Cognitive Load", primary: true }, { mechanism: "Ordering Error", primary: false }],
      },
      {
        name: "Hick's Law", evidence: "contextual",
        definition: "Decision time increases logarithmically with the number and complexity of available choices.",
        mechanism: "Each additional option must be encoded, compared against alternatives already held in mind, and folded into a running best-choice estimate — a serial cognitive process.",
        evidenceNote: "Strong within its original domain (Hick 1952, Hyman 1953) for simple, well-defined tasks. Weaker extrapolated to complex purchase decisions — real buying involves motivation and risk evaluation a reaction-time task doesn't capture, so it describes decision latency, not decision quality.",
        manifestation: "A plan selector with nine undifferentiated tiers, where visitors visibly hesitate or abandon before evaluating any single option in depth.",
        question: "If this decision is taking longer than it should, is that because the options are genuinely hard to compare — or because there are just more of them than the decision warrants?",
        misreadings: "Frequently conflated with choice overload, a motivational effect, when Hick's Law is strictly about processing time. Don't invoke it to argue for fewer options when the real problem is poor differentiation between the options that already exist.",
        connection: [{ mechanism: "Cognitive Load", primary: true }, { mechanism: "Commitment Anxiety", primary: false }],
      },
      {
        name: "Recognition Over Recall", evidence: "strong",
        definition: "People decide more accurately and effortlessly when relevant information is visible in context than when they must retrieve it from memory.",
        mechanism: "Recognition is a cued memory process — the environment supplies the retrieval cue. Recall requires unaided, effortful search with no external cue, a categorically harder operation.",
        evidenceNote: "One of Nielsen's ten usability heuristics (1994), grounded in decades of recognition-vs-recall research (Mandler, Tulving). Application to any specific interface decision is more heuristic than case-by-case isolated, but the underlying memory asymmetry is not disputed.",
        manifestation: "A checkout flow that shows cart contents and running total only on a separate page, forcing the buyer to recall what they selected.",
        question: "At the exact moment this person needs to decide, is the information they need actually visible — or are they relying on memory from three steps ago?",
        misreadings: "Not a mandate to show everything at once — that reintroduces load. The principle is placing the specific decision-relevant information near the decision point, not maximizing on-screen information generally.",
        connection: [{ mechanism: "Cognitive Load", primary: true }, { mechanism: "Trust Deficit", primary: false }],
      },
    ],
  },
  {
    num: "02", stage: "Perception", title: "Trust, Credibility & Authority",
    intro: "Once information is processed, it must be believed. These mechanisms concern how a visitor decides whether a claim, a company, or an offer is credible — often before they've verified anything themselves.",
    entries: [
      {
        name: "Social Proof", evidence: "contextual",
        definition: "People treat the observed behavior of similar others as evidence of the correct choice, especially under uncertainty.",
        mechanism: "Evaluating a choice directly is effortful under ambiguity, so the mind substitutes an easier question — \"what are people like me doing?\" Most powerful when the observer feels similar to those observed.",
        evidenceNote: "Cialdini's formulation (1984) rests on real grounding (Asch, Sherif), but effect size depends heavily on similarity and specificity of the proof. Well-established in low-stakes consumer contexts; considerably weaker — sometimes reversed — in high-stakes B2B purchasing.",
        manifestation: "A logo wall of unnamed \"trusted by 500+ companies\" with no company the visitor recognizes and no indication of size or industry similarity to their own.",
        question: "Is this proof actually similar enough to this specific visitor to function as evidence — or is it just occupying the space where trust evidence usually goes?",
        misreadings: "Vague, generic proof is not the same intervention as specific, similar-peer proof. Overused when it substitutes for a buyer's own evaluation criteria in complex B2B purchases, where peer behavior is a weak signal relative to fit.",
        connection: [{ mechanism: "Trust Deficit", primary: true }, { mechanism: "Identity Friction", primary: false }],
      },
      {
        name: "Authority & Expertise Signaling", evidence: "mixed",
        definition: "People assign more credibility to claims associated with recognized expertise, independent of the claim's own merits.",
        mechanism: "Verifying a claim's substance is costly, so the mind uses source credibility as a proxy for validity — cognitive delegation, a heuristic, not a validity check.",
        evidenceNote: "Deference to authority is well documented (Milgram, though transfer to marketing is inferential). In digital B2B specifically, evidence is thinner — badges help, hurt, or do nothing depending on category familiarity, with real backfire risk when a signal feels irrelevant.",
        manifestation: "A security/compliance badge near a checkout CTA when the buyer's live hesitation is actually about pricing, not data security.",
        question: "Does this specific authority signal address the specific doubt this visitor has right now — or is it a generic credibility marker parked in a high-visibility spot?",
        misreadings: "Not interchangeable with relevance — an impressive but irrelevant credential doesn't resolve doubt and can raise suspicion. Most effective against competence/legitimacy doubt; ineffective against price, fit, or timing doubt.",
        connection: [{ mechanism: "Trust Deficit", primary: true }, { mechanism: "Value Uncertainty", primary: false }],
      },
      {
        name: "Halo Effect", evidence: "strong",
        definition: "A single positive impression about an entity biases evaluation of its unrelated qualities.",
        mechanism: "Global evaluative judgments are cheaper to form than attribute-by-attribute analysis. Once an impression forms, unrelated attributes get colored to stay consistent with it.",
        evidenceNote: "One of the most robustly replicated findings in person perception since Thorndike (1920). Directionally strong; precise effect size in any given digital-product context varies substantially by study and category.",
        manifestation: "A visually polished pricing page causing visitors to assume equally polished product/support quality, with no actual product evidence present.",
        question: "Is this positive first impression backed by evidence for the specific thing the visitor needs to trust — or is it borrowing credibility from an unrelated impression?",
        misreadings: "Not a justification for polishing surface aesthetics as a substitute for a real evidence gap — a halo that fails to survive contact with the actual product converts a trust problem into a churn problem downstream.",
        connection: [{ mechanism: "Trust Deficit", primary: true }, { mechanism: "Value Uncertainty", primary: false }],
      },
    ],
  },
  {
    num: "03", stage: "Evaluation", title: "Risk Perception & Loss Aversion",
    intro: "Once a claim is believed, it must be weighed against what the visitor stands to gain or lose. These mechanisms describe systematic asymmetries in how gains and losses — real or merely framed — are valued.",
    entries: [
      {
        name: "Loss Aversion", evidence: "strong",
        definition: "Losses are experienced as more psychologically significant than equivalent gains.",
        mechanism: "Value is computed relative to a reference point, and the value function is steeper for losses than gains around that point.",
        evidenceNote: "A foundational, extensively replicated result of Prospect Theory (Kahneman & Tversky, 1979). The commonly cited \"losses loom twice as large\" ratio is an approximation from specific experiments, not a universal constant.",
        manifestation: "Framing a cancellation flow around what the customer will lose produces stronger retention than framing an equivalent upgrade around the same gains.",
        question: "Is this decision currently framed as a gain to get or a loss to avoid — and does that framing match how the trade-off actually works?",
        misreadings: "Not a license for manufactured scarcity or fear-based urgency — those are separate, often manipulative tactics. The effect concerns psychological framing of an identical outcome, not actual risk.",
        connection: [{ mechanism: "Commitment Anxiety", primary: true }, { mechanism: "Value Uncertainty", primary: false }],
      },
      {
        name: "Status Quo Bias", evidence: "contextual",
        definition: "People disproportionately prefer the current state of affairs, treating it as the reasonable baseline.",
        mechanism: "Changing the status quo requires an active decision and creates possibility of attributable regret; maintaining it requires no decision at all.",
        evidenceNote: "Well-established in default-effect research (opt-in/opt-out organ donation), but magnitude is highly sensitive to how much active effort switching requires — large when switching costs are high, nearly absent when trivial.",
        manifestation: "A visitor already using a competitor hesitates to switch not because your product is worse, but because switching carries perceived setup effort that staying does not.",
        question: "Is this hesitation about the merits of my offer — or about the mere fact that switching requires an active decision that staying doesn't?",
        misreadings: "Easily conflated with genuine product-fit rejection — real switching costs (data migration, retraining) aren't a bias at all. Only label it bias when switching cost is genuinely smaller than the visitor's behavior implies.",
        connection: [{ mechanism: "Commitment Anxiety", primary: true }, { mechanism: "Ordering Error", primary: false }],
      },
      {
        name: "Endowment Effect", evidence: "mixed",
        definition: "People assign more value to something once they perceive it as their own than they did beforehand.",
        mechanism: "Ownership shifts the reference point for loss-aversion calculations — giving something up registers as a loss rather than forgoing a gain, even absent real ownership transfer.",
        evidenceNote: "The original mug experiments (Kahneman, Knetsch & Thaler, 1990) are famous, but this is one of the more genuinely contested findings of the replication era — later studies found substantially smaller, more conditional effects. Treat it as real but reliably smaller than its popular reputation.",
        manifestation: "Trial users who've configured a workspace or imported data show churn reluctance not explained by satisfaction alone.",
        question: "Has this visitor actually built or invested something they'd feel they're giving up — or does the funnel just assume an endowment effect that was never created?",
        misreadings: "Frequently overclaimed to justify \"let them try it and they won't want to give it up\" trial design — the effect needs genuine investment or personalization to exist at all.",
        connection: [{ mechanism: "Commitment Anxiety", primary: true }, { mechanism: "Identity Friction", primary: false }],
      },
    ],
  },
  {
    num: "04", stage: "Structure", title: "Choice Architecture & Decision Complexity",
    intro: "The structure of a choice set shapes the decision as much as its content. These mechanisms describe how defaults, comparisons, and option count steer outcomes independent of the options' actual merits.",
    entries: [
      {
        name: "Default Effect", evidence: "strong",
        definition: "People disproportionately select whatever option is pre-set as the default.",
        mechanism: "A default reads as an implicit recommendation from the choice architect, combined with the effort cost of actively overriding it.",
        evidenceNote: "Among the most robust findings in applied behavioral economics — retirement auto-enrollment (Madrian & Shea, 2001) and cross-country organ-donation comparisons show large, consistent effects.",
        manifestation: "A pricing page pre-selecting annual billing shifts a meaningful share of purchases to annual commitment with no persuasive copy at all.",
        question: "What is currently defaulted here, and is that default the option that serves this visitor's interest — or the business's preference?",
        misreadings: "Using defaults to steer users toward options that don't serve their interest — pre-checked add-ons, defaulted high-commitment tiers — crosses from choice architecture into a trust-damaging dark pattern.",
        connection: [{ mechanism: "Ordering Error", primary: true }, { mechanism: "Commitment Anxiety", primary: false }],
      },
      {
        name: "Decoy Effect (Asymmetric Dominance)", evidence: "mixed",
        definition: "A third option, clearly inferior to one existing option but not the other, shifts preference toward the option it's dominated by.",
        mechanism: "Absolute evaluation is hard, so people rely on relative comparison. A decoy gives an easy, confident comparison that lends unwarranted confidence to the whole judgment.",
        evidenceNote: "Strong in controlled settings (Huber, Payne & Puto, 1982). Thinner for durable B2B purchases over long cycles, where buyers build independent comparisons — the effect can be neutralized entirely by informed research.",
        manifestation: "A three-tier pricing page where the middle tier looks \"obvious\" relative to a bottom tier stripped of features.",
        question: "Is the middle option winning because it's genuinely the best fit — or because the other two tiers were shaped to make it look that way?",
        misreadings: "Effective for a first glance; unreliable once a buyer starts independent evaluation. Works on relative comparison within your own tiers; does nothing against external competitor comparison.",
        connection: [{ mechanism: "Ordering Error", primary: true }, { mechanism: "Value Uncertainty", primary: false }],
      },
      {
        name: "Choice Overload", evidence: "weak", evidenceLabel: "Mixed",
        definition: "Beyond a certain point, more options can reduce rather than increase the likelihood of choosing.",
        mechanism: "Each additional option imposes comparison cost and anticipated-regret cost; past a threshold these outweigh the benefit of a better potential match.",
        evidenceNote: "The single most important honesty flag in this document. The jam-study origin (Iyengar & Lepper, 2000) is famous, but the large meta-analysis (Scheibehenne et al., 2010) found the average effect close to zero, heavily moderated by category familiarity and differentiation. Treat any claim that fewer options always convert better with real skepticism.",
        manifestation: "A features page with twenty near-identical toggles producing hesitation or exit, versus a curated three-option version.",
        question: "Is this friction really about the number of options — or about how poorly differentiated the existing options currently are?",
        misreadings: "The most commonly overapplied principle in this document. \"Reduce the options\" is not a universal fix — it can remove genuinely useful choice without addressing the real problem.",
        connection: [{ mechanism: "Cognitive Load", primary: true }, { mechanism: "Commitment Anxiety", primary: false }],
      },
    ],
  },
  {
    num: "05", stage: "Judgment", title: "Anchoring, Reference Points & Framing",
    intro: "Judgments of value are relative, not absolute. These mechanisms describe how the first number seen, the phrasing of a fact, and what a claim is compared against shape its perceived magnitude.",
    entries: [
      {
        name: "Anchoring", evidence: "strong",
        definition: "An initially presented number biases subsequent numerical judgments toward itself, even when explicitly arbitrary.",
        mechanism: "Numerical estimation adjusts away from a starting value, and that adjustment is systematically insufficient — people under-correct even when warned in advance.",
        evidenceNote: "One of the most extensively replicated findings since Tversky & Kahneman's 1974 demonstrations, across pricing, legal judgment, and estimation tasks.",
        manifestation: "A crossed-out \"was $X\" price anchors perceived worth to the higher number, even if that price was never actually charged.",
        question: "What is the first number this visitor sees, and is it actually informative about value — or just the first number they happened to encounter?",
        misreadings: "Anchoring on a fabricated reference price is a trust-destroying misuse of a real mechanism — it resolves against the seller the moment a diligent buyer notices.",
        connection: [{ mechanism: "Value Uncertainty", primary: true }, { mechanism: "Trust Deficit", primary: false }],
      },
      {
        name: "Framing Effect", evidence: "strong",
        definition: "Logically equivalent descriptions of the same information produce different decisions depending on gain or loss presentation.",
        mechanism: "The same objective outcome is evaluated differently depending on whether it's coded as a gain or loss relative to the reference point the framing implies.",
        evidenceNote: "Directly derived from Prospect Theory (Kahneman & Tversky, 1979, 1981), replicated extensively across medical, financial, and consumer decision-making.",
        manifestation: "\"Save 20% by paying annually\" versus \"pay 25% more by staying monthly\" describe the same price difference, framed differently.",
        question: "Is the current framing describing this trade-off as a gain to get or a loss to avoid — and is that the psychologically accurate representation?",
        misreadings: "Framing a fact differently is not changing the fact — using framing to obscure a genuinely unfavorable term crosses into manipulation.",
        connection: [{ mechanism: "Value Uncertainty", primary: true }, { mechanism: "Commitment Anxiety", primary: false }],
      },
      {
        name: "Contrast Effect", evidence: "contextual",
        definition: "The perceived magnitude of a stimulus is judged relative to recently or simultaneously presented stimuli.",
        mechanism: "Evaluative systems are comparative by default (Weber's Law). The same absolute price can register as large or small depending on what it's compared against.",
        evidenceNote: "Strong for the underlying psychophysical mechanism. Its application to deliberate pricing-page sequencing is a reasonable extrapolation with less domain-specific isolation than anchoring or framing.",
        manifestation: "Presenting an enterprise \"custom pricing\" tier before standard tiers makes the standard tiers feel more moderate.",
        question: "What is this price or claim currently being mentally compared against — and does that comparison reflect the value actually being offered?",
        misreadings: "Distinct from anchoring in mechanism, even though the two often co-occur and get conflated. Overused when a contrast is engineered from items not real or relevant to the buyer's decision.",
        connection: [{ mechanism: "Value Uncertainty", primary: true }, { mechanism: "Ordering Error", primary: false }],
      },
    ],
  },
  {
    num: "06", stage: "Coherence", title: "Narrative Clarity & Expectation-Reality Alignment",
    intro: "A decision doesn't end at conversion — it's re-evaluated against what actually happens next. These mechanisms describe how expectations and salient moments shape the retrospective judgment that drives retention.",
    entries: [
      {
        name: "Expectation (Dis)confirmation", evidence: "strong",
        definition: "Satisfaction is driven less by an experience's absolute quality than by how it compares to the expectation held beforehand.",
        mechanism: "Incoming experience is evaluated against a pre-formed expectation. The gap — confirmation, positive or negative disconfirmation — drives satisfaction more than objective quality alone.",
        evidenceNote: "Foundational since Oliver (1980), extended directly to SaaS post-adoption satisfaction (Bhattacherjee's IS-continuance model, 2001). One of the better-evidenced entries specifically for the SaaS domain.",
        manifestation: "Marketing overselling ease-of-setup produces more signups but worse activation, because onboarding negatively disconfirms an inflated expectation.",
        question: "What expectation is the marketing and sales copy setting, and does the product experience meet, exceed, or fall short of it?",
        misreadings: "Not an argument for underselling to \"guarantee\" positive disconfirmation — depressed expectations can suppress conversion so much the later satisfaction gain never happens.",
        connection: [{ mechanism: "Value Uncertainty", primary: true }, { mechanism: "Trust Deficit", primary: false }],
      },
      {
        name: "Peak-End Rule", evidence: "contextual",
        definition: "Retrospective evaluation of an experience is disproportionately shaped by its most intense moment and its final moment.",
        mechanism: "Memory constructs a retrospective summary dominated by a few salient points, not a moment-by-moment average — why total duration has little influence on remembered evaluation.",
        evidenceNote: "Strong for the original domain (Kahneman's colonoscopy studies, 1993/1996 — acute physical experience). More contextual for extended, low-intensity digital experiences, where the research base is thinner.",
        manifestation: "A trial ending on a confusing cancellation flow leaves a disproportionately negative impression, even if most of the trial was smooth.",
        question: "What is the most intense friction moment in this flow, and what is the very last thing this visitor experiences before the decision point?",
        misreadings: "Should not justify neglecting the middle of an experience — duration neglect describes memory construction, not real-time abandonment risk.",
        connection: [{ mechanism: "Trust Deficit", primary: true }, { mechanism: "Commitment Anxiety", primary: false }],
      },
      {
        name: "Zeigarnik Effect", evidence: "weak", evidenceLabel: "Weak / Contested",
        definition: "Incomplete or interrupted tasks are believed to be better remembered and generate more cognitive tension than completed ones.",
        mechanism: "As originally proposed, unresolved goals maintain cognitive tension keeping them accessible in memory — the theoretical basis of progress-bar design patterns.",
        evidenceNote: "The most important honesty flag in this document alongside Choice Overload. The 1927 original is cited as settled science in UX writing, but replication has been inconsistent and modern reviews question whether it's robust outside narrow lab conditions. Progress bars may work — but simpler, better-supported explanations (reduced uncertainty about remaining effort) may account for it without this contested mechanism.",
        manifestation: "A multi-step onboarding progress bar showing \"3 of 5 steps complete,\" commonly justified by appeal to this effect specifically.",
        question: "Is this incompleteness cue giving useful, honest feedback about remaining effort — or is it being justified by a mechanism that may not be doing the work it's credited with?",
        misreadings: "Invoked with far more certainty than the evidence supports. Prefer better-supported explanations when a progress indicator does prove effective.",
        connection: [{ mechanism: "Commitment Anxiety", primary: false }],
      },
    ],
  },
  {
    num: "07", stage: "Action", title: "Motivation, Emotion & Psychological Friction",
    intro: "Belief and favorable judgment aren't sufficient for action. These mechanisms concern what actually moves a person from evaluation to commitment — and what quietly erodes the will to act even after everything else is resolved.",
    entries: [
      {
        name: "Self-Determination Theory", evidence: "strong",
        definition: "Sustained motivation depends on satisfying three needs — autonomy, competence, relatedness — and degrades when any is thwarted.",
        mechanism: "Distinguishes intrinsic from extrinsic motivation; external controls can undermine intrinsic motivation even while nominally incentivizing the target behavior (motivation crowding-out).",
        evidenceNote: "One of the most extensively validated theories in motivational psychology since Deci & Ryan's 1970s work, with direct application to software onboarding and habit formation.",
        manifestation: "A forced, linear onboarding wizard that doesn't let a new user skip to what they actually want reduces perceived autonomy and can lower activation.",
        question: "Does the visitor feel like they're choosing to proceed or being made to proceed — and does the flow give evidence of their own growing competence?",
        misreadings: "Not an argument for unstructured freedom — pure autonomy without scaffolding can undermine the competence need. The theory calls for balancing all three needs.",
        connection: [{ mechanism: "Identity Friction", primary: true }, { mechanism: "Commitment Anxiety", primary: true }],
      },
      {
        name: "Commitment & Consistency", evidence: "strong",
        definition: "Once people make a small commitment, they feel internal pressure to behave consistently with it on later, larger requests.",
        mechanism: "Consistency functions as a heuristic for a coherent self-concept; violating it carries a psychological cost. Strongest when the initial commitment was active, effortful, and freely chosen.",
        evidenceNote: "Grounded in Cialdini (1984) and foot-in-the-door research (Freedman & Fraser, 1966), substantially replicated — though effect size depends heavily on how voluntary and effortful the first step was.",
        manifestation: "A visitor who completes a short, specific diagnostic quiz about their own funnel is more likely to purchase a paid diagnostic than one shown the same offer cold.",
        question: "What small commitment has this visitor already made, and does the next ask align with or contradict what that commitment implies about them?",
        misreadings: "Manufacturing trivial \"commitments\" — a meaningless click framed as agreement — exploits the name without the actual precondition of genuine effort, and tends to produce little real pull.",
        connection: [{ mechanism: "Commitment Anxiety", primary: true }, { mechanism: "Identity Friction", primary: false }],
      },
      {
        name: "Negativity Bias in Risk Evaluation", evidence: "strong",
        definition: "Negative information and potential negative outcomes are weighted more heavily than positive information of equivalent magnitude.",
        mechanism: "Threat-relevant information receives prioritized processing over reward-relevant information, plausibly reflecting an evolved asymmetry between missing a threat and missing an opportunity.",
        evidenceNote: "Strong for the general phenomenon (Baumeister et al.'s \"bad is stronger than good\" review, 2001). Contextual for its exact weighting at any single SaaS decision point.",
        manifestation: "A single visible negative review exerts more influence on a prospect's evaluation than several positive reviews of equal specificity.",
        question: "What is the most salient negative signal a prospect could encounter, and is anything addressing or contextualizing it?",
        misreadings: "Not a justification for suppressing negative information — honest handling of a known negative can itself function as a trust signal.",
        connection: [{ mechanism: "Trust Deficit", primary: true }, { mechanism: "Commitment Anxiety", primary: false }],
      },
    ],
  },
];

function EvidenceTag({ evidence, label }: { evidence: Evidence; label?: string }) {
  return (
    <span className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border whitespace-nowrap ${EVIDENCE_STYLES[evidence]}`}>
      {label ?? evidence}
    </span>
  );
}

function EntryCard({ entry }: { entry: Entry }) {
  return (
    <div className="border border-[#D4A853]/15 bg-[#110F0D] rounded-2xl p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h3 className="font-serif text-lg font-bold text-white leading-snug">{entry.name}</h3>
        <EvidenceTag evidence={entry.evidence} label={entry.evidenceLabel} />
      </div>
      <p className="font-serif italic text-[#D4A853] text-sm leading-relaxed">&ldquo;{entry.definition}&rdquo;</p>

      <div className="space-y-3 text-xs">
        <div>
          <span className="font-mono text-[10px] text-[#7A6F65] uppercase tracking-widest block mb-1">Underlying Mechanism</span>
          <p className="text-[#B0A89E] leading-relaxed">{entry.mechanism}</p>
        </div>
        <div>
          <span className="font-mono text-[10px] text-[#7A6F65] uppercase tracking-widest block mb-1">Strength of Evidence</span>
          <p className="text-[#B0A89E] leading-relaxed">{entry.evidenceNote}</p>
        </div>
        <div>
          <span className="font-mono text-[10px] text-[#7A6F65] uppercase tracking-widest block mb-1">Observable in a SaaS Funnel</span>
          <p className="text-[#B0A89E] leading-relaxed">{entry.manifestation}</p>
        </div>
        <div className="border-t border-[#D4A853]/8 pt-3">
          <span className="font-mono text-[10px] text-[#7A6F65] uppercase tracking-widest block mb-1">Diagnostic Question</span>
          <p className="font-serif italic text-[#F5F0EB] text-sm leading-relaxed">{entry.question}</p>
        </div>
        <div>
          <span className="font-mono text-[10px] text-[#7A6F65] uppercase tracking-widest block mb-1">Common Misinterpretations</span>
          <p className="text-[#B0A89E] leading-relaxed">{entry.misreadings}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="font-mono text-[10px] text-[#7A6F65] uppercase tracking-widest">Connects to:</span>
          {entry.connection.map((c) => (
            <span
              key={c.mechanism}
              className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                c.primary ? "text-[#D4A853] border-[#D4A853]/30 bg-[#D4A853]/5" : "text-[#7A6F65] border-[#7A6F65]/20"
              }`}
            >
              {c.mechanism}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ReasoningManual() {
  return (
    <div className="space-y-10">
      <div className="border border-[#D4A853]/20 bg-[#D4A853]/[0.03] rounded-2xl p-6 space-y-3">
        <span className="font-mono text-[10px] text-[#D4A853] uppercase tracking-[0.2em] block">Epistemic Standard</span>
        <p className="text-sm text-[#F5F0EB] leading-relaxed">
          Every principle here is a <strong className="text-white">hypothesis for interpretation</strong>, never an automatic explanation for why a page converts poorly. Behavioral economics and psychology inform analysis alongside the evidence gathered on a specific funnel — they do not substitute for it.
        </p>
        <p className="text-xs text-[#B0A89E] leading-relaxed">
          Where empirical support is mixed, contextual, or disputed, this document says so directly. Several entries below are popular in CRO/UX writing but weakly supported in the actual research record — those are flagged, not smoothed over.
        </p>
      </div>

      {FAMILIES.map((family) => (
        <section key={family.num} className="space-y-5">
          <div className="border-b border-[#D4A853]/10 pb-4">
            <span className="font-mono text-[10px] text-[#D4A853]/70 uppercase tracking-[0.3em] block mb-1.5">
              {family.num} — {family.stage}
            </span>
            <h2 className="font-serif text-2xl font-bold text-white tracking-tight mb-2">{family.title}</h2>
            <p className="text-xs text-[#B0A89E] leading-relaxed max-w-2xl">{family.intro}</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {family.entries.map((entry) => (
              <EntryCard key={entry.name} entry={entry} />
            ))}
          </div>
        </section>
      ))}

      <p className="font-mono text-[10px] text-[#7A6F65] text-center pt-6 border-t border-[#D4A853]/8">
        7 families, 21 mechanisms · Every entry is a hypothesis for interpretation, not a verdict.
      </p>
    </div>
  );
}
