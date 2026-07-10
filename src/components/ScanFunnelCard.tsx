"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface ScanFunnelOption {
  key: string;
  label: string;
  sub?: string;
}

export interface ScanFunnelStep {
  id: number;
  code: string;
  label: string;
  desc: string;
}

interface ScanFunnelCardProps {
  region: "us" | "sg";
  steps: ScanFunnelStep[];
  step: number; // 1-indexed
  trustAnchor?: React.ReactNode;
  autoAdvance?: boolean;

  url: string;
  onUrlChange: (v: string) => void;
  urlPlaceholder: string;
  socialProof: React.ReactNode;
  scanCta: string;
  onScanClick: () => void;

  funnelPain: string;
  funnelOptions: ScanFunnelOption[];
  onFunnelPainChange: (key: string) => void;

  segmentSelection: string;
  segmentOptions: ScanFunnelOption[];
  onSegmentChange: (key: string) => void;

  customAnswer: string;
  metricOptions: ScanFunnelOption[];
  onCustomAnswerChange: (label: string) => void;

  urgency: string;
  urgencyOptions: { key: string; label: string }[];
  onUrgencyChange: (key: string) => void;

  email: string;
  onEmailChange: (v: string) => void;
  emailPlaceholder: string;
  deliveryNote: React.ReactNode;
  guaranteeNote: React.ReactNode;
  submitCta: string;
  submitLoadingLabel: React.ReactNode;

  loading: boolean;
  errorMsg: string | null;

  onBack: () => void;
  onAdvance: () => void;
  onSubmit: (e: React.FormEvent) => void;

  footerEngine: string;
  footerTrust: string;
}

function handleTileGridKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
  const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
  if (!keys.includes(e.key)) return;
  const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
  const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
  if (currentIndex === -1) return;
  e.preventDefault();
  const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
  const nextIndex = (currentIndex + delta + buttons.length) % buttons.length;
  buttons[nextIndex]?.focus();
}

