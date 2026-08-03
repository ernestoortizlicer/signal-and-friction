"use client";

// Replaces the old static "Reasoning Manual" tab (deleted 2026-08-03, per
// explicit instruction: "do not preserve the current concept of a
// Reasoning Manual... never again a passive documentation tab that simply
// displays theory"). Everything here is powered by src/domain/reasoning —
// the same registry the scaffold/deliverable pipeline will consume once
// Phase 3/4 land — there is no second, Learning-only copy of the theory.
//
// Two activity types are real and working today, because they need
// nothing beyond what the registry already contains:
//   - Active Recall: retrieval practice against a mechanism's real
//     underlying-mechanism explanation, self-graded against a rubric.
//   - Evidence Calibration: the same, scoped to the weak/mixed-evidence
//     entries specifically — direct practice at not overclaiming Choice
//     Overload or the Zeigarnik Effect.
// Mechanism Comparison, Case Analysis, and Diagnostic Practice need real
// authored content (a genuine comparison pair, a real case) that doesn't
// exist yet — shown as real, visibly disabled tiles, not fake-functional
// buttons, per this session's standing rule against fabricated UI.
//
// Session progress here is intentionally NOT written into practice_queue/
// mechanism_mastery — those tables track the 6 canonical friction
// mechanisms (Combat Mode/IP Lab's domain), a different concept than the
// 21 reasoning mechanisms. Forcing this into that schema would conflate
// two distinct ideas the architecture is supposed to keep separate.
// Local session-only state for now; a dedicated persistence table is a
// real follow-up, not something to fake here.

import { useMemo, useState } from "react";
import {
  MECHANISMS,
  FAMILIES,
  LEARNING_PROMPTS,
  getMechanism,
  getFamily,
  type LearningPrompt,
  type LearningPromptType,
} from "@/domain/reasoning";

const EVIDENCE_STYLES: Record<string, string> = {
  strong: "text-[#5C9A6B] border-[#5C9A6B]/40 bg-[#5C9A6B]/8",
  mixed: "text-[#C85C5C] border-[#C85C5C]/40 bg-[#C85C5C]/8",
  contextual: "text-[#D4A853] border-[#D4A853]/40 bg-[#D4A853]/8",
  weak: "text-[#C85C5C] border-[#C85C5C]/40 bg-[#C85C5C]/8",
};

interface ActivityDef {
  type: LearningPromptType;
  label: string;
  description: string;
  available: boolean;
}

