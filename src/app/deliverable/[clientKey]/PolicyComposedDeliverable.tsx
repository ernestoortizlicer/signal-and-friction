/**
 * PolicyComposedDeliverable — Phase 4.3
 * ════════════════════════════════════════════════════════════════════════════
 * The service-aware client experience. Composed from small, reusable
 * modules (several imported from DeliverableClientView.tsx, several new
 * here) driven by a ServiceDeliveryPolicy — never a monolithic per-tier
 * page. Field presence still controls whether a module HAS content; the
 * policy controls whether that content is allowed to appear in the
 * purchased experience at all. A "withheld"/"unsupported" module never
 * renders here even if the underlying data happens to be present — the
 * policy is the gate, not what an admin typed into a form that day.
 *
 * Only ever reached from DeliverableClientView.tsx when d.offerPriceId
 * resolves to a real policy — every deliverable without that field takes
 * the original, completely untouched rendering path.
 */
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { DeliverableData } from "../fallback";
import type { ServiceDeliveryPolicy, DeliverableModulePolicy } from "@/lib/delivery-policy";
import { computeTechnicalMovement } from "@/lib/monitoring-comparison";
import {
  DWY_AUTONOMY_CURRICULUM,
  DFY_AUTONOMY_CURRICULUM,
  curriculumToChecklistItems,
  curriculumToLearningModules,
  curriculumToRunbookText,
} from "@/lib/autonomy-curriculum";
import { NOT_YET_DELIVERED } from "@/lib/dosing";
import {
  EvidenceSection,
  ConfidenceBadge,
  ImpactRangeBlock,
  AvoidSection,
  RecommendationWithheldCard,
  FinalDecisionCard,
  LoomSection,
  BehavioralInterpretationSection,
  UnknownsSection,
  BeforeAfterSlider,
} from "./shared-modules";

function shows(policy: DeliverableModulePolicy | undefined): boolean {
  return policy === "required" || policy === "allowed";
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-[#B0A89E] mb-4">{children}</h2>
  );
}

// A "required" module with no real content renders this instead of
// nothing — an honest, calm statement of absence, never a blank gap that
// reads as broken, and never silently omitted the way an "allowed"
// module's absence is.
function PendingModule({ label, note }: { label: string; note: string }) {
  return (
    <div className="border border-[#7A6F65]/15 bg-[#7A6F65]/[0.02] p-6 rounded space-y-2">
      <span className="font-mono text-xs uppercase tracking-wider text-[#7A6F65]">{label}</span>
      <p className="text-sm text-[#7A6F65] leading-relaxed max-w-[60ch] italic">{note}</p>
    </div>
  );
}

// ── New modules — content genuinely distinct from a prose recommendation ──

// DWY Intervention's defining module. Built entirely from data that
// already exists (finalDecision + avoid + projectedImpactNote) — the
// differentiation is structural (sequenced steps) and visual, not a new
// data source, since the scaffold's 7 fields have no separate
// "implementation steps" concept of their own.
function ImplementationPlanModule({ data }: { data: DeliverableData }) {
  const decision = data.diagnosis?.finalDecision;
  if (!decision?.action) {
    return <PendingModule label="Implementation Plan" note="The decision hasn't been finalized on the scaffold yet." />;
  }
  const steps: { title: string; body: string }[] = [
    { title: "1. Do this", body: decision.action },
  ];
  if (data.avoid?.length) {
    steps.push({ title: "2. Avoid this while you do it", body: data.avoid.map((a) => a.action).join(" ") });
  }
  if (data.projectedImpactNote || data.projectedImpact) {
    steps.push({
      title: `${steps.length + 1}. Expected outcome`,
      body: data.projectedImpactNote ?? `${data.projectedImpact!.low}–${data.projectedImpact!.high}${data.projectedImpact!.unit} on ${data.projectedImpact!.step}.`,
    });
  }
  return (
    <div className="space-y-4">
      {steps.map((s, i) => (
        <div key={i} className="border border-[#D4A853]/12 bg-[#110F0D]/40 p-5 rounded space-y-1.5">
          <span className="font-mono text-xs uppercase tracking-wider text-[#D4A853]">{s.title}</span>
          <p className="text-base text-[#B0A89E] leading-relaxed max-w-[65ch]">{s.body}</p>
        </div>
      ))}
    </div>
  );
}

