"use client";

import type { VisualFeedback } from "./types";

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border border-[#D4A853]/10 bg-[#110F0D]/35 rounded-xl p-4">
      <span className="font-mono text-[10px] uppercase tracking-wider text-[#7A6F65] block">{label}</span>
      <span className="font-serif text-2xl text-[#F5F0EB] block mt-1">{value}</span>
      <span className="text-[10px] text-[#7A6F65] leading-relaxed">{detail}</span>
    </div>
  );
}

export default function FeedbackPanel({
  feedback,
  model,
  cost,
  mode,
  secondPass,
  onSecondPass,
  onSaveSecondPass,
  onNewDrill,
  busy,
}: {
  feedback: VisualFeedback;
  model: string | null;
  cost: number | null;
  mode: "noticing" | "contrast";
  secondPass: string;
  onSecondPass: (value: string) => void;
  onSaveSecondPass: () => void;
  onNewDrill: () => void;
  busy: boolean;
}) {
  return (
    <section className="border border-[#5C9A6B]/20 bg-[#110F0D]/35 rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-[#5C9A6B]/15 flex flex-wrap justify-between gap-3">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#5C9A6B]">Coach feedback</span>
          <h3 className="font-serif text-xl text-[#F5F0EB]">Look again before you interpret.</h3>
        </div>
        <span className="font-mono text-[9px] text-[#7A6F65]">
          AI estimate · practice only · {model ?? "model unknown"}{cost != null ? ` · $${cost.toFixed(4)}` : ""}
        </span>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Metric label="Specificity" value={`${feedback.coach_metrics.visual_specificity}/5`} detail="precision of visible details" />
          <Metric label="Observation discipline" value={`${feedback.coach_metrics.observation_interpretation_separation}/5`} detail="kept observation separate from inference" />
          <Metric label="Coverage estimate" value={`${feedback.coach_metrics.salience_coverage_estimate}%`} detail="formative model estimate, not ground truth" />
          <Metric label="Inference leaks" value={`${feedback.coach_metrics.false_inference_count}`} detail="claims that went beyond visible evidence" />
        </div>

        {feedback.detected_well.length > 0 && (
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#5C9A6B] block mb-2">You actually noticed</span>
            <ul className="space-y-1 text-sm text-[#B0A89E] list-disc pl-5">
              {feedback.detected_well.map((item, index) => <li key={index}>{item}</li>)}
            </ul>
          </div>
        )}

        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#D4A853] block mb-2">Re-inspect these candidates</span>
          {feedback.reinspect.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {feedback.reinspect.map((item, index) => (
                <div key={index} className="border border-[#D4A853]/10 rounded-lg p-3 text-xs">
                  <div className="flex gap-2 mb-1">
                    <span className="text-[#D4A853] font-mono uppercase">{item.category.replaceAll("_", " ")}</span>
                    <span className="text-[#7A6F65]">image {item.image}</span>
                  </div>
                  <p className="text-[#F5F0EB]">{item.detail}</p>
                  {item.why_salient && <p className="text-[#7A6F65] mt-1">{item.why_salient}</p>}
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-[#7A6F65]">No additional high-confidence detail suggested.</p>}
        </div>

        {feedback.interpretation_leaks.length > 0 && (
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#C85C5C] block mb-2">Observation → interpretation leaks</span>
            <div className="space-y-2">
              {feedback.interpretation_leaks.map((item, index) => (
                <div key={index} className="border-l-2 border-[#C85C5C]/40 pl-3 text-xs">
                  <p className="text-[#F5F0EB]">“{item.analyst_phrase}”</p>
                  <p className="text-[#7A6F65] mt-1">{item.why_not_observation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === "contrast" && feedback.contrast_misses.length > 0 && (
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#D4A853] block mb-2">Differences worth another look</span>
            <ul className="space-y-1 text-sm text-[#B0A89E] list-disc pl-5">
              {feedback.contrast_misses.map((item, index) => (
                <li key={index}><span className="text-[#D4A853]">{item.category.replaceAll("_", " ")}:</span> {item.difference}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="border border-[#D4A853]/12 rounded-xl p-4 space-y-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#D4A853]">Second look</span>
          <p className="text-sm text-[#F5F0EB]">{feedback.second_look_prompt}</p>
          <textarea
            value={secondPass}
            onChange={(event) => onSecondPass(event.target.value)}
            rows={4}
            className="w-full bg-[#0A0908] border border-[#D4A853]/15 rounded p-3 text-sm"
            placeholder="List only what you can now see that you did not record in the first pass."
          />
          <div className="flex flex-wrap gap-2">
            <button disabled={busy || secondPass.trim().length < 10} onClick={onSaveSecondPass} className="border border-[#5C9A6B]/30 text-[#5C9A6B] rounded px-4 py-2 font-mono text-[10px] uppercase disabled:opacity-30">Save second look</button>
            <button onClick={onNewDrill} className="border border-[#7A6F65]/25 text-[#7A6F65] rounded px-4 py-2 font-mono text-[10px] uppercase">New drill</button>
          </div>
        </div>
      </div>
    </section>
  );
}
