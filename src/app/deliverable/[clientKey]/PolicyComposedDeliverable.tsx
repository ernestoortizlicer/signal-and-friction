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

// DFY Monitoring's defining module — same honest-string principle as
// ExecutionSummaryModule for DFY. For DWY, there is currently no
// measurement pipeline or scaffold field of any kind behind this concept
// — dwyText is always null here, and the honest thing is to say so
// plainly rather than render a page that implies data exists.
function MonitoringFindingsModule({ dfyText }: { dfyText: string | null }) {
  return (
    <div className="border border-[#D4A853]/12 bg-[#110F0D]/40 p-6 md:p-8 rounded space-y-2">
      <span className="font-mono text-xs uppercase tracking-wider text-[#D4A853]">What We Found</span>
      {dfyText ? (
        <p className="text-base text-[#B0A89E] leading-relaxed max-w-[65ch]">{dfyText}</p>
      ) : (
        <p className="text-sm text-[#7A6F65] leading-relaxed max-w-[60ch] italic">
          No automated measurement pipeline is connected for this service yet — this section will report real,
          measured signal movement once one is. This is a stated infrastructure gap, not a claim that nothing
          changed.
        </p>
      )}
    </div>
  );
}

// DFY Autonomy's defining module — an institutional runbook, deliberately
// not styled like the DWY founder checklist (different job: a team
// artifact, not a self-serve training UI).
function TeamRunbookModule({ text }: { text: string }) {
  return (
    <div className="border border-[#D4A853]/15 bg-[#0A0908] p-6 md:p-10 rounded-lg space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853]" />
        <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#D4A853]">Operating Runbook — Internal Handoff</span>
      </div>
      <p className="text-base text-[#B0A89E] leading-relaxed max-w-[70ch] whitespace-pre-line">{text}</p>
    </div>
  );
}

// DWY Autonomy's defining module — the existing checklist/learningModules
// UI, now gated by policy rather than rendered purely on presence.
function FounderLearningModule({ data }: { data: DeliverableData }) {
  const [checklist, setChecklist] = useState(data.checklist ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(data.learningModules?.[0]?.id ?? null);
  const active = data.learningModules?.find((m) => m.id === selectedId);
  const toggle = (id: string) => setChecklist((prev) => prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c)));

  if (!checklist.length && !data.learningModules?.length) {
    return <PendingModule label="Self-Diagnosis Framework" note="Framework materials for this client haven't been added yet." />;
  }

  return (
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
      {data.learningModules?.length ? (
        <div className="space-y-4">
          <span className="font-mono text-xs uppercase tracking-wider text-[#D4A853]">Framework & Templates</span>
          <div className="space-y-2">
            {data.learningModules.map((mod) => (
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
            <MonitoringFindingsModule dfyText={data.dfyDelivery ? data.dfyDelivery.monitoring_findings : null} />
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
