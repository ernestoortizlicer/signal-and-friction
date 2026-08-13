"use client";

import { useState } from "react";
import Link from "next/link";

interface ScanReport {
  domain: string;
  url: string;
  scannedAt: string;
  psError: string | null;
  metrics: {
    lcp: { ms: number; label: string; status: string };
    tbt: { ms: number; label: string; status: string };
    cls: { value: number; status: string };
    performanceScore: number;
    speedIndex: { ms: number; label: string };
  };
  signals: {
    platform: string | null;
    hasStripe: boolean;
    stripeAsync: boolean;
    scriptCount: number;
    missingOgTags: string[];
    hasCheckoutIndicator: boolean;
    hasLazyImages: boolean;
  };
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ScanPage() {
  const [url, setUrl] = useState("");
  const [report, setReport] = useState<ScanReport | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function runScan(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setScanning(true);
    setError(null);
    setReport(null);
    setSaved(false);

    try {
      const response = await fetch("/api/scan-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Scan failed (${response.status}).`);
      setReport(data as ScanReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed.");
    } finally {
      setScanning(false);
    }
  }

  async function saveForReview(e: React.FormEvent) {
    e.preventDefault();
    if (!report || !email) return;
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          company: report.domain,
          website: report.url,
          source: "technical_signal_scan",
          answers: {
            scannedAt: report.scannedAt,
            performanceScore: report.metrics.performanceScore,
            lcpMs: report.metrics.lcp.ms,
            tbtMs: report.metrics.tbt.ms,
            cls: report.metrics.cls.value,
            scriptCount: report.signals.scriptCount,
            missingOgTags: report.signals.missingOgTags,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save scan for review.");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save scan for review.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg text-text-primary">
      <header className="border-b border-border-hi">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-5">
          <Link href="/" className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Signal &amp; Friction
          </Link>
          <Link href="/pricing" className="font-mono text-xs text-text-muted hover:text-accent">
            Diagnostic pricing →
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-14 space-y-10">
        <div className="max-w-3xl space-y-4">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Free · Technical Signal Scan</p>
          <h1 className="font-hero text-4xl sm:text-5xl font-bold tracking-[-0.035em]">
            Measure observable technical friction before anyone calls it a diagnosis.
          </h1>
          <p className="max-w-2xl text-text-body leading-relaxed">
            Enter a public product or funnel URL. We inspect performance and page-level technical signals. This scan observes; it does not infer a behavioral mechanism, prove revenue causality, or replace the paid diagnostic.
          </p>
        </div>

        <form onSubmit={runScan} className="rounded-xl border border-border-accent bg-surface p-6 space-y-4">
          <label className="block space-y-2">
            <span className="font-mono text-xs text-text-muted">Public URL</span>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/pricing"
                className="input flex-1"
              />
              <button
                disabled={scanning}
                className="rounded-md bg-accent px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.14em] text-bg disabled:opacity-50"
              >
                {scanning ? "Scanning…" : "Run scan →"}
              </button>
            </div>
          </label>
          {error && <p className="font-mono text-xs text-error">{error}</p>}
        </form>

        {report && (
          <section className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Observed results</p>
                <h2 className="mt-2 font-serif text-3xl font-bold">{report.domain}</h2>
              </div>
              <p className="font-mono text-xs text-text-muted">No behavioral diagnosis generated</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Performance" value={`${Math.round(report.metrics.performanceScore)}/100`} detail="PageSpeed score" />
              <Metric label="LCP" value={`${Math.round(report.metrics.lcp.ms)} ms`} detail={statusLabel(report.metrics.lcp.status)} />
              <Metric label="TBT" value={`${Math.round(report.metrics.tbt.ms)} ms`} detail={statusLabel(report.metrics.tbt.status)} />
              <Metric label="CLS" value={String(report.metrics.cls.value)} detail={statusLabel(report.metrics.cls.status)} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-border-hi bg-surface p-5 space-y-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">Page signals</p>
                <Signal label="Detected platform" value={report.signals.platform || "Unknown"} />
                <Signal label="Script count" value={String(report.signals.scriptCount)} />
                <Signal label="Lazy-loaded images" value={report.signals.hasLazyImages ? "Detected" : "Not detected"} />
                <Signal label="Missing OG tags" value={report.signals.missingOgTags.length ? report.signals.missingOgTags.join(", ") : "None detected"} />
              </div>

              <div className="rounded-xl border border-border-accent bg-surface p-5 space-y-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">Evidence boundary</p>
                <p className="text-sm leading-relaxed text-text-body">
                  A slow page, many scripts, missing metadata or a checkout indicator can be useful evidence. None of those facts by itself proves cognitive load, trust deficit, commitment anxiety, value uncertainty, or lost revenue.
                </p>
                <Link href="/pricing" className="font-mono text-xs text-accent hover:underline">
                  See the evidence-ranked Diagnostic →
                </Link>
              </div>
            </div>

            <form onSubmit={saveForReview} className="rounded-xl border border-border-hi bg-bg/40 p-5 space-y-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-text-muted">Optional human review</p>
                <p className="mt-1 text-sm text-text-body">Save this observable scan with your business email so Signal &amp; Friction can review the context. Saving it does not create a diagnosis or start a paid engagement.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="input flex-1"
                />
                <button disabled={saving || saved} className="rounded-md border border-border-accent px-5 py-3 font-mono text-xs uppercase tracking-[0.12em] text-accent disabled:opacity-50">
                  {saved ? "Saved for review" : saving ? "Saving…" : "Save for review →"}
                </button>
              </div>
            </form>
          </section>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-md border border-border-hi bg-surface p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-text-muted">{detail}</p>
    </div>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="max-w-[60%] text-right text-sm text-text-primary">{value}</span>
    </div>
  );
}
