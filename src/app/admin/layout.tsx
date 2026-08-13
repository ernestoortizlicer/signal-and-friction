"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getAuthHeaders, supabase } from "@/lib/supabase";

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [stats, setStats] = useState({ activeLeads: 0, netWorth: 0, tasksToday: 0, currency: "USD" });
  const [statsError, setStatsError] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  const normalizedPathname = pathname?.replace(/\/$/, "") || "";
  const isLoginPage = normalizedPathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) return;
    const adminEmailsEnv = process.env.NEXT_PUBLIC_ALLOWED_ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAILS || "ernestoortiz@gmail.com,ernestoortizlicer@gmail.com";
    const whitelist = adminEmailsEnv.split(",").map((e) => e.trim().toLowerCase());

    function authorizeSession(session: { access_token: string; user?: { email?: string } } | null) {
      if (!session) { router.push("/admin/login"); return; }
      const userEmail = (session.user?.email || "").toLowerCase();
      if (!whitelist.includes(userEmail)) {
        supabase.auth.signOut();
        document.cookie = "sf-admin-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        router.push("/admin/login?error=unauthorized");
        return;
      }
      document.cookie = `sf-admin-session=${session.access_token}; path=/; max-age=604800; SameSite=Lax`;
      setAuthorized(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => authorizeSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setAuthorized(false); router.push("/admin/login"); }
      else authorizeSession(session);
    });
    return () => subscription.unsubscribe();
  }, [router, isLoginPage]);

  useEffect(() => {
    if (isLoginPage || !authorized) return;
    async function fetchHeaderStats() {
      setStatsError(false);
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const headers = getAuthHeaders();
        const [resProjects, resTasks, resFinance] = await Promise.all([
          fetch(`${supabaseUrl}/rest/v1/beta_projects?select=status`, { headers }),
          fetch(`${supabaseUrl}/rest/v1/priority_tasks?select=status&status=eq.pending`, { headers }),
          fetch("/api/finance", { headers }),
        ]);
        for (const res of [resProjects, resTasks, resFinance]) if (!res.ok) throw new Error(`Header stats request failed (${res.status}).`);
        const projects: { status: string }[] = await resProjects.json();
        const tasks: { status: string }[] = await resTasks.json();
        const finance = await resFinance.json() as { metrics?: { netWorthCents?: number }; profile?: { base_currency?: string } };
        const activeLeads = projects.filter((p) => p.status !== "closed_completed" && p.status !== "closed_lost").length;
        setStats({
          activeLeads,
          tasksToday: tasks.length,
          netWorth: Number(finance.metrics?.netWorthCents ?? 0) / 100,
          currency: finance.profile?.base_currency || "USD",
        });
      } catch (err) {
        console.error("Failed to fetch layout stats:", err);
        setStatsError(true);
      }
    }
    void fetchHeaderStats();
  }, [normalizedPathname, authorized, isLoginPage]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    document.cookie = "sf-admin-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/admin/login");
  };

  const navLinks = [
    { href: "/admin/dashboard", label: "Pipeline", code: "PL" },
    { href: "/admin/prospecting", label: "Prospecting", code: "PS" },
    { href: "/admin/scaffolds", label: "Scaffolds", code: "SC" },
    { href: "/admin/finance", label: "Finance", code: "FN" },
    { href: "/admin/priorities", label: "Priorities", code: "PR" },
    { href: "/admin/learning", label: "Learning", code: "LE" },
    { href: "/admin/certified", label: "Certified Archive", code: "AR" },
  ];

  if (isLoginPage) return <>{children}</>;
  if (!authorized) return <div className="min-h-screen bg-[#0A0908] flex items-center justify-center grain"><div className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-[#D4A853] animate-ping"/><span className="font-mono text-xs text-[#7A6F65] tracking-[0.2em] uppercase">Verifying Clearance...</span></div></div>;

  const netWorthLabel = (() => {
    if (statsError) return "—";
    try { return new Intl.NumberFormat(undefined, { style: "currency", currency: stats.currency, maximumFractionDigits: 0 }).format(stats.netWorth); }
    catch { return `${stats.netWorth.toFixed(0)} ${stats.currency}`; }
  })();

  return (
    <div className="min-h-screen bg-[#0A0908] text-[#F5F0EB] flex flex-col font-sans grain">
      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid rgba(212,168,83,.15);
          border-radius: .375rem;
          background: rgba(10,9,8,.82);
          color: #F5F0EB;
          padding: .55rem .7rem;
          font-size: .75rem;
          line-height: 1.25rem;
          outline: none;
        }
        .input::placeholder { color: #6A5F55; }
        .input:focus { border-color: rgba(212,168,83,.45); box-shadow: 0 0 0 2px rgba(212,168,83,.06); }
        select.input { color-scheme: dark; }
      `}</style>

      <header className="border-b border-[#D4A853]/8 bg-[#0A0908] px-5 flex items-center h-14 relative z-10 flex-shrink-0">
        <div className="flex items-center gap-3 mr-8">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="opacity-60 flex-shrink-0"><path d="M7 1L13 7L7 13L1 7Z" stroke="#D4A853" strokeWidth="1.2"/></svg>
          <span className="font-mono text-xs text-[#F5F0EB] tracking-[0.12em] uppercase font-semibold">S&amp;F</span>
          <div className="w-px h-4 bg-[#D4A853]/10"/>
          <span className="font-mono text-xs text-[#7A6F65] tracking-[0.15em] uppercase hidden sm:block">Command Center</span>
        </div>

        <div className="flex-1 flex items-center justify-center gap-1">
          {[
            { label: "Active Leads", value: statsError ? "—" : String(stats.activeLeads), color: "text-[#5C9A6B]" },
            { label: "Net Worth", value: netWorthLabel, color: "text-[#D4A853]" },
            { label: "Pending", value: statsError ? "—" : String(stats.tasksToday), color: "text-amber-400" },
          ].map((stat, i) => <div key={stat.label} className="flex items-center"><div className="flex items-center gap-2 px-3 py-1.5 rounded border border-[#D4A853]/10 bg-[#D4A853]/[0.03]"><span className="font-mono text-xs text-[#7A6F65] tracking-[0.1em] uppercase hidden md:block">{stat.label}</span><span className={`font-mono text-sm font-semibold tabular-nums ${stat.color}`}>{stat.value}</span></div>{i<2&&<div className="w-px h-4 bg-[#D4A853]/8 mx-1"/>}</div>)}
        </div>

        <div className="flex items-center gap-4"><div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#5C9A6B] status-dot-live"/><span className="font-mono text-xs text-[#7A6F65] tracking-[0.1em] uppercase hidden sm:block">Online</span></div><div className="w-px h-4 bg-[#D4A853]/8"/><button type="button" onClick={handleLogout} aria-label="Logout from admin panel" className="font-mono text-xs text-[#7A6F65] hover:text-[#F5F0EB] transition-colors cursor-pointer tracking-[0.08em] uppercase">Exit ×</button></div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-16 md:w-60 border-r border-[#D4A853]/8 bg-[#0A0908] flex flex-col py-4 flex-shrink-0">
          <div className="hidden md:block font-mono text-xs text-[#7A6F65] tracking-[0.2em] uppercase px-5 pb-3 border-b border-[#D4A853]/6 mb-2">Modules</div>
          <nav className="flex flex-col gap-0.5 px-2 md:px-3 mt-1">
            {navLinks.map((link) => {
              const isActive = normalizedPathname === link.href || normalizedPathname.startsWith(`${link.href}/`);
              return <Link key={link.href} href={link.href} className={`relative flex items-center gap-3 px-2 md:px-3 py-3 rounded-md font-mono transition-all duration-200 cursor-pointer group ${isActive?"text-[#F5F0EB] bg-[#D4A853]/8":"text-[#B0A89E] hover:text-[#F5F0EB] hover:bg-[#D4A853]/5"}`}>
                {isActive&&<motion.div layoutId="cmd-nav-indicator" className="absolute left-0 top-1 bottom-1 w-[3px] bg-[#D4A853] rounded-r" transition={{type:"spring",stiffness:300,damping:30}}/>}
                <span className="md:hidden text-xs tracking-[0.12em] uppercase text-center w-full font-medium">{link.code}</span>
                <span className={`hidden md:inline text-xs tracking-[0.15em] uppercase w-6 flex-shrink-0 font-medium ${isActive?"text-[#D4A853]":"text-[#7A6F65] group-hover:text-[#B0A89E]"}`}>{link.code}</span>
                <span className="hidden md:inline text-sm tracking-wide font-medium">{link.label}</span>
                {isActive&&<span className="hidden md:block ml-auto w-1.5 h-1.5 rounded-full bg-[#D4A853]"/>}
              </Link>;
            })}
            {normalizedPathname.startsWith("/admin/finance") && <Link href="/admin/finance/jurisdictions" className={`hidden md:flex ml-8 mt-1 px-3 py-2 rounded text-[10px] font-mono uppercase tracking-wider border ${normalizedPathname === "/admin/finance/jurisdictions" ? "border-[#D4A853]/30 bg-[#D4A853]/8 text-[#D4A853]" : "border-transparent text-[#7A6F65] hover:text-[#B0A89E]"}`}>JX · Jurisdictions</Link>}
          </nav>
          <div className="mt-auto px-5 py-4 hidden md:block border-t border-[#D4A853]/6"><div className="font-mono text-xs text-[#7A6F65] tracking-[0.15em] uppercase">V2 Authority</div></div>
        </aside>
        <main className="flex-1 bg-[#0A0908] relative overflow-auto"><div className="absolute inset-0 diagnostic-grid pointer-events-none opacity-30"/><div className="relative z-10 h-full">{children}</div></main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) { return <AdminShell>{children}</AdminShell>; }
