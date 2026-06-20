"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getAuthHeaders, supabase } from "@/lib/supabase";

interface ProjectStatus {
  status: string;
}

interface PriorityTaskStatus {
  status: string;
}

interface Account {
  id: string;
  type: "asset" | "liability" | string;
}

interface TransactionEntry {
  amount: number;
  account_id: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [stats, setStats] = useState({ activeLeads: 0, netWorth: 0, tasksToday: 0 });
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login") return;
    const getCookie = (name: string) => {
      if (typeof window === "undefined") return undefined;
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return undefined;
    };

    const token = getCookie("sf-admin-session");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        let base64Payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        while (base64Payload.length % 4) {
          base64Payload += "=";
        }
        const payload = JSON.parse(atob(base64Payload));

        const isExpired = payload.exp * 1000 < Date.now();
        if (isExpired) {
          document.cookie = "sf-admin-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          router.push("/admin/login");
          return;
        }

        const adminEmailsEnv = process.env.NEXT_PUBLIC_ALLOWED_ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAILS || "ernestoortiz@gmail.com,ernestoortizlicer@gmail.com";
        if (adminEmailsEnv) {
          const whitelist = adminEmailsEnv.split(",").map(e => e.trim().toLowerCase());
          const userEmail = (payload.email || "").toLowerCase();

          if (!whitelist.includes(userEmail)) {
            document.cookie = "sf-admin-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            router.push("/admin/login?error=unauthorized");
            return;
          }
        }