const ACTIVITIES: ActivityDef[] = [
  { type: "recall", label: "Active Recall", description: "Retrieve a mechanism's real underlying process from memory before you see it again.", available: true },
  { type: "evidence-calibration", label: "Evidence Calibration", description: "Drills specifically on the weak/mixed-evidence entries — where overclaiming actually happens.", available: true },
  { type: "comparison", label: "Mechanism Comparison", description: "Distinguish two mechanisms that are easy to conflate in practice.", available: false },
  { type: "case-analysis", label: "Case Analysis", description: "Apply a mechanism to a real, anonymized deliverable case.", available: false },
  { type: "diagnostic-practice", label: "Diagnostic Practice", description: "Full diagnosis practice against a synthetic interface case.", available: false },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function PromptRunner({ prompts, onExit }: { prompts: LearningPrompt[]; onExit: () => void }) {
  const [queue] = useState(() => shuffle(prompts));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState<("correct" | "incorrect")[]>([]);

  const current = queue[index];
  const mechanism = getMechanism(current.mechanismId);
  const family = mechanism ? getFamily(mechanism.familyId) : undefined;
  const done = index >= queue.length;

  function mark(result: "correct" | "incorrect") {
    setResults((prev) => [...prev, result]);
    setRevealed(false);
    setAnswer("");
    setIndex((i) => i + 1);
  }

  if (done) {
    const correctCount = results.filter((r) => r === "correct").length;
    return (
      <div className="border border-[#D4A853]/15 bg-[#110F0D] rounded-2xl p-8 text-center space-y-4">
        <span className="font-mono text-xs text-[#D4A853]/70 uppercase tracking-widest block">Session complete</span>
        <p className="font-serif text-2xl text-white">
          {correctCount} / {queue.length} self-marked correct
        </p>
        <p className="text-xs text-[#7A6F65] font-mono">Self-assessed, not AI-graded — the rubric is a check against your own honesty, not a score to optimize.</p>
        <button type="button" onClick={onExit} className="font-mono text-xs uppercase tracking-widest text-[#D4A853] border border-[#D4A853]/30 rounded-full px-4 py-2 hover:bg-[#D4A853]/10 cursor-pointer">
          Back to activities
        </button>
      </div>
    );
  }

  return (
    <div className="border border-[#D4A853]/15 bg-[#110F0D] rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-[#7A6F65] uppercase tracking-widest">
          {index + 1} / {queue.length}
          {family ? ` · ${family.title}` : ""}
        </span>
        <button type="button" onClick={onExit} className="font-mono text-[10px] text-[#7A6F65] hover:text-[#B0A89E] uppercase tracking-widest cursor-pointer">
          Exit
        </button>
      </div>

      <p className="font-serif text-lg text-white leading-snug">{current.question}</p>

      {!revealed ? (
        <div className="space-y-3">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            placeholder="Answer from memory before revealing — that retrieval effort is the point."
            className="w-full bg-black/30 border border-[#D4A853]/15 rounded-lg px-3 py-2 text-sm text-[#F5F0EB] placeholder:text-[#7A6F65] focus:outline-none focus:border-[#D4A853]/40"
          />
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="font-mono text-xs uppercase tracking-widest text-[#D4A853] border border-[#D4A853]/30 rounded-full px-4 py-2 hover:bg-[#D4A853]/10 cursor-pointer"
          >
            Reveal
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {mechanism && (
            <div className="border-t border-[#D4A853]/8 pt-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-serif text-base font-bold text-white">{mechanism.name}</h3>
                <span className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${EVIDENCE_STYLES[mechanism.evidenceStrength]}`}>
                  {mechanism.evidenceStrength}
                </span>
              </div>
              <p className="text-xs text-[#B0A89E] leading-relaxed">{mechanism.underlyingMechanism}</p>
              {current.expectedConcepts.length > 0 && (
                <div>
                  <span className="font-mono text-[10px] text-[#7A6F65] uppercase tracking-widest block mb-1">Expected concepts</span>
                  <ul className="text-xs text-[#B0A89E] leading-relaxed list-disc pl-4 space-y-1">
                    {current.expectedConcepts.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {current.rubric.length > 0 && (
                <div>
                  <span className="font-mono text-[10px] text-[#7A6F65] uppercase tracking-widest block mb-1">Self-check rubric</span>
                  <ul className="text-xs text-[#B0A89E] leading-relaxed list-disc pl-4 space-y-1">
                    {current.rubric.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => mark("correct")}
              className="font-mono text-xs uppercase tracking-widest text-[#5C9A6B] border border-[#5C9A6B]/30 rounded-full px-4 py-2 hover:bg-[#5C9A6B]/10 cursor-pointer"
            >
              I had this
            </button>
            <button
              type="button"
              onClick={() => mark("incorrect")}
              className="font-mono text-xs uppercase tracking-widest text-[#C85C5C] border border-[#C85C5C]/30 rounded-full px-4 py-2 hover:bg-[#C85C5C]/10 cursor-pointer"
            >
              I missed this
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReasoningActivities() {
  const [activeType, setActiveType] = useState<LearningPromptType | null>(null);

  const promptsForType = useMemo(
    () => (activeType ? LEARNING_PROMPTS.filter((p) => p.promptType === activeType) : []),
    [activeType]
  );

  if (activeType && promptsForType.length > 0) {
    return <PromptRunner prompts={promptsForType} onExit={() => setActiveType(null)} />;
  }

  return (
    <div className="space-y-8">
      <div className="border border-[#D4A853]/20 bg-[#D4A853]/[0.03] rounded-2xl p-6 space-y-2">
        <span className="font-mono text-[10px] text-[#D4A853] uppercase tracking-[0.2em] block">Epistemic Standard</span>
        <p className="text-sm text-[#F5F0EB] leading-relaxed">
          Every mechanism below is a <strong className="text-white">hypothesis for interpretation</strong>, never an automatic explanation for why a page converts poorly. These activities train recall and calibration — they don&apos;t replace evidence gathered on a real funnel.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ACTIVITIES.map((activity) => (
          <button
            key={activity.type}
            type="button"
            disabled={!activity.available}
            onClick={() => activity.available && setActiveType(activity.type)}
            className={`text-left border rounded-2xl p-5 space-y-2 transition-colors ${
              activity.available
                ? "border-[#D4A853]/20 bg-[#110F0D] hover:border-[#D4A853]/40 cursor-pointer"
                : "border-[#7A6F65]/15 bg-[#110F0D]/40 cursor-not-allowed opacity-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-bold text-white">{activity.label}</h3>
              {!activity.available && (
                <span className="font-mono text-[9px] text-[#7A6F65] uppercase tracking-wider border border-[#7A6F65]/25 rounded-full px-2 py-0.5">
                  Coming soon
                </span>
              )}
            </div>
            <p className="text-xs text-[#B0A89E] leading-relaxed">{activity.description}</p>
            {activity.available && (
              <span className="font-mono text-[10px] text-[#D4A853]/70 uppercase tracking-widest block pt-1">
                {LEARNING_PROMPTS.filter((p) => p.promptType === activity.type).length} prompts
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="border-t border-[#D4A853]/8 pt-6">
        <span className="font-mono text-[10px] text-[#7A6F65] uppercase tracking-widest block mb-3">
          Registry — {FAMILIES.length} families, {MECHANISMS.length} mechanisms
        </span>
        <p className="text-xs text-[#7A6F65] leading-relaxed max-w-2xl">
          The full mechanism detail (definition, evidence strength, diagnostic questions, misinterpretations) surfaces during Active Recall and Evidence Calibration, after you attempt retrieval — not as a standalone browse-first reference. That&apos;s deliberate: reading theory passively is exactly what this replaced.
        </p>
      </div>
    </div>
  );
}
