"use client";

import ScreenshotPicker from "./ScreenshotPicker";
import type { VisualImage, VisualMode, VisualPageType } from "./types";

const PAGE_TYPES: VisualPageType[] = [
  "homepage", "pricing", "signup", "onboarding", "checkout", "dashboard", "other",
];

export default function PracticeWorkspace({
  mode,
  pageType,
  companyName,
  pageUrl,
  imageA,
  imageB,
  observations,
  busy,
  ready,
  locked,
  onMode,
  onPageType,
  onCompanyName,
  onPageUrl,
  onImageA,
  onImageB,
  onObservations,
  onSubmit,
}: {
  mode: VisualMode;
  pageType: VisualPageType;
  companyName: string;
  pageUrl: string;
  imageA: VisualImage | null;
  imageB: VisualImage | null;
  observations: string;
  busy: boolean;
  ready: boolean;
  locked: boolean;
  onMode: (mode: VisualMode) => void;
  onPageType: (value: VisualPageType) => void;
  onCompanyName: (value: string) => void;
  onPageUrl: (value: string) => void;
  onImageA: (image: VisualImage) => void;
  onImageB: (image: VisualImage) => void;
  onObservations: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="border border-[#D4A853]/15 bg-[#110F0D]/30 rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-[#D4A853]/10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#D4A853]">Component skill</span>
            <h3 className="font-serif text-xl text-[#F5F0EB]">Perceive → Describe → Discriminate</h3>
          </div>
          <div className="flex gap-2">
            {(["noticing", "contrast"] as VisualMode[]).map((value) => (
              <button
                key={value}
                disabled={busy}
                onClick={() => onMode(value)}
                className={`px-3 py-1.5 rounded-full border font-mono text-[10px] uppercase tracking-wider ${mode === value ? "border-[#D4A853] text-[#D4A853] bg-[#D4A853]/8" : "border-[#7A6F65]/25 text-[#7A6F65]"}`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-[#7A6F65] leading-relaxed">
          {mode === "noticing"
            ? "One real screen. Your first pass is unaided. Record only visible facts before the coach points you back toward details worth re-inspecting."
            : "Two real screens or states. Identify concrete visual differences before explaining what any difference might mean."}
        </p>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={companyName}
            onChange={(event) => onCompanyName(event.target.value)}
            disabled={locked || busy}
            className="bg-[#0A0908] border border-[#D4A853]/15 rounded px-3 py-2 text-xs disabled:opacity-60"
            placeholder="Company (optional)"
          />
          <select
            value={pageType}
            onChange={(event) => onPageType(event.target.value as VisualPageType)}
            disabled={locked || busy}
            className="bg-[#0A0908] border border-[#D4A853]/15 rounded px-3 py-2 text-xs disabled:opacity-60"
          >
            {PAGE_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <input
            value={pageUrl}
            onChange={(event) => onPageUrl(event.target.value)}
            disabled={locked || busy}
            className="bg-[#0A0908] border border-[#D4A853]/15 rounded px-3 py-2 text-xs disabled:opacity-60"
            placeholder="Live page URL (metadata only)"
          />
        </div>

        <div className={`grid gap-4 ${mode === "contrast" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
          <ScreenshotPicker label="A" image={imageA} onImage={onImageA} disabled={locked || busy} />
          {mode === "contrast" && <ScreenshotPicker label="B" image={imageB} onImage={onImageB} disabled={locked || busy} />}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap justify-between gap-3">
            <label className="font-mono text-[10px] uppercase tracking-wider text-[#D4A853]">First-pass observation</label>
            <span className="font-mono text-[9px] text-[#7A6F65]">NO mechanisms · NO causality · NO psychology</span>
          </div>
          <textarea
            value={observations}
            onChange={(event) => onObservations(event.target.value)}
            rows={7}
            disabled={busy || locked}
            className="w-full bg-[#0A0908] border border-[#D4A853]/15 rounded-xl p-3 text-sm text-[#F5F0EB] placeholder:text-[#5F574F] outline-none focus:border-[#D4A853]/40 disabled:opacity-60"
            placeholder={mode === "noticing"
              ? "Describe visible facts: hierarchy, placement, order, labels, controls, grouping, spacing, visibility, defaults…"
              : "List concrete A/B differences: what moved, appeared, disappeared, changed hierarchy, wording, state or visibility?"}
          />
        </div>

        {!locked && (
          <button
            disabled={!ready || busy}
            onClick={onSubmit}
            className="w-full md:w-auto border border-[#D4A853]/35 bg-[#D4A853]/5 text-[#D4A853] rounded-lg px-5 py-2.5 font-mono text-xs uppercase tracking-wider disabled:opacity-30"
          >
            {busy ? "Inspecting visual evidence…" : "Lock first pass → get feedback"}
          </button>
        )}
      </div>
    </section>
  );
}
