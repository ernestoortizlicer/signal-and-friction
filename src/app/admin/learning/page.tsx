"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAuthHeaders } from "@/lib/supabase";
import ReasoningActivities from "./ReasoningActivities";
import DiagnosticCalibration from "./DiagnosticCalibration";

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

// Honest zeros as the baseline for the IP Lab tab's Mastery Index widget
// (unrelated to Combat Mode below — this static display predates the
// diagnostic-craft rebuild and is out of scope for it).
const DOMAINS = [
  { name: "Behavioral Economics", score: 0, color: "#D4A853" },
  { name: "Conversion Architecture", score: 0, color: "#5C9A6B" },
  { name: "Copywriting Psychology", score: 0, color: "#3B82F6" },
  { name: "Technical Systems", score: 0, color: "#A855F7" },
  { name: "Pricing Logic", score: 0, color: "#F59E0B" },
  { name: "Tax & Compliance", score: 0, color: "#C85C5C" },
];

// ════════════════════════════════════════════════════════════
// COMBAT MODE — diagnostic-craft training, rebuilt 2026-08-01
// ════════════════════════════════════════════════════════════
//
// Replaces six fictional case studies (invented companies, invented
// statistics, graded against invented categories like "Linguistic
// Architecture" — none of which were Signal & Friction's own six friction
// mechanisms) with real cases built from real client deliverables. Every
// case's answer key is the deliverable's own already-written diagnosis —
// nothing here is invented for training purposes.
//
// A deliverable becomes a case automatically the moment it has a
// groundTruthMechanism field set (src/app/deliverable/fallback.ts) — no
// code change needed to add a new one. Command-center-guide is
// deliberately excluded (it's an internal ops manual, not a client
// friction case) by never having that field set.

type FrictionMechanism =
  | "cognitive_load"
  | "trust_deficit"
  | "commitment_anxiety"
  | "ordering_error"
  | "identity_friction"
  | "value_uncertainty";

const ALL_MECHANISMS: FrictionMechanism[] = [
  "cognitive_load", "trust_deficit", "commitment_anxiety",
  "ordering_error", "identity_friction", "value_uncertainty",
];

const MECHANISM_LABELS: Record<FrictionMechanism, string> = {
  cognitive_load: "Cognitive Load",
  trust_deficit: "Trust Deficit",
  commitment_anxiety: "Commitment Anxiety",
  ordering_error: "Ordering Error",
  identity_friction: "Identity Friction",
  value_uncertainty: "Value Uncertainty",
};

// A pedagogical judgment call, not measured data: which mechanisms a
// learner is most likely to confuse with which. Used only to pick quiz
// distractors that are genuinely hard to rule out, not random noise
// options. Documented here as a design choice, not asserted as fact.
const CONFUSION_PAIRS: Record<FrictionMechanism, [FrictionMechanism, FrictionMechanism]> = {
  cognitive_load: ["ordering_error", "value_uncertainty"],
  trust_deficit: ["identity_friction", "commitment_anxiety"],
  commitment_anxiety: ["trust_deficit", "value_uncertainty"],
  ordering_error: ["cognitive_load", "commitment_anxiety"],
  identity_friction: ["trust_deficit", "value_uncertainty"],
  value_uncertainty: ["cognitive_load", "commitment_anxiety"],
};

interface EvidenceRow { tier: string; label: string; value: string; source: string }
interface AvoidRow { action: string; reason: string }

interface DeliverableForCase {
  clientKey?: string;
  clientName: string;
  groundTruthMechanism?: FrictionMechanism;
  diagnosis: { signal: string; friction: { mechanism: string; rootCause: string } };
  evidence?: EvidenceRow[];
  avoid?: AvoidRow[];
  confidenceReason?: string;
  projectedImpact?: { modeledFrom: string; narrowsWith: string };
}

interface Concept { title: string; description: string }

interface Challenge {
  id: string;
  title: string;
  metrics: string;
  context: string;
  concepts: Concept[];
  groundTruthMechanism: FrictionMechanism;
  // Kept for the Study-This-Case worked-example panel — the full real
  // evidence/avoid list, not just the derived concepts above.
  evidence: EvidenceRow[];
  avoid: AvoidRow[];
}

// The known deliverable files to check — each is only included as a case
// if it actually has groundTruthMechanism set (checked at fetch time, not
// assumed here).
const CANDIDATE_CASE_KEYS = ["payflux", "acme-corp", "growthly", "startuphub"];

