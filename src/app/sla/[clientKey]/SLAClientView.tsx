"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

interface SLAData {
  status: "awaiting_payment" | "in_progress" | "delivered";
  clientName?: string;
  clientKey?: string;
  slaStartedAt?: string;
  hoursElapsed?: number;
  hoursRemaining?: number;
  pctElapsed?: number;
  protocolStage?: string | null;
  projectStatus?: string | null;
  paymentStatus?: string | null;
  deliverableUrl?: string;
}

function formatCountdown(hoursRemaining: number): string {
  if (hoursRemaining <= 0) return "00:00:00";
  const totalSeconds = Math.floor(hoursRemaining * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

function humanize(value: string | null | undefined): string {
  if (!value) return "Unknown";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SLAClientView({ staticClientKey }: { staticClientKey: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const urlClientKey = pathname.split("/").filter(Boolean).pop() ?? staticClientKey;
  const [data, setData] = useState<SLAData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [countdown, setCountdown] = useState("--:--:--");
  const fetchedAt = useRef(0);
  const remainingAtFetch = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const cid = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("cid")
        : null;
      const url = cid
        ? `/api/sla/${urlClientKey}?cid=${encodeURIComponent(cid)}`
        : `/api/sla/${urlClientKey}`;

      try {
        const response = await fetch(url);
        const live = response.ok ? (await response.json()) as SLAData : null;
        if (cancelled) return;
        if (!live) {
          setData(null);
          return;
        }
        if (live.status === "delivered" && live.deliverableUrl) {
          router.replace(live.deliverableUrl);
          return;
        }
        setData(live);
        fetchedAt.current = Date.now();
        remainingAtFetch.current = live.hoursRemaining ?? 0;
        setCountdown(formatCountdown(live.hoursRemaining ?? 0));
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setFetching(false);
      }
    };

    void load();
    const poll = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [router, urlClientKey]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (data?.status !== "in_progress") return;
      const elapsedSinceFetch = (Date.now() - fetchedAt.current) / 3600000;
      setCountdown(formatCountdown(Math.max(0, remainingAtFetch.current - elapsedSinceFetch)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [data?.status]);

  if (fetching) {
    return (
      <main className="min-h-screen bg-bg text-text-body flex items-center justify-center px-6">
        <p className="font-mono text-xs uppercase tracking-[0.18em]">Verifying recorded workflow state…</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-bg text-text-primary flex items-center justify-center px-6">
        <section className="max-w-md text-center space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-error">Access unavailable</p>
          <p className="text-text-body">This link is not active, or you do not have access to it.</p>
        </section>
      </main>
    );
  }

  if (data.status === "awaiting_payment") {
    return (
      <main className="min-h-screen bg-bg text-text-primary flex items-center justify-center px-6">
        <section className="w-full max-w-xl rounded-xl border border-border-accent bg-surface p-7 space-y-5">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Diagnostic portal</p>
          <h1 className="font-serif text-3xl font-bold">{data.clientName ?? urlClientKey}</h1>
          <p className="text-text-body leading-relaxed">
            The 72-hour delivery window has not started because no canonical payment is recorded for this client yet.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <State label="Payment" value={data.paymentStatus} />
            <State label="Project" value={data.projectStatus} />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg text-text-primary">
      <header className="border-b border-border-hi">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-accent">Signal &amp; Friction · Diagnostic Portal</span>
          <span className="font-mono text-xs text-text-muted">72h window</span>
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-10 px-6 py-14 lg:grid-cols-[1fr_0.8fr]">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Recorded status</p>
            <h1 className="font-serif text-4xl font-bold">{data.clientName ?? urlClientKey}</h1>
            <p className="max-w-2xl text-text-body leading-relaxed">
              Your diagnostic is in progress. This page shows recorded payment and workflow state; it does not mark analysis steps complete merely because time has passed.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <State label="Payment" value={data.paymentStatus} />
            <State label="Protocol" value={data.protocolStage} />
            <State label="Project" value={data.projectStatus} />
          </div>

          {data.slaStartedAt && (
            <p className="font-mono text-xs text-text-muted">
              Delivery window started from canonical payment: {new Date(data.slaStartedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          )}
        </div>

        <aside className="rounded-xl border border-border-accent bg-surface p-7 flex flex-col justify-center gap-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">Time remaining in delivery window</p>
          <div className="font-mono text-4xl font-bold tabular-nums text-accent">{countdown}</div>
          <div className="grid grid-cols-2 gap-3">
            <State label="Elapsed" value={data.hoursElapsed == null ? null : `${data.hoursElapsed}h`} raw />
            <State label="Window used" value={data.pctElapsed == null ? null : `${Math.round(data.pctElapsed)}%`} raw />
          </div>
          {(data.hoursRemaining ?? 1) <= 0 && (
            <p className="text-sm text-error">The stated delivery window has elapsed. This page does not mark the deliverable complete until a published deliverable exists.</p>
          )}
        </aside>
      </section>
    </main>
  );
}

function State({ label, value, raw = false }: { label: string; value: string | null | undefined; raw?: boolean }) {
  return (
    <div className="rounded-md border border-border-hi bg-bg/50 p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">{label}</p>
      <p className="mt-1 text-sm text-text-primary">{raw ? (value ?? "Unknown") : humanize(value)}</p>
    </div>
  );
}