        setTimeout(() => {
          setAuthorized(true);
        }, 0);
      } else {
        router.push("/admin/login");
      }
    } catch {
      router.push("/admin/login");
    }
  }, [router, pathname]);

  useEffect(() => {
    if (pathname === "/admin/login" || !authorized) return;
    async function fetchHeaderStats() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-supabase.supabase.co";
        const headers = getAuthHeaders();

        const [resProjects, resTasks, resAcc, resEntries] = await Promise.all([
          fetch(`${supabaseUrl}/rest/v1/beta_projects?select=status`, { headers }),
          fetch(`${supabaseUrl}/rest/v1/priority_tasks?select=status&status=eq.pending`, { headers }),
          fetch(`${supabaseUrl}/rest/v1/accounts?select=id,type`, { headers }),
          fetch(`${supabaseUrl}/rest/v1/transaction_entries?select=amount,account_id`, { headers }),
        ]);

        const projects: ProjectStatus[] = resProjects.ok ? await resProjects.json() : [];
        const tasks: PriorityTaskStatus[] = resTasks.ok ? await resTasks.json() : [];
        const accounts: Account[] = resAcc.ok ? await resAcc.json() : [];
        const entries: TransactionEntry[] = resEntries.ok ? await resEntries.json() : [];

        const activeLeadsCount = projects.filter((p) =>
          p.status !== "closed_completed" && p.status !== "closed_lost"
        ).length;

        const tasksTodayCount = tasks.length;

        const accountBalances: Record<string, number> = {};
        entries.forEach((e) => {
          accountBalances[e.account_id] = (accountBalances[e.account_id] || 0) + e.amount;
        });

        let totalAssets = 0;
        let totalLiabilities = 0;

        accounts.forEach((a) => {
          const balance = (accountBalances[a.id] || 0) / 100;
          if (a.type === "asset") {
            totalAssets += balance;
          } else if (a.type === "liability") {
            totalLiabilities += Math.abs(balance);
          }
        });

        const computedNetWorth = totalAssets - totalLiabilities;

        setStats({
          activeLeads: activeLeadsCount || 3,
          netWorth: computedNetWorth || 10625,
          tasksToday: tasksTodayCount || 5,
        });
      } catch (err) {
        console.warn("Failed to fetch layout stats, using fallbacks:", err);
        setStats({ activeLeads: 3, netWorth: 10625, tasksToday: 5 });
      }
    }

    fetchHeaderStats();
  }, [pathname, authorized]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    document.cookie = "sf-admin-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/admin/login");
  };

  const navLinks = [
    { href: "/admin/dashboard", label: "Pipeline", code: "PL" },
    { href: "/admin/finance", label: "Finance", code: "FN" },
    { href: "/admin/priorities", label: "Priorities", code: "PR" },
    { href: "/admin/learning", label: "Learning", code: "LE" },
    { href: "/admin/certified", label: "Certified", code: "CE" },
  ];

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#0A0908] flex items-center justify-center grain">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853] animate-ping" />
          <span className="font-mono text-xs text-[#7A6F65] tracking-[0.2em] uppercase">
            Verifying Clearance...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0908] text-[#F5F0EB] flex flex-col font-sans grain">

      {/* ── Command Center Header ──────────────────────────── */}
      <header className="border-b border-[#D4A853]/8 bg-[#0A0908] px-5 flex items-center h-14 relative z-10 flex-shrink-0">

        {/* Left: brand identity */}
        <div className="flex items-center gap-3 mr-8">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="opacity-60 flex-shrink-0">
            <path d="M7 1L13 7L7 13L1 7Z" stroke="#D4A853" strokeWidth="1.2" />
          </svg>
          <span className="font-mono text-xs text-[#F5F0EB] tracking-[0.12em] uppercase font-semibold">
            S&amp;F
          </span>
          <div className="w-px h-4 bg-[#D4A853]/10" />
          <span className="font-mono text-xs text-[#7A6F65] tracking-[0.15em] uppercase hidden sm:block">
            Command Center
          </span>
          <div className="w-px h-4 bg-[#D4A853]/10 hidden lg:block" />
          <span className="font-mono text-xs text-[#D4A853] tracking-[0.1em] uppercase hidden lg:block">
            Phase 3: Uruguay 🇺🇾
          </span>
        </div>

        {/* Center: live telemetry chips */}
        <div className="flex-1 flex items-center justify-center gap-1">
          {[
            { label: "Active Leads", value: String(stats.activeLeads), color: "text-[#5C9A6B]" },
            { label: "Net Worth", value: `$${stats.netWorth.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, color: "text-[#D4A853]" },
            { label: "Pending", value: String(stats.tasksToday), color: "text-amber-400" },
          ].map((stat, i) => (
            <div key={stat.label} className="flex items-center">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-[#D4A853]/10 bg-[#D4A853]/[0.03]">
                <span className="font-mono text-xs text-[#7A6F65] tracking-[0.1em] uppercase hidden md:block">
                  {stat.label}
                </span>
                <span className={`font-mono text-sm font-semibold tabular-nums ${stat.color}`}>
                  {stat.value}
                </span>
              </div>
              {i < 2 && <div className="w-px h-4 bg-[#D4A853]/8 mx-1" />}
            </div>
          ))}
        </div>

        {/* Right: status + logout */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#5C9A6B] status-dot-live" />
            <span className="font-mono text-xs text-[#7A6F65] tracking-[0.1em] uppercase hidden sm:block">
              Online
            </span>
          </div>
          <div className="w-px h-4 bg-[#D4A853]/8" />
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Logout from admin panel"
            className="font-mono text-xs text-[#7A6F65] hover:text-[#F5F0EB] transition-colors cursor-pointer tracking-[0.08em] uppercase"
          >
            Exit ×
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">

        {/* ── Navigation Sidebar ────────────────────────────── */}
        <aside className="w-16 md:w-60 border-r border-[#D4A853]/8 bg-[#0A0908] flex flex-col py-4 flex-shrink-0">

          <div className="hidden md:block font-mono text-xs text-[#5C5550] tracking-[0.2em] uppercase px-5 pb-3 border-b border-[#D4A853]/6 mb-2">
            Modules
          </div>

          <nav className="flex flex-col gap-0.5 px-2 md:px-3 mt-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center gap-3 px-2 md:px-3 py-3 rounded-md font-mono transition-all duration-200 cursor-pointer group ${
                    isActive
                      ? "text-[#F5F0EB] bg-[#D4A853]/8"
                      : "text-[#9A8F82] hover:text-[#F5F0EB] hover:bg-[#D4A853]/5"
                  }`}
                >
                  {/* Active indicator — gold left border */}
                  {isActive && (
                    <motion.div
                      layoutId="cmd-nav-indicator"
                      className="absolute left-0 top-1 bottom-1 w-[3px] bg-[#D4A853] rounded-r"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}

                  {/* Mobile: code only */}
                  <span className="md:hidden text-xs tracking-[0.12em] uppercase text-center w-full font-medium">
                    {link.code}
                  </span>

                  {/* Desktop: code + label */}
                  <span className={`hidden md:inline text-xs tracking-[0.15em] uppercase w-6 flex-shrink-0 font-medium ${isActive ? "text-[#D4A853]" : "text-[#5C5550] group-hover:text-[#9A8F82]"}`}>
                    {link.code}
                  </span>
                  <span className="hidden md:inline text-sm tracking-wide font-medium">
                    {link.label}
                  </span>

                  {/* Active dot */}
                  {isActive && (
                    <span className="hidden md:block ml-auto w-1.5 h-1.5 rounded-full bg-[#D4A853]" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom version */}
          <div className="mt-auto px-5 py-4 hidden md:block border-t border-[#D4A853]/6">
            <div className="font-mono text-xs text-[#3A3530] tracking-[0.15em] uppercase">
              Engine v2.4
            </div>
          </div>
        </aside>

        {/* ── Main Workspace ──────────────────────────────── */}
        <main className="flex-1 bg-[#0A0908] relative overflow-auto">
          <div className="absolute inset-0 diagnostic-grid pointer-events-none opacity-30" />
          <div className="relative z-10 h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