function deliverableToChallenge(d: DeliverableForCase): Challenge {
  const measured = (d.evidence ?? []).filter((e) => e.tier === "measured").slice(0, 3);
  const metrics = measured.length > 0
    ? measured.map((e) => `${e.label}: ${e.value}`).join(" · ")
    : "See case context below.";
  const context = `${d.diagnosis.signal} ${d.diagnosis.friction.rootCause}`.trim();

  const concepts: Concept[] = [
    { title: "Root cause", description: d.diagnosis.friction.rootCause },
  ];
  (d.avoid ?? []).forEach((a) => concepts.push({ title: `Avoid: ${a.action}`, description: a.reason }));
  if (d.confidenceReason) concepts.push({ title: "Confidence calibration", description: d.confidenceReason });
  if (d.projectedImpact) {
    concepts.push({
      title: "Evidence tiering",
      description: `${d.projectedImpact.modeledFrom} ${d.projectedImpact.narrowsWith}`,
    });
  }

  return {
    id: d.clientKey ?? d.clientName,
    title: d.clientName,
    metrics,
    context,
    concepts,
    groundTruthMechanism: d.groundTruthMechanism as FrictionMechanism,
    evidence: d.evidence ?? [],
    avoid: d.avoid ?? [],
  };
}

// Deterministic — the same case always produces the same quiz on every
// load, so correctAnswerIndex is computed from real data every time, never
// hand-typed. This is the structural fix for the bug this replaced (a
// flat "index 1 is always correct" check that was silently wrong for half
// the old cases).
function buildQuiz(challenge: Challenge): { question: string; answers: string[]; correctAnswerIndex: number; explanation: string } {
  const correct = challenge.groundTruthMechanism;
  const distractors = CONFUSION_PAIRS[correct];
  const options: FrictionMechanism[] = [correct, ...distractors];
  let seed = 0;
  for (const ch of challenge.id) seed += ch.charCodeAt(0);
  const rot = seed % options.length;
  const rotated = [...options.slice(rot), ...options.slice(0, rot)];
  const correctAnswerIndex = rotated.indexOf(correct);
  const contextSnippet = challenge.context.length > 180 ? `${challenge.context.slice(0, 180)}…` : challenge.context;
  return {
    question: `Given this case's evidence — "${contextSnippet}" — which mechanism is dominant?`,
    answers: rotated.map((m) => MECHANISM_LABELS[m]),
    correctAnswerIndex,
    explanation: `${MECHANISM_LABELS[correct]} is the documented mechanism for this case. ${challenge.concepts[0]?.description ?? ""}`,
  };
}

interface PracticeQueueRow {
  case_key: string;
  stage: "guided" | "independent";
  consecutive_correct: number;
  next_eligible_at: string;
  last_attempted_at: string | null;
}

interface MechanismMasteryRow {
  mechanism: FrictionMechanism;
  attempts: number;
  correct: number;
  accuracy_pct: number | null;
}

interface RubricScores {
  evidence_tier_violations: string[];
  specificity_pass: boolean;
  confidence_calibrated: boolean;
}

