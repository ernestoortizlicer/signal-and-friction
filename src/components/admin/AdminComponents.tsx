"use client";

import { motion } from "framer-motion";

/* ═══════════════════════════════════════════════════════════════════════════════
   Signal & Friction — Admin Design System
   Shared components for the Command Center. Every admin page imports from here.
   Palette: #0A0908 obsidian · #D4A853 gold · #F5F0EB warm white
            #5C9A6B warm green · #C85C5C warm red · #9A8F82 muted
   ═══════════════════════════════════════════════════════════════════════════════ */

/* ── Stat Card ─────────────────────────────────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: string | number;
  detail?: string;
  accentColor?: string;
  trend?: "up" | "down" | "neutral";
  glowColor?: string;
  sparklineData?: number[];
}

export function AdminStatCard({
  label,
  value,
  detail,
  accentColor = "text-[#F5F0EB]",
  glowColor = "rgba(212,168,83,0.08)",
  sparklineData,
}: StatCardProps) {
  const hasSparkline = sparklineData && sparklineData.length > 0;
  const sparkMax = hasSparkline ? Math.max(...sparklineData, 1) : 1;
  const BAR_W = 4;
  const BAR_GAP = 2;
  const SPARK_H = 20;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-[#D4A853]/12 p-5 bg-[#110F0D] rounded-2xl relative overflow-hidden group hover:border-[#D4A853]/25 transition-all duration-300"
      style={{ boxShadow: `0 0 0 0 ${glowColor}` }}
      whileHover={{ boxShadow: `0 0 24px 0 ${glowColor}` }}
    >
      {/* Bottom accent line on hover */}
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4A853]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <span className="font-mono text-xs text-[#D4A853]/70 uppercase tracking-[0.15em] block mb-3">
        {label}
      </span>
      <span className={`font-serif text-3xl font-bold block mb-1.5 tabular-nums ${accentColor}`}>
        {value}
      </span>
      {detail && (
        <span className="text-xs text-[#B0A89E] font-mono">{detail}</span>
      )}
      {hasSparkline && (
        <div className="mt-3 flex items-end gap-[2px]">
          {sparklineData.map((v, i) => {
            const barH = Math.max(2, Math.round((v / sparkMax) * SPARK_H));
            return (
              <div
                key={i}
                title={`$${v.toLocaleString()}`}
                style={{ width: BAR_W, height: barH, marginRight: i < sparklineData.length - 1 ? BAR_GAP : 0 }}
                className="bg-[#D4A853]/50 rounded-sm flex-shrink-0 self-end group-hover:bg-[#D4A853]/70 transition-colors"
              />
            );
          })}
          <span className="ml-auto font-mono text-[10px] text-[#7A6F65] self-end pb-px">7d</span>
        </div>
      )}
    </motion.div>
  );
}

/* ── Badge ─────────────────────────────────────────────────────────────────── */
type BadgeVariant = "green" | "gold" | "red" | "amber" | "muted" | "purple";

const BADGE_CLASSES: Record<BadgeVariant, string> = {
  green: "bg-[#5C9A6B]/10 border-[#5C9A6B]/20 text-[#5C9A6B]",
  gold: "bg-[#D4A853]/10 border-[#D4A853]/20 text-[#D4A853]",
  red: "bg-[#C85C5C]/10 border-[#C85C5C]/20 text-[#C85C5C]",
  amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  muted: "bg-white/5 border-white/10 text-[#B0A89E]",
  purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
};