// DFY Intervention/Expansion's defining module. dosed.dfyDelivery's
// sub-fields are ALWAYS a real string once dfyDelivery exists — either
// genuine analyst-written content, or dosing.ts's own honest
// NOT_YET_DELIVERED label ("Not yet delivered.") — so this never needs a
// separate empty-state branch; the string itself already carries the
// honest state when nothing's been written yet.
function ExecutionSummaryModule({ text }: { text: string }) {
  return (
    <div className="border border-[#D4A853]/12 bg-[#110F0D]/40 p-6 md:p-8 rounded space-y-2">
      <span className="font-mono text-xs uppercase tracking-wider text-[#D4A853]">What We Did</span>
      <p className="text-base text-[#B0A89E] leading-relaxed max-w-[65ch]">{text}</p>
    </div>
  );
}

// Phase 6.3 — the Monitoring launch-state decision. Rather than build a
// funnel/analytics pipeline nobody grants access to by default (or sell
// a promise with nothing behind it, or pull the service), Monitoring is
// reframed around what the existing scan engine already, honestly
// measures: real technical evidence, before vs. after, using the same
// PageSpeed/HTML scanner that has produced every "measured" evidence row
// since Phase 1. See supabase/migrations/20260812000000_scaffold_
// monitoring_baseline.sql and the "Set as Monitoring Baseline" admin
// action (src/app/admin/scaffolds/page.tsx) for where technicalBaseline
// actually gets captured — never automatically, only on a deliberate
// analyst action once the diagnosed fix is confirmed live.
// Pure comparison logic lives in src/lib/monitoring-comparison.ts (a
// plain .ts file, testable via node — see monitoring-comparison.test.mjs)
// — this component only renders whatever it returns.
function TechnicalMovementComparison({
  baseline,
  current,
  capturedAt,
}: {
  baseline: Record<string, unknown>;
  current: Record<string, unknown>;
  capturedAt?: string | null;
}) {
  const rows = computeTechnicalMovement(baseline, current);
  if (rows.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border text-[#5C9A6B] border-[#5C9A6B]/40 bg-[#5C9A6B]/8">
          measured
        </span>
        {capturedAt && (
          <span className="font-mono text-[10px] text-[#7A6F65]">
            Baseline captured {new Date(capturedAt).toLocaleDateString()}
          </span>
        )}
      </div>
      <div className="border border-[#D4A853]/10 rounded overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-[#D4A853]/10 text-[#7A6F65] uppercase text-[10px]">
              <th className="text-left p-2">Signal</th>
              <th className="text-left p-2">Before</th>
              <th className="text-left p-2">Now</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-white/5 last:border-b-0">
                <td className="p-2 text-[#B0A89E]">{r.label}</td>
                <td className="p-2 text-[#7A6F65]">{r.before}</td>
                <td className={`p-2 ${r.moved ? "text-[#5C9A6B] font-bold" : "text-[#F5F0EB]"}`}>{r.after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[#7A6F65] leading-relaxed max-w-[60ch]">
        This confirms whether the technical conditions behind the original diagnosis have changed — not a
        direct measurement of your conversion rate, which requires access to your funnel data we don&apos;t
        have unless you grant it.
      </p>
    </div>
  );
}

function MonitoringFindingsModule({
  dfyText,
  technicalBaseline,
  technicalCurrent,
  baselineCapturedAt,
}: {
  dfyText: string | null;
  technicalBaseline?: Record<string, unknown> | null;
  technicalCurrent?: Record<string, unknown> | null;
  baselineCapturedAt?: string | null;
}) {
  const hasComparison = !!(technicalBaseline && technicalCurrent);
  return (
    <div className="border border-[#D4A853]/12 bg-[#110F0D]/40 p-6 md:p-8 rounded space-y-4">
      <span className="font-mono text-xs uppercase tracking-wider text-[#D4A853]">What We Found</span>
      {dfyText && <p className="text-base text-[#B0A89E] leading-relaxed max-w-[65ch]">{dfyText}</p>}
      {hasComparison && (
        <TechnicalMovementComparison
          baseline={technicalBaseline!}
          current={technicalCurrent!}
          capturedAt={baselineCapturedAt}
        />
      )}
      {!dfyText && !hasComparison && (
        <p className="text-sm text-[#7A6F65] leading-relaxed max-w-[60ch] italic">
          Monitoring baseline not yet captured — this begins once the diagnosed fix is confirmed live and the
          analyst captures a before-state to compare against. Not a claim that nothing changed; a stated timing
          gap.
        </p>
      )}
    </div>
  );
}

// DFY Autonomy's defining module — an institutional runbook, deliberately
// not styled like the DWY founder checklist (different job: a team
// artifact, not a self-serve training UI). Falls back to the standard
// Signal & Friction DFY curriculum (autonomy-curriculum.ts) when the
// analyst hasn't yet hand-written handoff_documentation for this client —
// dosing.ts's NOT_YET_DELIVERED sentinel is an honest "not yet", not a
// reason to leave a paid capability-transfer tier empty.
function TeamRunbookModule({ text }: { text: string }) {
  const usingStandardCurriculum = !text.trim() || text === NOT_YET_DELIVERED;
  const body = usingStandardCurriculum ? curriculumToRunbookText(DFY_AUTONOMY_CURRICULUM) : text;
  return (
    <div className="border border-[#D4A853]/15 bg-[#0A0908] p-6 md:p-10 rounded-lg space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853]" />
        <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#D4A853]">Operating Runbook — Internal Handoff</span>
      </div>
      {usingStandardCurriculum && (
        <p className="font-mono text-xs uppercase tracking-wider text-[#7A6F65]">
          Standard Signal &amp; Friction Framework — not yet customized for this client
        </p>
      )}
      <p className="text-base text-[#B0A89E] leading-relaxed max-w-[70ch] whitespace-pre-line">{body}</p>
    </div>
  );
}

// DWY Autonomy's defining module — the existing checklist/learningModules
// UI, now gated by policy rather than rendered purely on presence. When no
// per-client checklist/learningModules have been hand-authored yet, this
// renders the standard Signal & Friction curriculum (autonomy-curriculum.ts)
// instead of a pending state — per-client content still wins whenever it
// exists, but "not yet added" is no longer the honest default for a paid
// tier whose entire promise is capability transfer.
function FounderLearningModule({ data }: { data: DeliverableData }) {
  const usingStandardCurriculum = !data.checklist?.length && !data.learningModules?.length;
  const [checklist, setChecklist] = useState(
    data.checklist?.length ? data.checklist : curriculumToChecklistItems(DWY_AUTONOMY_CURRICULUM)
  );
  const learningModules = data.learningModules?.length ? data.learningModules : curriculumToLearningModules(DWY_AUTONOMY_CURRICULUM);
  const [selectedId, setSelectedId] = useState<string | null>(learningModules[0]?.id ?? null);
  const active = learningModules.find((m) => m.id === selectedId);
  const toggle = (id: string) => setChecklist((prev) => prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c)));

  return (
    <div className="space-y-6">
      {usingStandardCurriculum && (
        <p className="font-mono text-xs uppercase tracking-wider text-[#7A6F65]">
          Standard Signal &amp; Friction Framework — not yet customized for this client
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
      {checklist.length > 0 && (
        <div className="space-y-4">
          <span className="font-mono text-xs uppercase tracking-wider text-[#D4A853]">Self-Diagnosis Checklist</span>
          <div className="space-y-2">
            {checklist.map((item) => (
              <div
                key={item.id}
                onClick={() => toggle(item.id)}
                className={`flex items-start gap-3 p-3.5 border rounded cursor-pointer transition-colors ${item.done ? "bg-[#5C9A6B]/5 border-[#5C9A6B]/20" : "bg-[#110F0D]/40 border-[#D4A853]/8 hover:border-[#D4A853]/25"}`}
              >
                <div className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center shrink-0 ${item.done ? "bg-[#5C9A6B] border-[#5C9A6B]" : "border-[#D4A853]/30"}`}>
                  {item.done && <span className="text-[10px] text-[#0A0908] font-bold">✓</span>}
                </div>
                <div className="space-y-1">
                  <p className={`text-xs font-mono ${item.done ? "line-through text-[#7A6F65]" : "text-[#F5F0EB]"}`}>{item.task}</p>
                  <p className="text-sm text-[#7A6F65] leading-relaxed">{item.tip}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {learningModules.length ? (
        <div className="space-y-4">
          <span className="font-mono text-xs uppercase tracking-wider text-[#D4A853]">Framework & Templates</span>
          <div className="space-y-2">
            {learningModules.map((mod) => (
              <div
                key={mod.id}
                onClick={() => setSelectedId(mod.id)}
                className={`p-3.5 border rounded cursor-pointer transition-colors ${selectedId === mod.id ? "bg-[#D4A853]/5 border-[#D4A853]/25" : "bg-[#110F0D]/20 border-[#D4A853]/5 hover:border-[#D4A853]/15"}`}
              >
                <span className="font-mono text-xs text-[#D4A853]/80 uppercase tracking-widest block mb-1">{mod.title}</span>
                <p className="text-sm text-[#7A6F65] leading-relaxed">{mod.description}</p>
              </div>
            ))}
          </div>
          {active && (
            <div className="border border-[#D4A853]/12 bg-[#110F0D]/40 p-5 rounded-lg space-y-2">
              <h4 className="text-lg font-serif font-medium text-[#F5F0EB]">{active.title}</h4>
              <p className="text-sm text-[#B0A89E] leading-relaxed whitespace-pre-line">{active.content}</p>
            </div>
          )}
        </div>
      ) : null}
      </div>
    </div>
  );
}

function BeforeAfterWithStatus({ data }: { data: DeliverableData }) {
  const ba = data.beforeAfter!;
  const status = ba.afterStatus ?? "expected";
  return (
    <div className="space-y-3">
      <span
        className={`inline-block font-mono text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
          status === "measured"
            ? "text-[#5C9A6B] border-[#5C9A6B]/40 bg-[#5C9A6B]/8"
            : "text-[#D4A853] border-[#D4A853]/40 bg-[#D4A853]/8"
        }`}
      >
        {status === "measured" ? "Measured result" : "Expected outcome (modeled)"}
      </span>
      <BeforeAfterSlider data={ba} clientName={data.clientName} />
    </div>
  );
}

export default function PolicyComposedDeliverable({
  data,
  policy,
}: {
  data: DeliverableData;
  policy: ServiceDeliveryPolicy;
}) {
  const m = policy.modules;

  return (
    <main className="min-h-screen bg-[#0A0908] text-[#B0A89E] overflow-x-hidden">
      <nav className="w-full fixed top-0 z-50 bg-[#0A0908]/90 backdrop-blur-xl border-b border-[#D4A853]/8">
        <div className="max-w-[900px] mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-serif text-[#F5F0EB] text-lg tracking-tight">Signal &amp; Friction</span>
          <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#7A6F65] border border-[#D4A853]/8 px-3 py-0.5 rounded">
            Confidential Diagnostic Portal
          </span>
        </div>
      </nav>

      <motion.section
        className="pt-28 pb-16 px-6 border-b border-[#D4A853]/8"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-[900px] mx-auto">
          <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#7A6F65]">{data.date}</span>
          <h1 className="text-5xl md:text-6xl font-serif font-semibold text-[#F5F0EB] tracking-tight leading-[1.05] mt-4 mb-6">
            {data.clientName}
          </h1>
        </div>
      </motion.section>

      {/* Evidence / Observation */}
      {shows(m.evidence) && (data.confidenceLevel !== undefined || data.evidence?.length) && (
        <section className="py-16 px-6 border-b border-[#D4A853]/8">
          <div className="max-w-[900px] mx-auto space-y-6">
            <SectionHeader>What We Measured</SectionHeader>
            {data.confidenceLevel !== undefined && <ConfidenceBadge level={data.confidenceLevel} reason={data.confidenceReason} />}
            {data.evidence?.length ? <EvidenceSection items={data.evidence} /> : null}
          </div>
        </section>
      )}

      {/* Embedded video */}
      {shows(m.embeddedVideo) && (
        <section className="py-16 px-6 border-b border-[#D4A853]/8 bg-[#110F0D]/40">
          <div className="max-w-[900px] mx-auto space-y-3">
            <LoomSection url={data.loomUrl} label="Video Walkthrough" />
            <p className="text-xs font-mono text-[#7A6F65] italic">
              {policy.videoGuidance.role} Suggested length: ~{policy.videoGuidance.approxDurationMinutes[0]}–{policy.videoGuidance.approxDurationMinutes[1]} min.
            </p>
          </div>
        </section>
      )}

      {/* Behavioral interpretation */}
      {(shows(m.behavioralInterpretation) || shows(m.ruledOutAlternative)) && data.behavioralInterpretation?.dominant && (
        <section className="py-16 px-6 border-b border-[#D4A853]/8">
          <div className="max-w-[900px] mx-auto space-y-4">
            <SectionHeader>How We Read It</SectionHeader>
            <BehavioralInterpretationSection
              dominant={data.behavioralInterpretation.dominant}
              ruledOutAlternative={shows(m.ruledOutAlternative) ? data.behavioralInterpretation.ruledOutAlternative : null}
            />
          </div>
        </section>
      )}

      {/* Judgment / Recommendation — withheld is enforced here regardless of data presence */}
      {shows(m.judgment) && data.diagnosis?.friction?.rootCause && (
        <section className="py-16 px-6 border-b border-[#D4A853]/8 bg-[#110F0D]/40">
          <div className="max-w-[900px] mx-auto space-y-4">
            <SectionHeader>The Friction</SectionHeader>
            <h3 className="text-xl font-serif text-[#C85C5C] font-medium">{data.diagnosis.friction.mechanism}</h3>
            <p className="text-base text-[#B0A89E] leading-relaxed max-w-[65ch]">{data.diagnosis.friction.rootCause}</p>
          </div>
        </section>
      )}

      {m.recommendation === "withheld" ? (
        <section className="py-16 px-6 border-b border-[#D4A853]/8">
          <div className="max-w-[900px] mx-auto">
            <SectionHeader>The Recommendation</SectionHeader>
            <RecommendationWithheldCard mechanism={data.diagnosis?.friction?.mechanism} />
          </div>
        </section>
      ) : shows(m.recommendation) && data.diagnosis?.finalDecision ? (
        <section className="py-16 px-6 border-b border-[#D4A853]/8">
          <div className="max-w-[900px] mx-auto space-y-6">
            <SectionHeader>The Recommendation</SectionHeader>
            <FinalDecisionCard decision={data.diagnosis.finalDecision} />
            {data.projectedImpact && (
              <ImpactRangeBlock range={data.projectedImpact} confidenceLevel={data.confidenceLevel} confidenceReason={data.confidenceReason} />
            )}
          </div>
        </section>
      ) : null}

      {shows(m.recommendation) && data.avoid?.length ? (
        <section className="py-16 px-6 border-b border-[#D4A853]/8 bg-[#110F0D]/40">
          <div className="max-w-[900px] mx-auto">
            <SectionHeader>What Not To Do</SectionHeader>
            <AvoidSection items={data.avoid} />
          </div>
        </section>
      ) : null}

      {/* Implementation plan (DWY Intervention) */}
      {m.implementationPlan === "required" || (m.implementationPlan === "allowed" && data.diagnosis?.finalDecision) ? (
        <section className="py-16 px-6 border-b border-[#D4A853]/8">
          <div className="max-w-[900px] mx-auto">
            <SectionHeader>Implementation Plan</SectionHeader>
            <ImplementationPlanModule data={data} />
          </div>
        </section>
      ) : null}

      {/* Execution summary (DFY Intervention/Expansion, and Monitoring/Autonomy for continuity) */}
      {(m.executionSummary === "required" || (m.executionSummary === "allowed" && data.dfyDelivery)) && data.dfyDelivery ? (
        <section className="py-16 px-6 border-b border-[#D4A853]/8 bg-[#110F0D]/40">
          <div className="max-w-[900px] mx-auto">
            <ExecutionSummaryModule text={data.dfyDelivery.execution_summary} />
          </div>
        </section>
      ) : m.executionSummary === "required" ? (
        <section className="py-16 px-6 border-b border-[#D4A853]/8 bg-[#110F0D]/40">
          <div className="max-w-[900px] mx-auto">
            <PendingModule label="What We Did" note="Execution details haven't been recorded on the scaffold yet." />
          </div>
        </section>
      ) : null}

      {/* Monitoring findings (DWY & DFY Monitoring; allowed for DFY Autonomy) */}
      {m.monitoringFindings === "required" || (m.monitoringFindings === "allowed" && data.dfyDelivery) ? (
        <section className="py-16 px-6 border-b border-[#D4A853]/8">
          <div className="max-w-[900px] mx-auto">
            <MonitoringFindingsModule
              dfyText={data.dfyDelivery ? data.dfyDelivery.monitoring_findings : null}
              technicalBaseline={data.technicalSignalsBaseline}
              technicalCurrent={data.technicalSignalsCurrent}
              baselineCapturedAt={data.baselineCapturedAt}
            />
          </div>
        </section>
      ) : null}

      {/* Before / after — expected vs measured, explicitly labeled */}
      {(shows(m.expectedBeforeAfter) || shows(m.measuredBeforeAfter)) && data.beforeAfter ? (
        <section className="py-16 px-6 border-b border-[#D4A853]/8 bg-[#0A0908]">
          <div className="max-w-[900px] mx-auto">
            <SectionHeader>Before / After</SectionHeader>
            <BeforeAfterWithStatus data={data} />
          </div>
        </section>
      ) : null}

      {/* Unknowns — never withheld/unsupported by policy, always presence-gated only */}
      {shows(m.unknowns) && data.unknowns?.trim() ? (
        <section className="py-16 px-6 border-b border-[#D4A853]/8">
          <div className="max-w-[900px] mx-auto">
            <UnknownsSection text={data.unknowns.trim()} />
          </div>
        </section>
      ) : null}

      {/* Founder learning (DWY Autonomy) */}
      {m.founderLearningModules === "required" || m.checklist === "required" ? (
        <section className="py-16 px-6 border-b border-[#D4A853]/8 bg-[#110F0D]/40">
          <div className="max-w-[900px] mx-auto">
            <SectionHeader>Self-Diagnosis Framework</SectionHeader>
            <FounderLearningModule data={data} />
          </div>
        </section>
      ) : null}

      {/* Team runbook (DFY Autonomy) */}
      {m.handoffDocumentation === "required" || (m.handoffDocumentation === "allowed" && data.dfyDelivery) ? (
        <section className="py-16 px-6 border-b border-[#D4A853]/8">
          <div className="max-w-[900px] mx-auto">
            {data.dfyDelivery ? (
              <TeamRunbookModule text={data.dfyDelivery.handoff_documentation} />
            ) : (
              <PendingModule label="Operating Runbook" note="Handoff documentation hasn't been recorded on the scaffold yet." />
            )}
          </div>
        </section>
      ) : null}

      <footer className="py-16 px-6 text-center border-t border-[#D4A853]/8 bg-[#0A0908]">
        <p className="font-mono text-xs uppercase tracking-[0.15em] text-[#7A6F65]">
          {data.consultant} · CONFIDENTIAL ARTIFACT · ALL RIGHTS RESERVED
        </p>
      </footer>
    </main>
  );
}