export default function ScanFunnelCard({
  region,
  steps,
  step,
  trustAnchor,
  autoAdvance = true,
  url,
  onUrlChange,
  urlPlaceholder,
  socialProof,
  scanCta,
  onScanClick,
  funnelPain,
  funnelOptions,
  onFunnelPainChange,
  segmentSelection,
  segmentOptions,
  onSegmentChange,
  customAnswer,
  metricOptions,
  onCustomAnswerChange,
  urgency,
  urgencyOptions,
  onUrgencyChange,
  email,
  onEmailChange,
  emailPlaceholder,
  deliveryNote,
  guaranteeNote,
  submitCta,
  submitLoadingLabel,
  loading,
  errorMsg,
  onBack,
  onAdvance,
  onSubmit,
  footerEngine,
  footerTrust,
}: ScanFunnelCardProps) {
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => clearTimeout(advanceTimer.current);
  }, []);

  const pick = (onChange: (key: string) => void, key: string) => {
    onChange(key);
    if (autoAdvance) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(onAdvance, 360);
    }
  };

  const currentStep = steps[step - 1];
  const progressPct = (step / steps.length) * 100;
  const selNow =
    step === 2 ? !!funnelPain : step === 3 ? !!segmentSelection : step === 4 ? !!customAnswer : false;
  const manualContinue = !autoAdvance && selNow && step > 1 && step < 5;

  return (
    <div className="scan-funnel-wrap">
      <div className="scan-funnel-aura" aria-hidden="true" />
      <div className="scan-funnel-card" data-region={region}>
        <div className="scan-funnel-grid" aria-hidden="true" />
        <div className="scan-funnel-scanline" aria-hidden="true" />
        <div className="scan-funnel-edge" aria-hidden="true" />
        <div className="scan-funnel-bracket scan-funnel-bracket--tl" aria-hidden="true" />
        <div className="scan-funnel-bracket scan-funnel-bracket--tr" aria-hidden="true" />
        <div className="scan-funnel-bracket scan-funnel-bracket--bl" aria-hidden="true" />
        <div className="scan-funnel-bracket scan-funnel-bracket--br" aria-hidden="true" />

        <div className="scan-funnel-header">
          <div className="flex items-center gap-3.5">
            <div className="scan-funnel-dots">
              <div className="scan-funnel-dot" />
              <div className="scan-funnel-dot" />
              <div className="scan-funnel-dot" />
            </div>
            <span className="scan-funnel-code">{currentStep.code}</span>
          </div>
          <span className="scan-funnel-step-count">
            STEP <strong>{step}</strong> / {steps.length}
          </span>
        </div>

        <div className="scan-funnel-progress-wrap">
          <div className="scan-funnel-progress">
            <div className="scan-funnel-progress-fill" style={{ width: `${progressPct}%` }} />
            <div className="scan-funnel-progress-tick" style={{ left: "20%" }} />
            <div className="scan-funnel-progress-tick" style={{ left: "40%" }} />
            <div className="scan-funnel-progress-tick" style={{ left: "60%" }} />
            <div className="scan-funnel-progress-tick" style={{ left: "80%" }} />
          </div>
        </div>

        <div className="scan-funnel-body" aria-live="polite">
          {trustAnchor}
          <form onSubmit={onSubmit}>
            <AnimatePresence mode="wait">
              {/* Step 1: URL */}
              {step === 1 && (
                <motion.div
                  key="s1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="scan-funnel-step"
                >
                  <div className="scan-funnel-micro-label">{currentStep.label}</div>
                  <div className="scan-funnel-question">{currentStep.desc}</div>
                  <input
                    type="url"
                    required
                    autoFocus
                    value={url}
                    onChange={(e) => onUrlChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onScanClick();
                      }
                    }}
                    placeholder={urlPlaceholder}
                    aria-label="Product URL for diagnostic scan"
                    className="scan-funnel-input"
                  />
                  {errorMsg && <div className="scan-funnel-error">ERR: {errorMsg}</div>}
                  <div className="scan-funnel-social">
                    <span className="scan-funnel-social-dot" />
                    <span>{socialProof}</span>
                  </div>
                  <button type="button" onClick={onScanClick} className="scan-funnel-cta" style={{ marginTop: 22 }}>
                    {scanCta} <span>&#8594;</span>
                  </button>
                </motion.div>
              )}

              {/* Step 2: Funnel pain — grid tiles */}
              {step === 2 && (
                <motion.div
                  key="s2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="scan-funnel-step"
                >
                  <div className="scan-funnel-micro-label">{currentStep.label}</div>
                  <div className="scan-funnel-question">{currentStep.desc}</div>
                  <div className="scan-funnel-tiles" role="radiogroup" onKeyDown={handleTileGridKeyDown}>
                    {funnelOptions.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        role="radio"
                        aria-checked={funnelPain === opt.key}
                        onClick={() => pick(onFunnelPainChange, opt.key)}
                        className={`scan-funnel-tile ${funnelPain === opt.key ? "selected" : ""}`}
                      >
                        {funnelPain === opt.key && <span className="scan-funnel-tile-tick">&#9672;</span>}
                        <span className="scan-funnel-tile-value">{opt.label}</span>
                        {opt.sub && <span className="scan-funnel-tile-label">{opt.sub}</span>}
                      </button>
                    ))}
                  </div>
                  <div className="scan-funnel-footer-row">
                    <button type="button" onClick={onBack} className="scan-funnel-back">
                      &#8592; BACK
                    </button>
                    {manualContinue && (
                      <button type="button" onClick={onAdvance} className="scan-funnel-continue">
                        CONTINUE &#8594;
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Segment — list tiles */}
              {step === 3 && (
                <motion.div
                  key="s3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="scan-funnel-step"
                >
                  <div className="scan-funnel-micro-label">{currentStep.label}</div>
                  <div className="scan-funnel-question">{currentStep.desc}</div>
                  <div
                    className="scan-funnel-tiles scan-funnel-tiles--list"
                    role="radiogroup"
                    onKeyDown={handleTileGridKeyDown}
                  >
                    {segmentOptions.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        role="radio"
                        aria-checked={segmentSelection === opt.key}
                        onClick={() => pick(onSegmentChange, opt.key)}
                        className={`scan-funnel-tile ${segmentSelection === opt.key ? "selected" : ""}`}
                      >
                        <span className="scan-funnel-tile-value">{opt.label}</span>
                        {opt.sub && <span className="scan-funnel-tile-label">{opt.sub}</span>}
                      </button>
                    ))}
                  </div>
                  <div className="scan-funnel-footer-row">
                    <button type="button" onClick={onBack} className="scan-funnel-back">
                      &#8592; BACK
                    </button>
                    {manualContinue && (
                      <button type="button" onClick={onAdvance} className="scan-funnel-continue">
                        CONTINUE &#8594;
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 4: Metric isolation (MRR or expertise) — list tiles */}
              {step === 4 && (
                <motion.div
                  key="s4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="scan-funnel-step"
                >
                  <div className="scan-funnel-micro-label">{currentStep.label}</div>
                  <div className="scan-funnel-question">{currentStep.desc}</div>
                  <div
                    className="scan-funnel-tiles scan-funnel-tiles--list"
                    role="radiogroup"
                    onKeyDown={handleTileGridKeyDown}
                  >
                    {metricOptions.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        role="radio"
                        aria-checked={customAnswer === opt.label}
                        onClick={() => pick(() => onCustomAnswerChange(opt.label), opt.key)}
                        className={`scan-funnel-tile ${customAnswer === opt.label ? "selected" : ""}`}
                      >
                        <span className="scan-funnel-tile-value">{opt.label}</span>
                        {opt.sub && <span className="scan-funnel-tile-label">{opt.sub}</span>}
                      </button>
                    ))}
                  </div>
                  <div className="scan-funnel-footer-row">
                    <button type="button" onClick={onBack} className="scan-funnel-back">
                      &#8592; BACK
                    </button>
                    {manualContinue && (
                      <button type="button" onClick={onAdvance} className="scan-funnel-continue">
                        CONTINUE &#8594;
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 5: Urgency + email + submit */}
              {step === 5 && (
                <motion.div
                  key="s5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="scan-funnel-step"
                >
                  <div className="scan-funnel-micro-label">{currentStep.label}</div>
                  <div className="scan-funnel-question">{currentStep.desc}</div>

                  <div style={{ marginBottom: 20 }}>
                    <div className="scan-funnel-micro-label" style={{ marginBottom: 10 }}>
                      How soon must this be fixed?
                    </div>
                    <div className="scan-funnel-urgency" role="radiogroup" onKeyDown={handleTileGridKeyDown}>
                      {urgencyOptions.map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          role="radio"
                          aria-checked={urgency === opt.key}
                          onClick={() => onUrgencyChange(opt.key)}
                          className={`scan-funnel-tile ${urgency === opt.key ? "selected" : ""}`}
                        >
                          <span className="scan-funnel-tile-value">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                    placeholder={emailPlaceholder}
                    aria-label="Email address for diagnostic report delivery"
                    className="scan-funnel-input"
                  />
                  {errorMsg && <div className="scan-funnel-error">ERR: {errorMsg}</div>}
                  <div style={{ marginTop: 22, marginBottom: 18 }}>{deliveryNote}</div>
                  {guaranteeNote}

                  <div className="scan-funnel-footer-row">
                    <button type="button" disabled={loading} onClick={onBack} className="scan-funnel-back">
                      &#8592; BACK
                    </button>
                  </div>
                  <button type="submit" disabled={loading} className="scan-funnel-cta" style={{ marginTop: 14 }}>
                    {loading ? submitLoadingLabel : (
                      <>
                        {submitCta} <span>&#8594;</span>
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>

        <div className="scan-funnel-footer">
          <span>{footerEngine}</span>
          <span>&#9672; {footerTrust}</span>
        </div>
      </div>
    </div>
  );
}