export function AdminBadge({
  variant = "muted",
  children,
  dot = false,
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border tracking-wide font-medium ${BADGE_CLASSES[variant]}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            variant === "green" ? "bg-[#5C9A6B]" :
            variant === "red" ? "bg-[#C85C5C]" :
            variant === "gold" ? "bg-[#D4A853]" :
            variant === "amber" ? "bg-amber-400" :
            "bg-[#9A8F82]"
          }`}
        />
      )}
      {children}
    </span>
  );
}

/* ── Card ──────────────────────────────────────────────────────────────────── */
export function AdminCard({
  children,
  className = "",
  glow = false,
  padding = "p-6",
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  padding?: string;
}) {
  return (
    <div
      className={`border border-[#D4A853]/10 bg-[#110F0D] rounded-2xl ${padding} ${glow ? "glow-border" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

/* ── Section Header ────────────────────────────────────────────────────────── */
export function AdminSectionHeader({
  eyebrow,
  title,
  subtitle,
  badge,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between border-b border-[#D4A853]/8 pb-4 mb-6">
      <div>
        {eyebrow && (
          <span className="font-mono text-xs text-[#D4A853]/70 uppercase tracking-[0.2em] block mb-1">
            {eyebrow}
          </span>
        )}
        <h2 className="text-xl font-bold text-[#F5F0EB] font-serif tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-[#B0A89E] font-mono mt-1">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3 mt-1">
        {badge}
        {action}
      </div>
    </div>
  );
}

/* ── Empty State ───────────────────────────────────────────────────────────── */
export function AdminEmptyState({
  icon,
  text,
  subtext,
}: {
  icon?: string;
  text: string;
  subtext?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
      {icon && (
        <div className="text-3xl opacity-30 select-none">{icon}</div>
      )}
      <p className="text-sm text-[#B0A89E] font-mono">{text}</p>
      {subtext && (
        <p className="text-xs text-[#7A6F65] font-mono">{subtext}</p>
      )}
    </div>
  );
}

/* ── Revenue Progress Bar ──────────────────────────────────────────────────── */
export function RevenueProgressBar({
  current,
  target = 1000000,
}: {
  current: number;
  target?: number;
}) {
  const pct = Math.min((current / target) * 100, 100);
  const displayPct = pct.toFixed(1);
  const remaining = Math.max(target - current, 0);

  return (
    <div className="border border-[#D4A853]/10 bg-[#110F0D] rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono text-xs text-[#D4A853]/70 uppercase tracking-[0.15em] block mb-0.5">
            $1M Revenue Mission
          </span>
          <span className="font-serif text-lg font-bold text-[#F5F0EB]">
            ${current.toLocaleString()}
            <span className="text-[#B0A89E] text-sm font-mono font-normal ml-2">
              / $1,000,000
            </span>
          </span>
        </div>
        <div className="text-right">
          <span className="font-mono text-xs text-[#B0A89E] block">Remaining</span>
          <span className="font-serif text-base font-bold text-[#D4A853]">
            ${remaining.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-[#D4A853]/8">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#D4A853]/60 to-[#D4A853]"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <div className="flex justify-between font-mono text-xs text-[#7A6F65]">
        <span>{displayPct}% complete</span>
        <span>Phase 2</span>
      </div>
    </div>
  );
}

/* ── Table Wrapper ─────────────────────────────────────────────────────────── */
export function AdminTable({
  headers,
  children,
  className = "",
}: {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-[#D4A853]/8 ${className}`}>
      <table className="w-full text-left font-mono text-xs">
        <thead>
          <tr className="border-b border-[#D4A853]/8 bg-[#D4A853]/[0.02]">
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-[#D4A853]/70 uppercase tracking-[0.12em] font-semibold text-xs whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#D4A853]/5">{children}</tbody>
      </table>
    </div>
  );
}

/* ── Alert Banner ──────────────────────────────────────────────────────────── */
export function AdminAlert({
  variant = "gold",
  children,
}: {
  variant?: "green" | "gold" | "red";
  children: React.ReactNode;
}) {
  const cls = {
    green: "border-[#5C9A6B]/20 bg-[#5C9A6B]/5 text-[#5C9A6B]",
    gold: "border-[#D4A853]/20 bg-[#D4A853]/5 text-[#D4A853]",
    red: "border-[#C85C5C]/20 bg-[#C85C5C]/5 text-[#C85C5C]",
  }[variant];

  return (
    <div className={`border rounded-xl px-4 py-3 text-sm font-mono ${cls}`}>
      {children}
    </div>
  );
}
