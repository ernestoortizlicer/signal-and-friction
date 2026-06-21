"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface SLAData {
  status: "in_progress" | "delivered";
  clientName?: string;
  clientKey?: string;
  createdAt?: string;
  hoursElapsed?: number;
  hoursRemaining?: number;
  pctElapsed?: number;
  projectStatus?: string;
  deliverableUrl?: string;
}

const spring = { type: "spring" as const, stiffness: 100, damping: 18 };

const itemVariants = {
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: spring },
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

function formatCountdown(hoursRemaining: number): string {
  if (hoursRemaining <= 0) return "00:00:00";
  const totalSeconds = Math.floor(hoursRemaining * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export default function SLAClientView({ staticClientKey }: { staticClientKey: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const urlClientKey =
    pathname.split("/").filter(Boolean).pop() ?? staticClientKey ?? "acme-corp";

  const [data, setData] = useState<SLAData | null>(null);
  const [countdown, setCountdown] = useState("--:--:--");
  const [fetching, setFetching] = useState(true);
  const fetchedAt = useRef<number>(Date.now());
  const hoursRemainingRef = useRef<number>(0);

  const fetchData = () => {
    fetch(`/api/sla/${urlClientKey}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((live: SLAData | null) => {
        if (live) {
          setData(live);
          fetchedAt.current = Date.now();
          hoursRemainingRef.current = live.hoursRemaining ?? 0;
          if (live.status === "delivered" && live.deliverableUrl) {
            router.replace(live.deliverableUrl);
          }
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  };

  useEffect(() => {
    fetchData();
    const poll = setInterval(fetchData, 60_000);
    return () => clearInterval(poll);
  }, [urlClientKey]);

  useEffect(() => {
    const tick = setInterval(() => {
      const secondsElapsed = (Date.now() - fetchedAt.current) / 1000;
      const live = Math.max(0, hoursRemainingRef.current - secondsElapsed / 3600);
      setCountdown(formatCountdown(live));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const pct = data?.pctElapsed ?? 0;
  const isOverdue = (data?.hoursRemaining ?? 1) <= 0;
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct / 100);

  const phases: { label: string; done: boolean }[] = [
    { label: "Briefing received", done: true },
    { label: "Funnel analysis", done: (data?.hoursElapsed ?? 0) > 4 },
    { label: "Friction diagnosis", done: (data?.hoursElapsed ?? 0) > 24 },
    { label: "Loom production", done: (data?.hoursElapsed ?? 0) > 48 },
    { label: "Client delivery", done: false },
  ];

  if (fetching && !data) {
    return (
      <div className="min-h-screen bg-[#0A0908] flex items-center justify-center font-mono text-xs text-[#D4A853]/40 animate-pulse">
        Verifying protocol status...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0908] text-[#F5F0EB] overflow-x-hidden">

      {/* Fixed nav */}
      <nav className="w-full fixed top-0 z-50 bg-[#0A0908]/90 backdrop-blur-xl border-b border-[#D4A853]/10">
        <div className="max-w-[1000px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-serif text-[#D4A853] text-lg tracking-tight font-bold">
              Signal &amp; Friction
            </span>
            <span className="text-xs text-[#7A6F65] font-mono">/ Diagnostic Portal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853] animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#D4A853]/60 border border-[#D4A853]/25 px-3 py-1 rounded bg-[#D4A853]/5">
              72h Protocol Active
            </span>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="pt-28 pb-16 px-6 border-b border-[#D4A853]/10"
      >
        <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 items-center">

          {/* Left */}
          <motion.div variants={itemVariants} className="md:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#D4A853]">
                Diagnosis in progress
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853]/30" />
              <span className="font-mono text-xs text-[#7A6F65]">
                {data?.createdAt
                  ? new Date(data.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—"}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#F5F0EB] font-serif">
              {data?.clientName ?? urlClientKey}
            </h1>

            <p className="text-base text-[#9A8F82] leading-relaxed max-w-[56ch]">
              Your friction diagnostic is being analyzed. You will receive a Loom video
              with a full funnel breakdown and three intervention decisions within 72 hours
              of protocol initiation.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <span className="font-mono text-xs px-3 py-1.5 border border-[#D4A853]/20 rounded-full text-[#D4A853] bg-[#D4A853]/5">
                ⚡ 20% Growth Guarantee
              </span>
              <span className="font-mono text-xs px-3 py-1.5 border border-[#5C9A6B]/20 rounded-full text-[#5C9A6B] bg-[#5C9A6B]/5">
                ✓ Zero-Call — Written + Loom delivery
              </span>
            </div>
          </motion.div>

          {/* Right: countdown ring */}
          <motion.div variants={itemVariants} className="flex flex-col items-center gap-6">
            <div className="relative flex items-center justify-center">
              <svg width="220" height="220" className="-rotate-90">
                <circle
                  cx="110" cy="110" r={radius}
                  fill="none"
                  stroke="rgba(212,168,83,0.08)"
                  strokeWidth="4"
                />
                <circle
                  cx="110" cy="110" r={radius}
                  fill="none"
                  stroke={isOverdue ? "#C85C5C" : "#D4A853"}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  style={{
                    transition: "stroke-dashoffset 1s linear",
                    filter: `drop-shadow(0 0 8px ${isOverdue ? "#C85C5C" : "#D4A853"}60)`,
                  }}
                />
              </svg>
              <div className="absolute flex flex-col items-center gap-1">
                <span
                  className={`font-mono text-4xl font-bold tracking-widest tabular-nums ${
                    isOverdue ? "text-[#C85C5C]" : "text-[#D4A853]"
                  }`}
                >
                  {countdown}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#7A6F65]">
                  time remaining
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 w-full">
              {[
                { label: "Window", value: "72h", color: "text-[#F5F0EB]" },
                {
                  label: "Elapsed",
                  value: `${Math.round(data?.hoursElapsed ?? 0)}h`,
                  color: isOverdue ? "text-[#C85C5C]" : "text-amber-400",
                },
                { label: "Progress", value: `${Math.round(pct)}%`, color: "text-[#D4A853]" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="border border-[#D4A853]/10 bg-[#110F0D] p-3 rounded-xl text-center"
                >
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[#7A6F65] block mb-1">
                    {s.label}
                  </span>
                  <span className={`font-mono text-lg font-bold ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Progress bar */}
      <section className="px-6 py-8 border-b border-[#D4A853]/5">
        <div className="max-w-[1000px] mx-auto space-y-3">
          <div className="flex justify-between font-mono text-xs uppercase tracking-widest text-[#7A6F65]">
            <span>Protocol initiated</span>
            <span className={isOverdue ? "text-[#C85C5C]" : "text-[#D4A853]"}>
              {isOverdue
                ? "⚠ SLA window exceeded"
                : `${Math.round(data?.hoursRemaining ?? 72)}h until guaranteed delivery`}
            </span>
          </div>
          <div className="h-2 bg-black/60 border border-[#D4A853]/8 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: isOverdue
                  ? "linear-gradient(90deg, #7A2C2C, #C85C5C)"
                  : "linear-gradient(90deg, #7A5C1E 0%, #D4A853 60%, #F0CF7A 100%)",
                filter: "drop-shadow(0 0 4px rgba(212,168,83,0.4))",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(pct, 0.5)}%` }}
              transition={{ type: "spring", stiffness: 60, damping: 20 }}
            />
          </div>
        </div>
      </section>

      {/* Phase tracker */}
      <section className="px-6 py-14 border-b border-[#D4A853]/5">
        <div className="max-w-[1000px] mx-auto space-y-8">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#D4A853] block mb-1">
              01 — Protocol Phases
            </span>
            <h2 className="font-serif text-2xl text-white">Diagnostic status</h2>
          </div>

          <div className="space-y-3">
            {phases.map((phase, i) => {
              const isActive = !phase.done && (i === 0 || phases[i - 1]?.done);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...spring, delay: i * 0.07 }}
                  className={`flex items-center gap-4 p-5 border rounded-xl ${
                    phase.done
                      ? "border-[#5C9A6B]/20 bg-[#5C9A6B]/5"
                      : isActive
                      ? "border-[#D4A853]/30 bg-[#D4A853]/5"
                      : "border-white/5 bg-black/20"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-mono text-sm font-bold ${
                      phase.done
                        ? "bg-[#5C9A6B]/20 text-[#5C9A6B] border border-[#5C9A6B]/30"
                        : isActive
                        ? "bg-[#D4A853]/15 text-[#D4A853] border border-[#D4A853]/30 animate-pulse"
                        : "bg-white/5 text-[#7A6F65] border border-white/10"
                    }`}
                  >
                    {phase.done ? "✓" : i + 1}
                  </div>
                  <span
                    className={`flex-1 font-sans text-sm font-medium ${
                      phase.done
                        ? "text-[#5C9A6B]"
                        : isActive
                        ? "text-[#F5F0EB]"
                        : "text-[#7A6F65]"
                    }`}
                  >
                    {phase.label}
                  </span>
                  {isActive && (
                    <span className="font-mono text-[9px] uppercase tracking-widest text-[#D4A853] border border-[#D4A853]/20 px-2 py-0.5 rounded-full">
                      In progress
                    </span>
                  )}
                  {!phase.done && !isActive && (
                    <span className="font-mono text-[9px] uppercase tracking-widest text-[#7A6F65]">
                      Pending
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* What to expect */}
      <section className="px-6 py-14 border-b border-[#D4A853]/5">
        <div className="max-w-[1000px] mx-auto space-y-8">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#D4A853] block mb-1">
              02 — Deliverables
            </span>
            <h2 className="font-serif text-2xl text-white">What you will receive</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: "🎬",
                title: "Loom Video",
                description:
                  "A full screen-recorded funnel walkthrough — annotated, precise, and immediately actionable.",
              },
              {
                icon: "⚡",
                title: "3 Decisions",
                description:
                  "Conservative / Aggressive / Lateral. Three divergent intervention paths to eliminate the identified friction point.",
              },
              {
                icon: "📐",
                title: "Figma Wireframe",
                description:
                  "A redesigned interface with surgical annotations — ready to pass directly to your product team.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="border border-[#D4A853]/10 bg-[#110F0D] p-6 rounded-2xl space-y-3"
              >
                <span className="text-2xl">{item.icon}</span>
                <h3 className="font-serif text-lg text-white">{item.title}</h3>
                <p className="text-sm text-[#9A8F82] leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10">
        <div className="max-w-[1000px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-serif text-[#D4A853] font-bold">Signal &amp; Friction</span>
            <span className="text-xs text-[#7A6F65] font-mono">· Intellectual Scalpel</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853] animate-pulse" />
            <span className="font-mono text-xs text-[#7A6F65]">
              This page refreshes automatically when your diagnostic is ready.
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#D4A853]/60">
            signal-and-friction.com
          </span>
        </div>
      </footer>
    </main>
  );
}
