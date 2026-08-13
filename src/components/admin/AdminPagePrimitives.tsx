import Link from "next/link";

export function AdminPageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <header className="sf-page-header md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div>
        <span className="sf-eyebrow">{eyebrow}</span>
        <h1 className="sf-page-title mt-2">{title}</h1>
        {description && <p className="sf-page-subtitle mt-3">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div>}
    </header>
  );
}

export function AdminPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`sf-card p-5 md:p-6 ${className}`}>{children}</section>;
}

export function AdminMetric({ label, value, detail }: { label: string; value: React.ReactNode; detail?: string }) {
  return (
    <div className="sf-card p-4 md:p-5 min-w-0">
      <span className="sf-eyebrow !text-[12px] !tracking-[0.12em] text-[#7A6F65]">{label}</span>
      <span className="block font-serif text-2xl md:text-3xl text-[#F5F0EB] mt-2 tabular-nums">{value}</span>
      {detail && <span className="block text-xs text-[#7A6F65] mt-1">{detail}</span>}
    </div>
  );
}

export function AdminActionLink({ href, children, tone = "gold" }: { href: string; children: React.ReactNode; tone?: "gold" | "neutral" | "green" }) {
  const cls = tone === "green" ? "border-[#5C9A6B]/30 text-[#5C9A6B] hover:bg-[#5C9A6B]/10" : tone === "neutral" ? "border-white/10 text-[#B0A89E] hover:bg-white/5" : "border-[#D4A853]/30 text-[#D4A853] hover:bg-[#D4A853]/10";
  return <Link href={href} className={`inline-flex min-h-9 items-center justify-center rounded-lg border px-3.5 py-2 text-xs font-mono uppercase tracking-[0.1em] transition-colors ${cls}`}>{children}</Link>;
}

export function AdminStatus({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "gold" | "green" | "red" | "amber" }) {
  const cls = {
    neutral: "border-white/10 bg-white/5 text-[#B0A89E]",
    gold: "border-[#D4A853]/25 bg-[#D4A853]/8 text-[#D4A853]",
    green: "border-[#5C9A6B]/25 bg-[#5C9A6B]/8 text-[#5C9A6B]",
    red: "border-[#C85C5C]/25 bg-[#C85C5C]/8 text-[#C85C5C]",
    amber: "border-amber-400/25 bg-amber-400/8 text-amber-400",
  }[tone];
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-mono tracking-wide ${cls}`}>{children}</span>;
}

export function AdminDefinition({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <span className="sf-eyebrow !text-[12px] !tracking-[0.1em] text-[#7A6F65]">{label}</span>
      <div className="mt-1.5 text-sm text-[#B0A89E] leading-relaxed min-w-0">{children}</div>
    </div>
  );
}
