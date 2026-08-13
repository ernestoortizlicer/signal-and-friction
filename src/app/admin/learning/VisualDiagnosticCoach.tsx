"use client";

import FeedbackPanel from "./visual/FeedbackPanel";
import PracticeWorkspace from "./visual/PracticeWorkspace";
import { useVisualCoach } from "./visual/useVisualCoach";

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border border-[#D4A853]/10 bg-[#110F0D]/35 rounded-xl p-4">
      <span className="font-mono text-[10px] uppercase tracking-wider text-[#7A6F65] block">{label}</span>
      <span className="font-serif text-2xl text-[#F5F0EB] block mt-1">{value}</span>
      <span className="text-[10px] text-[#7A6F65] leading-relaxed">{detail}</span>
    </div>
  );
}

export default function VisualDiagnosticCoach() {
  const coach = useVisualCoach();
  const summary = coach.history?.summary;
  const focus = summary?.repeatedMissCategories?.[0]?.category ?? "no repeated miss yet";

  return (
    <div className="space-y-6">
      {coach.error && (
        <div className="border border-[#C85C5C]/35 bg-[#C85C5C]/8 rounded-lg p-3 text-xs text-[#C85C5C] flex justify-between gap-4">
          <span>{coach.error}</span>
          <button onClick={() => coach.setError(null)}>dismiss</button>
        </div>
      )}

      <section className="border border-[#D4A853]/18 bg-[#110F0D]/35 rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex flex-wrap justify-between gap-4">
          <div className="max-w-3xl">
            <span className="font-mono text-[10px] text-[#D4A853] uppercase tracking-[0.25em] block">Visual Diagnostic Coach v0.1 · Practice only</span>
            <h2 className="font-serif text-2xl mt-1 text-[#F5F0EB]">Train the input before the reasoning.</h2>
            <p className="text-sm text-[#B0A89E] leading-relaxed mt-2">
              Your current track prioritizes visual discrimination. First describe only what is visible; mechanisms, causality and recommendations stay out until perception becomes more reliable.
            </p>
          </div>
          <div className="border border-[#D4A853]/12 rounded-xl p-3 min-w-64 text-xs">
            <span className="text-[#7A6F65] font-mono uppercase tracking-wider block">Personalized track</span>
            <span className="text-[#F5F0EB] block mt-1">Reasoning: advanced structured</span>
            <span className="text-[#D4A853] block">Primary need: visual discrimination</span>
            <span className="text-[#7A6F65] block">Target: {coach.history?.profile.targetVisualMinutes ?? 60} min/day</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Metric label="Visual sessions" value={`${summary?.totalSessions ?? 0}`} detail="practice sessions, never certification attempts" />
          <Metric label="14-day visual" value={`${summary?.visualMinutesLast14 ?? 0} min`} detail={`${summary?.sessionsLast14 ?? 0} drills completed`} />
          <Metric label="Coverage estimate" value={summary?.avgSalienceCoverageEstimate != null ? `${summary.avgSalienceCoverageEstimate}%` : "—"} detail="AI-coach estimate; formative only" />
          <Metric label="Current miss" value={focus.replaceAll("_", " ")} detail="most repeated re-inspection category" />
        </div>
      </section>

      <PracticeWorkspace
        mode={coach.mode}
        pageType={coach.pageType}
        companyName={coach.companyName}
        pageUrl={coach.pageUrl}
        imageA={coach.imageA}
        imageB={coach.imageB}
        observations={coach.observations}
        busy={coach.busy}
        ready={coach.ready}
        locked={!!coach.feedback}
        onMode={(mode) => coach.resetDrill(mode)}
        onPageType={coach.setPageType}
        onCompanyName={coach.setCompanyName}
        onPageUrl={coach.setPageUrl}
        onImageA={coach.setImageA}
        onImageB={coach.setImageB}
        onObservations={coach.setObservations}
        onSubmit={() => void coach.requestFeedback()}
      />

      {coach.feedback && (
        <FeedbackPanel
          feedback={coach.feedback}
          model={coach.model}
          cost={coach.cost}
          mode={coach.mode}
          secondPass={coach.secondPass}
          onSecondPass={coach.setSecondPass}
          onSaveSecondPass={() => void coach.saveSecondPass()}
          onNewDrill={() => coach.resetDrill()}
          busy={coach.busy}
        />
      )}

      <section className="border border-[#D4A853]/12 bg-[#110F0D]/25 rounded-xl p-5 space-y-3">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#7A6F65]">Method boundary</span>
          <h3 className="font-serif text-lg text-[#F5F0EB]">Why this comes before diagnosis</h3>
        </div>
        <p className="text-xs text-[#B0A89E] leading-relaxed">
          Carnegie Mellon informs component-skill decomposition and targeted feedback; Stanford informs deliberate observation and contrasting cases; Harvard Project Zero informs the separation of observation from interpretation. The model can suggest what to re-inspect, but it is not the reference answer.
        </p>
        <p className="text-[10px] font-mono text-[#7A6F65]">
          Privacy: screenshots are compressed in this browser and sent for the live multimodal coaching call. Signal and Friction stores the image fingerprint and structured practice record, not the screenshot itself. Do not upload private client screens containing secrets or personal data.
        </p>
      </section>
    </div>
  );
}