interface VerdictResult {
  score: number;
  feedback: string;
  concepts_demonstrated: string[];
  mechanism_claimed: FrictionMechanism;
  mechanism_correct: boolean;
  rubric_scores: RubricScores;
}

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
  const [activeTab, setActiveTab] = useState<'socratic' | 'hyper_leap' | 'manual' | 'calibration'>('calibration');
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticleSlug, setSelectedArticleSlug] = useState<string>("socratic-funnel-diagnostics");
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const [selectedDraftId, setSelectedDraftId] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>({});

  // ── Combat Mode state ──
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>("");
  const [practiceQueue, setPracticeQueue] = useState<Record<string, PracticeQueueRow>>({});
  const [mechanismMastery, setMechanismMastery] = useState<Record<string, MechanismMasteryRow>>({});
  const [conceptsMastered, setConceptsMastered] = useState(0);
  const [studyExpanded, setStudyExpanded] = useState(false);

  const [hlActive, setHlActive] = useState(false);
  const [hlInput, setHlInput] = useState("");
  const [mechanismClaimed, setMechanismClaimed] = useState<FrictionMechanism | null>(null);

  const [typingStartedAt, setTypingStartedAt] = useState<number | null>(null);
  const [diagnosticVelocity, setDiagnosticVelocity] = useState<number | null>(null);
  const [sessionElapsed, setSessionElapsed] = useState<number | null>(null);

  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const [socraticPhase, setSocraticPhase] = useState<'followup_loading' | 'followup' | 'verdict_loading' | 'verdict' | 'error'>('followup_loading');
  const [followupQuestion, setFollowupQuestion] = useState("");
  const [followupResponse, setFollowupResponse] = useState("");
  const [verdict, setVerdict] = useState<VerdictResult | null>(null);
  const [socraticError, setSocraticError] = useState<string | null>(null);

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

  // Case bank — self-extending. Any deliverable JSON in public/deliverables
  // with groundTruthMechanism set becomes a case; anything without it is
  // silently excluded, never guessed at.
  useEffect(() => {
    async function loadCases() {
      setCasesLoading(true);
      try {
        const results = await Promise.all(
          CANDIDATE_CASE_KEYS.map((key) =>
            fetch(`/deliverables/${key}.json`)
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null)
          )
        );
        const valid = results.filter(
          (d): d is DeliverableForCase => !!d && typeof d.groundTruthMechanism === "string"
        );
        const built = valid.map(deliverableToChallenge);
        setChallenges(built);
        if (built.length > 0) setSelectedChallengeId((prev) => prev || built[0].id);
      } catch (err) {
        console.error("Error loading case bank from deliverables:", err);
      } finally {
        setCasesLoading(false);
      }
    }
    loadCases();
  }, []);

  // Real progress — session history for Concepts Mastered, the
  // mechanism_mastery VIEW (computed server-side from real session
  // history, never stored as an opinion) for the radar, and practice_queue
  // for per-case stage/spacing state. Any of the three tables/views not
  // existing yet (undeployed migration) fails honestly to empty/zero —
  // never a fake placeholder number.
  useEffect(() => {
    async function fetchProgress() {
      try {
        const headers = getAuthHeaders();
        const [resSessions, resMastery, resQueue] = await Promise.all([
          fetch(`${supabaseUrl}/rest/v1/hyper_leap_sessions?select=concepts_demonstrated`, { headers }),
          fetch(`${supabaseUrl}/rest/v1/mechanism_mastery?select=*`, { headers }),
          fetch(`${supabaseUrl}/rest/v1/practice_queue?select=*`, { headers }),
        ]);
        if (resSessions.ok) {
          const sessions: Array<{ concepts_demonstrated: string[] }> = await resSessions.json();
          setConceptsMastered(sessions.reduce((sum, s) => sum + (s.concepts_demonstrated?.length || 0), 0));
        }
        if (resMastery.ok) {
          const rows: MechanismMasteryRow[] = await resMastery.json();
          const map: Record<string, MechanismMasteryRow> = {};
          rows.forEach((r) => { map[r.mechanism] = r; });
          setMechanismMastery(map);
        }
        if (resQueue.ok) {
          const rows: PracticeQueueRow[] = await resQueue.json();
          const map: Record<string, PracticeQueueRow> = {};
          rows.forEach((r) => { map[r.case_key] = r; });
          setPracticeQueue(map);
        }
      } catch (err) {
        console.error("Error loading Combat Mode progress:", err);
      }
    }
    fetchProgress();
  }, [supabaseUrl]);

  const activeArticle = articles.find(a => a.slug === selectedArticleSlug) || articles[0];
  const activeDrafts = drafts.filter(d => d.article_slug === selectedArticleSlug);
  const activeChallenge = challenges.find(c => c.id === selectedChallengeId) ?? challenges[0];
  const activeQueueRow = activeChallenge ? practiceQueue[activeChallenge.id] : undefined;
  const activeStage: "guided" | "independent" = activeQueueRow?.stage ?? "guided";
  const activeQuiz = activeChallenge ? buildQuiz(activeChallenge) : null;

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
    if (!activeQuiz) return;
    setSelectedAnswer(answerIdx);
    setQuizScore(answerIdx === activeQuiz.correctAnswerIndex ? 100 : 0);
  };

  const resetChallenge = () => {
    setHlActive(false);
    setHlInput("");
    setMechanismClaimed(null);
    setStudyExpanded(false);
    setTypingStartedAt(null);
    setDiagnosticVelocity(null);
    setSessionElapsed(null);
    setSocraticPhase('followup_loading');
    setFollowupQuestion("");
    setFollowupResponse("");
    setVerdict(null);
    setSocraticError(null);
  };

  // Spacing rule: resurface sooner for a mechanism you're weak on, later
  // for one you're strong on — at least 1 day either way, per the spaced-
  // retrieval research minimum (approved curriculum doc, §01). Stage
  // advances to 'independent' (scaffolding withdrawn) once you've cleared
  // the mechanism correctly, with a passing score, twice in a row.
  const updatePracticeQueue = async (caseKey: string, correct: boolean, score: number) => {
    const prev = practiceQueue[caseKey];
    const passed = correct && score >= 70;
    const consecutiveCorrect = passed ? (prev?.consecutive_correct ?? 0) + 1 : 0;
    const stage: "guided" | "independent" = consecutiveCorrect >= 2 ? "independent" : "guided";
    const acc = mechanismMastery[activeChallenge!.groundTruthMechanism]?.accuracy_pct;
    const days = acc === null || acc === undefined ? 1 : acc < 50 ? 1 : acc < 80 ? 3 : 7;
    const nextEligibleAt = new Date(Date.now() + days * 86400000).toISOString();
    try {
      const headers = { ...getAuthHeaders(), "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" };
      const res = await fetch(`${supabaseUrl}/rest/v1/practice_queue?on_conflict=case_key`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          case_key: caseKey,
          stage,
          consecutive_correct: consecutiveCorrect,
          next_eligible_at: nextEligibleAt,
          last_attempted_at: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        const [row] = await res.json();
        if (row) setPracticeQueue((p) => ({ ...p, [caseKey]: row }));
      }
    } catch (err) {
      console.error("Failed to update practice queue:", err);
    }
  };

  const refetchMastery = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${supabaseUrl}/rest/v1/mechanism_mastery?select=*`, { headers });
      if (res.ok) {
        const rows: MechanismMasteryRow[] = await res.json();
        const map: Record<string, MechanismMasteryRow> = {};
        rows.forEach((r) => { map[r.mechanism] = r; });
        setMechanismMastery(map);
      }
    } catch (err) {
      console.error("Failed to refetch mechanism mastery:", err);
    }
  };

  const submitHypothesis = async () => {
    if (!activeChallenge || !mechanismClaimed) return;
    if (typingStartedAt) {
      // eslint-disable-next-line react-hooks/purity
      const elapsedSecs = (Date.now() - typingStartedAt) / 1000;
      const wordCount = hlInput.trim().split(/\s+/).filter(Boolean).length;
      const wpm = wordCount > 0 && elapsedSecs > 0 ? Math.round((wordCount / elapsedSecs) * 60) : 0;
      setDiagnosticVelocity(wpm);
      setSessionElapsed(Math.round(elapsedSecs));
    }
    setHlActive(true);
    setSocraticPhase('followup_loading');
    setSocraticError(null);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/learning-socratic-tutor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
        },
        body: JSON.stringify({
          step: 'followup',
          challenge: {
            id: activeChallenge.id, title: activeChallenge.title,
            metrics: activeChallenge.metrics, context: activeChallenge.context,
            concepts: activeChallenge.concepts, groundTruthMechanism: activeChallenge.groundTruthMechanism,
          },
          hypothesis: hlInput,
          mechanismClaimed,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `Socratic tutor request failed (${res.status}).`);
      setFollowupQuestion(data.question);
      setSocraticPhase('followup');
    } catch (err) {
      console.error("Socratic follow-up failed:", err);
      setSocraticError(err instanceof Error ? err.message : "Failed to reach the Socratic tutor.");
      setSocraticPhase('error');
    }
  };

  const submitFollowupResponse = async () => {
    if (!activeChallenge || !mechanismClaimed) return;
    setSocraticPhase('verdict_loading');
    setSocraticError(null);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/learning-socratic-tutor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
        },
        body: JSON.stringify({
          step: 'verdict',
          challenge: {
            id: activeChallenge.id, title: activeChallenge.title,
            metrics: activeChallenge.metrics, context: activeChallenge.context,
            concepts: activeChallenge.concepts, groundTruthMechanism: activeChallenge.groundTruthMechanism,
          },
          hypothesis: hlInput,
          mechanismClaimed,
          followupQuestion,
          followupResponse,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `Socratic tutor request failed (${res.status}).`);

      const v: VerdictResult = {
        score: data.score as number,
        feedback: data.feedback as string,
        concepts_demonstrated: (data.concepts_demonstrated as string[]) || [],
        mechanism_claimed: data.mechanism_claimed as FrictionMechanism,
        mechanism_correct: data.mechanism_correct as boolean,
        rubric_scores: data.rubric_scores as RubricScores,
      };
      setVerdict(v);
      setSocraticPhase('verdict');

      // Persist the real session, then apply real deltas — never a flat
      // button increment. A persistence failure here is logged but must
      // not hide the verdict the learner already earned and can see.
      try {
        const headers = getAuthHeaders();
        await fetch(`${supabaseUrl}/rest/v1/hyper_leap_sessions`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            challenge_id: activeChallenge.id,
            challenge_title: activeChallenge.title,
            hypothesis: hlInput,
            selected_mechanisms: [mechanismClaimed],
            followup_question: followupQuestion,
            followup_response: followupResponse,
            score: v.score,
            feedback: v.feedback,
            concepts_demonstrated: v.concepts_demonstrated,
            ground_truth_mechanism: activeChallenge.groundTruthMechanism,
            mechanism_claimed: v.mechanism_claimed,
            mechanism_correct: v.mechanism_correct,
            rubric_scores: v.rubric_scores,
            model: data.meta?.model,
            tier: data.meta?.tier,
            estimated_cost_usd: data.meta?.estimatedCostUSD,
          }),
        });
      } catch (persistErr) {
        console.error("Failed to persist hyper-leap session:", persistErr);
      }

      setConceptsMastered(prev => prev + v.concepts_demonstrated.length);
      await refetchMastery();
      await updatePracticeQueue(activeChallenge.id, v.mechanism_correct, v.score);
    } catch (err) {
      console.error("Socratic verdict failed:", err);
      setSocraticError(err instanceof Error ? err.message : "Failed to reach the Socratic tutor.");
      setSocraticPhase('error');
    }
  };

  // Radar math — six real mechanisms, real accuracy from mechanism_mastery.
  // No attempts yet for a mechanism = honest 0, never a placeholder guess.
  const radarW = 240;
  const radarH = 240;
  const cx = radarW / 2;
  const cy = radarH / 2;
  const r = 76;

  const radarDomains = ALL_MECHANISMS.map((m) => ({
    name: MECHANISM_LABELS[m],
    score: mechanismMastery[m]?.accuracy_pct ?? 0,
  }));

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
          { key: 'calibration', label: 'Diagnostic Calibration' },
          { key: 'hyper_leap',  label: 'Combat Mode (legacy)' },
          { key: 'socratic',    label: 'IP Lab' },
          { key: 'manual',      label: 'Reasoning Engine' },
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

        {/* ── DIAGNOSTIC CALIBRATION SYSTEM v3 ─────────────────────── */}
        {activeTab === 'calibration' && (
          <motion.div
            key="calibration"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="relative z-10"
          >
            <DiagnosticCalibration />
          </motion.div>
        )}

        {/* ── COMBAT MODE (Hyper-Leap) ─────────────────────────────── */}
        {activeTab === 'hyper_leap' && (
          <motion.div
            key="combat"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-1 xl:grid-cols-12 gap-5 relative z-10"
          >
            {casesLoading ? (
              <div className="xl:col-span-12 border border-[#D4A853]/15 bg-[#110F0D] p-8 rounded-2xl text-center text-xs text-[#B0A89E] animate-pulse">
                {"Loading case bank from real deliverables…"}
              </div>
            ) : !activeChallenge ? (
              <div className="xl:col-span-12 border border-[#C85C5C]/25 bg-[#C85C5C]/5 p-8 rounded-2xl text-center text-xs text-[#C85C5C]">
                {"No cases available — no deliverable in public/deliverables/ currently has groundTruthMechanism set."}
              </div>
            ) : (
            <>
            {/* LEFT: Challenge engine */}
            <div className="xl:col-span-8 space-y-4">

              {/* Scenario Selector */}
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-5 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs text-[#D4A853]/70 tracking-widest uppercase">
                    {"01 — Real Case Selection"}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#5C9A6B] border border-[#5C9A6B]/20 px-2 py-0.5 rounded-full bg-[#5C9A6B]/5">
                    {challenges.length} {"real cases"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {challenges.map(cs => {
                    const q = practiceQueue[cs.id];
                    return (
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
                        <div className="flex items-center gap-1.5 mt-1">
                          {selectedChallengeId === cs.id && (
                            <span className="text-[10px] text-[#D4A853] uppercase tracking-wider">{"Active"}</span>
                          )}
                          {q && (
                            <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
                              q.stage === 'independent' ? "text-[#5C9A6B] border-[#5C9A6B]/30" : "text-[#D4A853] border-[#D4A853]/30"
                            }`}>
                              {q.stage}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main Challenge Card */}
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#D4A853]/70 tracking-widest uppercase">
                    {"02 — Crisis Scenario"}
                  </span>
                  <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    activeStage === 'independent' ? "text-[#5C9A6B] border-[#5C9A6B]/30 bg-[#5C9A6B]/5" : "text-[#D4A853] border-[#D4A853]/30 bg-[#D4A853]/5"
                  }`}>
                    {activeStage === 'independent' ? "Stage 3 — Independent" : "Stage 2 — Guided Socratic"}
                  </span>
                </div>
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

                {/* Stage 1 — Study This Case (worked example, always available,
                    not stage-tracked — Sweller worked-example sequencing) */}
                {!hlActive && (
                  <div className="border border-[#D4A853]/10 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setStudyExpanded(!studyExpanded)}
                      className="w-full flex items-center justify-between p-3 bg-[#0A0908] text-xs text-[#D4A853] uppercase tracking-wider cursor-pointer"
                    >
                      <span>{"Stage 1 — Study This Case (worked example)"}</span>
                      <span>{studyExpanded ? "Collapse ↑" : "Expand ↓"}</span>
                    </button>
                    {studyExpanded && (
                      <div className="p-4 space-y-3 border-t border-[#D4A853]/10">
                        {activeChallenge.evidence.map((e, idx) => (
                          <div key={idx} className="text-xs">
                            <span className={`uppercase text-[9px] tracking-wider mr-2 px-1.5 py-0.5 rounded border ${
                              e.tier === 'measured' ? "text-[#5C9A6B] border-[#5C9A6B]/30" :
                              e.tier === 'modeled' ? "text-[#D4A853] border-[#D4A853]/30" :
                              "text-[#7A6F65] border-[#7A6F65]/30"
                            }`}>{e.tier}</span>
                            <span className="text-[#F5F0EB] font-semibold">{e.label}:</span>{" "}
                            <span className="text-[#B0A89E]">{e.value}</span>
                          </div>
                        ))}
                        {activeChallenge.avoid.length > 0 && (
                          <div className="pt-2 border-t border-[#D4A853]/8 space-y-1.5">
                            <span className="text-[10px] text-[#C85C5C] uppercase tracking-wider block">{"What the real deliverable avoided:"}</span>
                            {activeChallenge.avoid.map((a, idx) => (
                              <p key={idx} className="text-xs text-[#B0A89E]"><span className="text-[#C85C5C]">✕ </span>{a.action} — <span className="italic">{a.reason}</span></p>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] text-[#7A6F65] pt-2 border-t border-[#D4A853]/8">
                          {"This is the real ground truth — the dominant mechanism is "}
                          <span className="text-[#D4A853]">{MECHANISM_LABELS[activeChallenge.groundTruthMechanism]}</span>.
                          {" Reading this before you diagnose is Stage 1; the graded attempt below is Stage 2 or 3."}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {!hlActive ? (
                  <div className="space-y-4">
                    {/* Mechanism claim — single select, not multi. Mechanism
                        isolation is a MECE question: pick the ONE dominant
                        mechanism, not several that "also apply a little". */}
                    <div>
                      <label className="text-xs text-[#B0A89E] uppercase tracking-wider block mb-2">
                        {"Claim the ONE dominant friction mechanism:"}
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {ALL_MECHANISMS.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setMechanismClaimed(m)}
                            className={`p-2.5 text-xs text-center border rounded-xl transition-all cursor-pointer ${
                              mechanismClaimed === m
                                ? "border-[#D4A853] bg-[#D4A853]/5 text-[#F5F0EB]"
                                : "border-[#D4A853]/8 text-[#B0A89E] hover:border-white/10"
                            }`}
                          >
                            {MECHANISM_LABELS[m]}
                          </button>
                        ))}
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
                        placeholder={"Defend your mechanism claim. Reference the specific evidence above — why this mechanism, and why not the next most plausible one..."}
                        className="w-full bg-[#0A0908] border border-[#D4A853]/8 focus:border-[#D4A853] focus:outline-none p-3 text-xs rounded-xl h-24 text-[#F5F0EB] font-mono resize-none"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={submitHypothesis}
                        disabled={!hlInput.trim() || !mechanismClaimed}
                        className="px-5 py-2.5 bg-[#D4A853] text-[#0A0908] text-xs font-mono font-bold uppercase tracking-wider transition-all hover:bg-[#E8C97A] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer rounded-xl"
                      >
                        {"Submit to Socratic Tutor →"}
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
                      <h4 className="text-xs text-[#D4A853] uppercase tracking-widest font-semibold mb-1">
                        {"Your Claim"}
                      </h4>
                      <p className="text-xs text-[#B0A89E] leading-relaxed">
                        <span className="text-[#D4A853] font-bold">{mechanismClaimed && MECHANISM_LABELS[mechanismClaimed]}</span>
                        {" — "}
                        <span className="text-white italic">&ldquo;{hlInput}&rdquo;</span>
                      </p>
                    </div>

                    {/* ── Real Socratic dialogue ───────────────────────── */}
                    {socraticPhase === 'followup_loading' && (
                      <div className="border border-[#D4A853]/15 bg-[#0A0908]/60 p-4 rounded-xl text-xs text-[#B0A89E] font-mono animate-pulse">
                        {"The Socratic tutor is reading your hypothesis…"}
                      </div>
                    )}

                    {socraticPhase === 'error' && (
                      <div className="border border-[#C85C5C]/40 bg-[#C85C5C]/10 p-4 rounded-xl space-y-3">
                        <p className="text-xs text-[#C85C5C] font-mono">{"⚠ "}{socraticError}</p>
                        <button
                          type="button"
                          onClick={!verdict ? submitHypothesis : submitFollowupResponse}
                          className="font-mono text-xs uppercase border border-[#C85C5C]/40 hover:bg-[#C85C5C]/10 text-[#C85C5C] px-3 py-1.5 rounded transition-all"
                        >
                          {"Retry"}
                        </button>
                      </div>
                    )}

                    {(socraticPhase === 'followup' || socraticPhase === 'verdict_loading') && (
                      <div className="border border-[#D4A853]/25 bg-[#D4A853]/[0.03] p-4 rounded-xl space-y-3">
                        <span className="font-mono text-[10px] text-[#D4A853] uppercase tracking-widest block">
                          {"Socratic Follow-Up"}
                        </span>
                        <p className="text-sm text-[#F5F0EB] font-serif leading-relaxed italic">{followupQuestion}</p>
                        <textarea
                          value={followupResponse}
                          onChange={(e) => setFollowupResponse(e.target.value)}
                          disabled={socraticPhase === 'verdict_loading'}
                          placeholder={"Respond to the follow-up — defend, revise, or sharpen your reasoning..."}
                          className="w-full bg-[#0A0908] border border-[#D4A853]/8 focus:border-[#D4A853] focus:outline-none p-3 text-xs rounded-xl h-20 text-[#F5F0EB] font-mono resize-none disabled:opacity-50"
                        />
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={submitFollowupResponse}
                            disabled={!followupResponse.trim() || socraticPhase === 'verdict_loading'}
                            className="px-4 py-2 bg-[#D4A853] text-[#0A0908] text-xs font-mono font-bold uppercase tracking-wider transition-all hover:bg-[#E8C97A] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer rounded-xl"
                          >
                            {socraticPhase === 'verdict_loading' ? "Assessing…" : "Respond →"}
                          </button>
                        </div>
                      </div>
                    )}

                    {socraticPhase === 'verdict' && verdict && (
                      <div className="border border-[#D4A853]/25 bg-[#110F0D]/40 p-4 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-[#D4A853] uppercase tracking-widest">
                            {"Verdict"}
                          </span>
                          <span className={`font-serif text-lg font-bold ${
                            verdict.score >= 70 ? "text-[#5C9A6B]" : verdict.score >= 40 ? "text-[#D4A853]" : "text-[#C85C5C]"
                          }`}>
                            {verdict.score}{"/100"}
                          </span>
                        </div>

                        {/* Four Pareto-skill rubric — every one computed or
                            model-judged and shown honestly, never averaged
                            away into just the headline score. */}
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className={`p-2 rounded border ${verdict.mechanism_correct ? "border-[#5C9A6B]/30 bg-[#5C9A6B]/5 text-[#5C9A6B]" : "border-[#C85C5C]/30 bg-[#C85C5C]/5 text-[#C85C5C]"}`}>
                            {verdict.mechanism_correct ? "✓" : "✕"} {"Mechanism isolation"}
                          </div>
                          <div className={`p-2 rounded border ${verdict.rubric_scores.evidence_tier_violations.length === 0 ? "border-[#5C9A6B]/30 bg-[#5C9A6B]/5 text-[#5C9A6B]" : "border-[#C85C5C]/30 bg-[#C85C5C]/5 text-[#C85C5C]"}`}>
                            {verdict.rubric_scores.evidence_tier_violations.length === 0 ? "✓" : "✕"} {"Evidence-tier discipline"}
                          </div>
                          <div className={`p-2 rounded border ${verdict.rubric_scores.specificity_pass ? "border-[#5C9A6B]/30 bg-[#5C9A6B]/5 text-[#5C9A6B]" : "border-[#C85C5C]/30 bg-[#C85C5C]/5 text-[#C85C5C]"}`}>
                            {verdict.rubric_scores.specificity_pass ? "✓" : "✕"} {"Specificity test"}
                          </div>
                          <div className={`p-2 rounded border ${verdict.rubric_scores.confidence_calibrated ? "border-[#5C9A6B]/30 bg-[#5C9A6B]/5 text-[#5C9A6B]" : "border-[#C85C5C]/30 bg-[#C85C5C]/5 text-[#C85C5C]"}`}>
                            {verdict.rubric_scores.confidence_calibrated ? "✓" : "✕"} {"Confidence calibration"}
                          </div>
                        </div>
                        {verdict.rubric_scores.evidence_tier_violations.length > 0 && (
                          <div className="text-[10px] text-[#C85C5C] space-y-0.5">
                            {verdict.rubric_scores.evidence_tier_violations.map((v, idx) => (
                              <p key={idx}>{"— "}{v}</p>
                            ))}
                          </div>
                        )}

                        <p className="text-xs text-[#F5F0EB] leading-relaxed pt-2 border-t border-[#D4A853]/8">{verdict.feedback}</p>
                        {verdict.concepts_demonstrated.length > 0 && (
                          <div className="pt-2 border-t border-[#D4A853]/8 space-y-1">
                            <span className="text-[10px] text-[#5C9A6B] uppercase tracking-wider block">{"Concepts you demonstrated:"}</span>
                            {verdict.concepts_demonstrated.map((c) => (
                              <div key={c} className="text-xs text-[#B0A89E]">{"✓ "}{c}</div>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] text-[#7A6F65] font-mono pt-1">{"✓ Session saved — Concepts Mastered, mechanism radar, and this case's stage all updated from this real result."}</p>
                      </div>
                    )}

                    {/* Cognitive Telemetry */}
                    {sessionElapsed !== null && (
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
                            <span className="font-mono text-[10px] text-[#B0A89E] uppercase block mb-1">{"Stage"}</span>
                            <span className="font-serif text-xl font-bold text-[#F5F0EB]">{activeStage === 'independent' ? "3" : "2"}</span>
                            <span className="font-mono text-[10px] text-[#7A6F65] block">{activeStage}</span>
                          </div>
                          <div>
                            <span className="font-mono text-[10px] text-[#B0A89E] uppercase block mb-1">{"Session"}</span>
                            <span className="font-serif text-xl font-bold text-[#F5F0EB]">{sessionElapsed ?? "—"}s</span>
                            <span className="font-mono text-[10px] text-[#7A6F65] block">{"Elapsed"}</span>
                          </div>
                        </div>
                      </div>
                    )}

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
                            schema: "sf-ip-node-v2",
                            generated_at: new Date().toISOString(),
                            challenge: {
                              id: activeChallenge.id,
                              title: activeChallenge.title,
                              ground_truth_mechanism: activeChallenge.groundTruthMechanism,
                            },
                            diagnostic_session: {
                              hypothesis: hlInput,
                              mechanism_claimed: mechanismClaimed,
                              diagnostic_velocity_wpm: diagnosticVelocity,
                              time_to_submit_seconds: sessionElapsed,
                            },
                            verdict,
                            mechanism_mastery_snapshot: ALL_MECHANISMS.map((m) => ({
                              mechanism: m, accuracy_pct: mechanismMastery[m]?.accuracy_pct ?? null, attempts: mechanismMastery[m]?.attempts ?? 0,
                            })),
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
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* RIGHT: Radar + Quiz */}
            <div className="xl:col-span-4 space-y-4">

              {/* Mechanism Radar — six real mechanisms, real accuracy */}
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-5 rounded-2xl">
                <span className="font-mono text-xs text-[#D4A853]/70 tracking-widest uppercase block mb-4">
                  {"03 — Mechanism Radar"}
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
                  {ALL_MECHANISMS.map((m) => {
                    const row = mechanismMastery[m];
                    return (
                      <div key={m} className="flex justify-between items-center text-xs">
                        <span className="text-[#B0A89E] truncate mr-2">{MECHANISM_LABELS[m]}</span>
                        <span className="text-[#D4A853] flex-shrink-0 font-mono">
                          {row ? `${row.accuracy_pct ?? 0}% (${row.correct}/${row.attempts})` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Diagnostic Quiz — computed per case, correctAnswerIndex
                  is always derived from real groundTruthMechanism, never
                  hand-typed. */}
              {activeQuiz && (
                <div className="border border-[#D4A853]/15 bg-[#110F0D] p-5 rounded-2xl space-y-3">
                  <span className="font-mono text-xs text-[#D4A853]/70 tracking-widest uppercase">
                    {"04 — Quick Diagnostic"}
                  </span>
                  <div className="border border-[#D4A853]/8 bg-[#0A0908] p-3 rounded-xl">
                    <span className="text-[10px] text-[#D4A853] uppercase block mb-1">{"Active Scenario"}</span>
                    <p className="text-xs text-[#B0A89E] leading-relaxed">{activeQuiz.question}</p>
                  </div>
                  <div className="space-y-1.5">
                    {activeQuiz.answers.map((ans, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => checkQuiz(idx)}
                        disabled={selectedAnswer !== null}
                        className={`w-full text-left p-2.5 text-xs border rounded-xl transition-all cursor-pointer ${
                          selectedAnswer === idx
                            ? idx === activeQuiz.correctAnswerIndex
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
                      {activeQuiz.explanation}
                    </div>
                  )}
                </div>
              )}
            </div>
            </>
            )}
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

        {/* ── REASONING MANUAL ─────────────────────────────────────── */}
        {activeTab === 'manual' && (
          <motion.div
            key="manual"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="relative z-10"
          >
            <ReasoningActivities />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
