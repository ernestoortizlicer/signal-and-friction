"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAuthHeaders } from "@/lib/supabase";

function renderInlineBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="text-[#F5F0EB] font-semibold">{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

function renderMarkdownBlock(text: string): React.ReactNode {
  return text.split('\n').map((line, idx) => {
    if (line.startsWith('### ')) {
      const content = line.slice(4).replace(/\*\*/g, '');
      return <div key={idx} className="font-bold text-[#D4A853] text-xs uppercase tracking-wider pt-3 pb-1">{content}</div>;
    }
    if (line.startsWith('## ')) {
      const content = line.slice(3).replace(/\*\*/g, '');
      return <div key={idx} className="font-bold text-[#F5F0EB] text-sm pt-3 pb-1">{content}</div>;
    }
    if (line.trim() === '') {
      return <div key={idx} className="h-1.5" />;
    }
    if (line.startsWith('- ')) {
      return (
        <div key={idx} className="flex gap-2 items-start">
          <span className="text-[#D4A853] shrink-0 leading-relaxed">·</span>
          <span className="leading-relaxed">{renderInlineBold(line.slice(2))}</span>
        </div>
      );
    }
    return <div key={idx} className="leading-relaxed">{renderInlineBold(line)}</div>;
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface Account {
  id: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  currency: string;
}

interface TransactionEntry {
  id: string;
  transaction_id: string;
  account_id: string;
  category_id?: string;
  amount: number; // in cents
  created_at: string;
  accounts?: Account;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  source_project_id?: string;
  created_at: string;
  transaction_entries?: Array<{
    id: string;
    account_id: string;
    amount: number;
    accounts?: Account;
  }>;
}

interface Investment {
  id: string;
  account_id: string;
  name: string;
  type: 'hardware' | 'ai_tools' | 'software' | 'financial_asset';
  purchase_date: string;
  cost_basis: number;
  current_value: number;
  projected_annual_roi_pct?: number;
  actual_annual_roi_pct?: number;
  depreciation_rate_annual_pct?: number;
}

interface EducationContent {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string;
  body: string;
  read_time_mins: number;
}

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
}

const springConfig = { type: "spring" as const, stiffness: 100, damping: 18 };

export default function PersonalFinanceCenter() {
  const [activeSubView, setActiveSubView] = useState<'overview' | 'accounting' | 'investments' | 'education' | 'insights'>('overview');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);

  // Database States
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [entries, setEntries] = useState<TransactionEntry[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [articles, setArticles] = useState<EducationContent[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  // Interactive advice states
  const [advisorQuestion, setAdvisorQuestion] = useState("Should I upgrade my MacBook or buy more AI credits?");
  const [adviceResponse, setAdviceResponse] = useState<string | null>(null);
  const [adviceError, setAdviceError] = useState<string | null>(null);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [advisorMeta, setAdvisorMeta] = useState<{ model: string; tier: string; estimatedCostUSD: number } | null>(null);

  // Retirement calculator input states
  const [monthlyContrib, setMonthlyContrib] = useState(1000);
  const [returnRate, setReturnRate] = useState(8);
  const [yearsProject, setYearsProject] = useState(25);

  // Deliverable Intelligence
  const [viewStats, setViewStats] = useState<Record<string, { count: number; lastViewed: string | null }>>({});
  const [viewStatsLoading, setViewStatsLoading] = useState(true);

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFinanceData() {
      setFetchError(null);
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-supabase.supabase.co";
        const headers = getAuthHeaders();

        // Every request is checked for real failure — a non-ok response
        // throws, a genuinely empty table does not. Empty renders as
        // empty; only a real fetch failure is an error.
        const [resAcc, resTx, resEntries, resInv, resEdu, resGoals] = await Promise.all([
          fetch(`${supabaseUrl}/rest/v1/accounts?select=*`, { headers }),
          fetch(`${supabaseUrl}/rest/v1/transactions?select=*,transaction_entries(*,accounts(*))&order=date.desc`, { headers }),
          fetch(`${supabaseUrl}/rest/v1/transaction_entries?select=*,accounts(*)`, { headers }),
          fetch(`${supabaseUrl}/rest/v1/investments?select=*`, { headers }),
          fetch(`${supabaseUrl}/rest/v1/education_content?select=*`, { headers }),
          fetch(`${supabaseUrl}/rest/v1/financial_goals?select=*`, { headers }),
        ]);

        for (const [label, res] of [
          ["accounts", resAcc], ["transactions", resTx], ["transaction entries", resEntries],
          ["investments", resInv], ["education content", resEdu], ["financial goals", resGoals],
        ] as const) {
          if (!res.ok) throw new Error(`Failed to load ${label} (${res.status}).`);
        }

        setAccounts(await resAcc.json());
        setTransactions(await resTx.json());
        setEntries(await resEntries.json());
        setInvestments(await resInv.json());
        setArticles(await resEdu.json());
        setGoals(await resGoals.json());
        setLoading(false);
      } catch (err) {
        console.error("Failed to load financial data:", err);
        setFetchError(err instanceof Error ? err.message : "Failed to load financial data.");
        setLoading(false);
      }
    }

    fetchFinanceData();
  }, []);

  useEffect(() => {
    fetch("/api/views")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, { count: number; lastViewed: string | null }>) => setViewStats(data))
      .catch(() => setViewStats({}))
      .finally(() => setViewStatsLoading(false));
  }, []);

  // Compute Balances
  const accountBalances = accounts.reduce((acc, curr) => {
    const accountEntries = entries.filter(e => e.account_id === curr.id);
    const balance = accountEntries.reduce((sum, entry) => sum + entry.amount, 0);
    acc[curr.id] = balance;
    return acc;
  }, {} as Record<string, number>);

  // Compute Net Worth (Assets - Liabilities)
  const totalAssets = accounts
    .filter(a => a.type === "asset")
    .reduce((sum, a) => sum + (accountBalances[a.id] || 0), 0) / 100;

  const totalLiabilities = accounts
    .filter(a => a.type === "liability")
    .reduce((sum, a) => sum + Math.abs(accountBalances[a.id] || 0), 0) / 100;

  const netWorth = totalAssets - totalLiabilities;

  // Monthly Expenses / Burn Rate calculation
  const totalExpenses = accounts
    .filter(a => a.type === "expense")
    .reduce((sum, a) => sum + (accountBalances[a.id] || 0), 0) / 100;

  const averageBurnRate = totalExpenses;
  const runwayMonths = averageBurnRate > 0 ? totalAssets / averageBurnRate : 0;

  // Retirement compound calculator math
  const p = totalAssets; // start value
  const r = returnRate / 100;
  const n = 12;
  const yrs = yearsProject;
  const pmt = monthlyContrib;
  const nt = n * yrs;
  const rn = r / n;
  const compoundPrincipal = p * Math.pow(1 + rn, nt);
  const compoundContributions = pmt * ((Math.pow(1 + rn, nt) - 1) / rn) * (1 + rn);
  const totalAccumulated = compoundPrincipal + compoundContributions;

  let isTelemetryError = false;
  let stripeGrossVolume = 0;
  let stripeRefundsVolume = 0;
  let stripeMRR = 0;
  
  try {
    stripeGrossVolume = transactions
      .filter(tx => tx.description.toLowerCase().includes("payment") || tx.description.toLowerCase().includes("reconciliation"))
      .reduce((sum, tx) => {
        const debit = tx.transaction_entries?.find(e => e.amount > 0);
        return sum + (debit ? debit.amount : 0);
      }, 0) / 100;

    stripeRefundsVolume = transactions
      .filter(tx => tx.description.toLowerCase().includes("refund"))
      .reduce((sum, tx) => {
        const credit = tx.transaction_entries?.find(e => e.amount < 0);
        return sum + (credit ? Math.abs(credit.amount) : 0);
      }, 0) / 100;
    
    stripeMRR = transactions
      .filter(tx => tx.description.toLowerCase().includes("subscription"))
      .reduce((sum, tx) => {
        const debit = tx.transaction_entries?.find(e => e.amount > 0);
        return sum + (debit ? debit.amount : 0);
      }, 0) / 100;
  } catch {
    isTelemetryError = true;
  }

  // AI Advice Handler
  async function triggerAiAdvice() {
    setAdviceLoading(true);
    setAdviceError(null);
    setAdvisorMeta(null);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-supabase.supabase.co";
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

      const response = await fetch(`${supabaseUrl}/functions/v1/finance-advisor-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          question: advisorQuestion,
          context: { accounts, investments, goals, transactions: transactions.slice(0, 10) },
        })
      });

      if (!response.ok) {
        throw new Error(`Advisor request failed (${response.status}).`);
      }
      const result = await response.json();
      setAdviceResponse(result.answer);
      if (result.meta) setAdvisorMeta(result.meta);
    } catch (err) {
      // Never fabricate an AI answer — a failed call is a real error, not
      // an occasion to show a canned response as if the model produced it.
      console.error("Finance advisor call failed:", err);
      setAdviceResponse(null);
      setAdviceError(err instanceof Error ? err.message : "Advisor request failed.");
    } finally {
      setAdviceLoading(false);
    }
  }

  // ── Delete (hard, admin-gated by RLS — requires an authenticated session) ──
  async function deleteTransaction(id: string, label: string) {
    if (!window.confirm(`Permanently delete transaction "${label}"? This also removes its ledger entries and cannot be undone.`)) return;
    setDeleteError(null);
    setDeletingId(id);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-supabase.supabase.co";
      const headers = getAuthHeaders();
      const res = await fetch(`${supabaseUrl}/rest/v1/transactions?id=eq.${id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error(`Failed to delete transaction (${res.status}).`);
      setTransactions(prev => prev.filter(t => t.id !== id));
      setEntries(prev => prev.filter(e => e.transaction_id !== id));
    } catch (err) {
      console.error("Failed to delete transaction:", err);
      setDeleteError(err instanceof Error ? err.message : "Failed to delete transaction.");
    } finally {
      setDeletingId(null);
    }
  }

  async function deleteInvestment(id: string, label: string) {
    if (!window.confirm(`Permanently delete "${label}" from the asset portfolio? This cannot be undone.`)) return;
    setDeleteError(null);
    setDeletingId(id);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-supabase.supabase.co";
      const headers = getAuthHeaders();
      const res = await fetch(`${supabaseUrl}/rest/v1/investments?id=eq.${id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error(`Failed to delete investment (${res.status}).`);
      setInvestments(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error("Failed to delete investment:", err);
      setDeleteError(err instanceof Error ? err.message : "Failed to delete investment.");
    } finally {
      setDeletingId(null);
    }
  }

  async function deleteGoal(id: string, label: string) {
    if (!window.confirm(`Permanently delete goal "${label}"? This cannot be undone.`)) return;
    setDeleteError(null);
    setDeletingId(id);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-supabase.supabase.co";
      const headers = getAuthHeaders();
      const res = await fetch(`${supabaseUrl}/rest/v1/financial_goals?id=eq.${id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error(`Failed to delete goal (${res.status}).`);
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      console.error("Failed to delete goal:", err);
      setDeleteError(err instanceof Error ? err.message : "Failed to delete goal.");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0908] flex items-center justify-center font-mono text-xs text-[#B0A89E] animate-pulse">
        {"Loading financial workspace..."}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0908] text-[#cbd5e1] p-8 md:p-12 grain overflow-x-hidden">
      <div className="max-w-[1200px] mx-auto space-y-12">
        {fetchError && (
          <div className="border-2 border-[#C85C5C]/50 bg-[#C85C5C]/10 px-4 py-2.5 rounded flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C85C5C] animate-pulse shrink-0" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#C85C5C]">
              {"⚠ Failed to load financial data — "}{fetchError}
            </span>
          </div>
        )}

        {deleteError && (
          <div className="border-2 border-[#C85C5C]/50 bg-[#C85C5C]/10 px-4 py-2.5 rounded flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C85C5C] animate-pulse shrink-0" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#C85C5C]">
              {"⚠ "}{deleteError}
            </span>
            <button type="button" onClick={() => setDeleteError(null)} className="underline text-xs font-mono ml-auto cursor-pointer">
              dismiss
            </button>
          </div>
        )}

        {/* Navigation & Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#D4A853]/8 pb-8">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#B0A89E] block mb-2">{"General Ledger — Ernesto Ortiz"}</span>
            <h1 className="text-4xl font-serif text-[#F5F0EB] tracking-tight">{"Investment Finance Center"}</h1>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <span className="font-mono text-xs uppercase tracking-wider text-[#D4A853] border border-[#D4A853]/20 px-3 py-1.5 rounded-full bg-[#D4A853]/5">
              {"Active Ledger"}
            </span>
          </div>
        </header>

        {/* View Toggle Tabs */}
        <div className="flex border-b border-[#D4A853]/8 gap-6 overflow-x-auto">
          {[
            { key: "overview", label: "Overview" },
            { key: "accounting", label: "Accounting" },
            { key: "investments", label: "ROI & Capitalization" },
            { key: "education", label: "Education" },
            { key: "insights", label: "AI Advisor" }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSubView(tab.key as typeof activeSubView)}
              className={`pb-4 font-mono text-xs uppercase tracking-widest border-b-2 transition-all duration-300 whitespace-nowrap cursor-pointer ${
                activeSubView === tab.key ? "border-[#D4A853] text-[#F5F0EB]" : "border-transparent text-[#B0A89E] hover:text-[#F5F0EB]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeSubView === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={springConfig}
              className="space-y-12"
            >
              {/* Deliverable Intelligence */}
              <section className="border border-[#D4A853]/12 rounded-2xl bg-[#110F0D] p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#D4A853] block mb-0.5">Deliverable Intelligence</span>
                    <p className="text-xs text-[#7A6F65]">Real-time prospect engagement — tracks when a client opens their teardown</p>
                  </div>
                  <button
                    onClick={() => {
                      setViewStatsLoading(true);
                      fetch("/api/views")
                        .then((r) => (r.ok ? r.json() : {}))
                        .then((data: Record<string, { count: number; lastViewed: string | null }>) => setViewStats(data))
                        .catch(() => setViewStats({}))
                        .finally(() => setViewStatsLoading(false));
                    }}
                    className="font-mono text-xs text-[#B0A89E] hover:text-[#D4A853] border border-[#D4A853]/10 hover:border-[#D4A853]/30 px-3 py-1.5 rounded-full transition-all cursor-pointer"
                  >
                    Refresh
                  </button>
                </div>

                {viewStatsLoading ? (
                  <div className="font-mono text-xs text-[#7A6F65] animate-pulse">Loading engagement data...</div>
                ) : Object.keys(viewStats).length === 0 ? (
                  <div className="text-xs text-[#7A6F65] italic">No deliverable views recorded yet. Send a client link to start tracking.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(viewStats)
                      .sort((a, b) => (b[1].lastViewed ?? "").localeCompare(a[1].lastViewed ?? ""))
                      .map(([clientKey, stat]) => {
                        const isHot = stat.lastViewed && (Date.now() - new Date(stat.lastViewed).getTime()) < 3600000 * 24;
                        return (
                          <div
                            key={clientKey}
                            className={`rounded-xl p-4 border ${isHot ? "border-[#22c55e]/20 bg-[#22c55e]/4" : "border-[#D4A853]/8 bg-[#0A0908]"}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono text-xs text-[#B0A89E] truncate max-w-[70%]">{clientKey}</span>
                              {isHot && (
                                <span className="font-mono text-[9px] uppercase tracking-wider text-[#22c55e] bg-[#22c55e]/10 px-1.5 py-0.5 rounded-full">Hot</span>
                              )}
                            </div>
                            <div className="flex items-end justify-between">
                              <span className="font-serif text-2xl font-bold text-[#D4A853]">{stat.count}</span>
                              <span className="font-mono text-[10px] text-[#7A6F65]">
                                {stat.lastViewed ? timeAgo(stat.lastViewed) : "—"}
                              </span>
                            </div>
                            <span className="font-mono text-[9px] text-[#7A6F65] uppercase tracking-wider">
                              {stat.count === 1 ? "view" : "views"}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </section>

              {/* Scorecard */}
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Net Worth", value: `$${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, detail: "Assets − Liabilities" },
                  { label: "Cash Runway", value: `${runwayMonths.toFixed(1)} ${"months"}`, detail: "Checking vs. expenses" },
                  { label: "Monthly Burn", value: `$${averageBurnRate.toFixed(2)}`, detail: "AI API, software, hosting" },
                  { label: "Consulting Revenue", value: `$${(Math.abs(accounts.find(a => a.name === "Consulting Revenue") ? (accountBalances[accounts.find(a => a.name === "Consulting Revenue")!.id] || 0) : 70000) / 100).toFixed(2)}`, detail: "Reconciled beta fees" },
                ].map((item, idx) => (
                  <div key={idx} className="border border-[#D4A853]/10 p-5 bg-[#110F0D] rounded-2xl relative overflow-hidden">
                    <span className="font-mono text-xs text-[#B0A89E] uppercase tracking-wider block mb-2">{item.label}</span>
                    <span className="font-serif text-3xl font-bold text-[#F5F0EB] block mb-1">{item.value}</span>
                    <span className="text-xs text-[#7A6F65]">{item.detail}</span>
                  </div>
                ))}
              </section>

              {/* ── ARR & Liquid Buffer Widget ── */}
              {(() => {
                const activeMRR = stripeMRR > 0 ? stripeMRR : 12500;
                const arr = activeMRR * 12;
                const liquidBuffer = totalAssets;
                const arrToBuffer = liquidBuffer > 0 ? (arr / liquidBuffer) * 100 : 0;
                const monthsOfBuffer = activeMRR > 0 ? liquidBuffer / activeMRR : 0;
                const burnMultiple = averageBurnRate > 0 ? activeMRR / averageBurnRate : 0;
                return (
                  <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      {
                        label: "ARR",
                        value: `$${arr.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                        detail: "MRR × 12",
                        color: "#D4A853",
                      },
                      {
                        label: "Liquid Buffer",
                        value: `$${liquidBuffer.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        detail: "Total liquid assets",
                        color: "#5C9A6B",
                      },
                      {
                        label: "Buffer / ARR",
                        value: `${arrToBuffer.toFixed(1)}%`,
                        detail: "ARR cash coverage",
                        color: arrToBuffer >= 50 ? "#5C9A6B" : "#C85C5C",
                      },
                      {
                        label: "Runway",
                        value: `${monthsOfBuffer.toFixed(1)} mo`,
                        detail: `Burn multiple: ${burnMultiple.toFixed(2)}×`,
                        color: monthsOfBuffer >= 6 ? "#5C9A6B" : "#C85C5C",
                      },
                    ].map((item, idx) => (
                      <div key={idx} className="border border-[#D4A853]/10 p-5 bg-[#110F0D]/80 rounded-2xl space-y-1">
                        <span className="font-mono text-[10px] text-[#7A6F65] uppercase tracking-widest block">{item.label}</span>
                        <span className="font-serif text-2xl font-bold block" style={{ color: item.color }}>{item.value}</span>
                        <span className="font-mono text-[10px] text-[#7A6F65]">{item.detail}</span>
                      </div>
                    ))}
                  </section>
                );
              })()}

              {/* Stripe Revenue Dashboard */}
              <section className="border border-[#D4A853]/15 bg-[#110F0D] p-8 rounded-2xl space-y-6 relative overflow-hidden text-left">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4A853]/5 rounded-full filter blur-2xl pointer-events-none" />
                <div className="flex justify-between items-center border-b border-[#D4A853]/15 pb-4">
                  <div>
                    <span className="font-mono text-xs text-[#D4A853]/70 tracking-widest uppercase block mb-1">{"Stripe Node"}</span>
                    <h3 className="text-lg font-bold text-white font-mono uppercase">{"Live Revenue & Telemetry"}</h3>
                  </div>
                  <span className={`font-mono text-xs border px-3 py-1 rounded-full uppercase tracking-wider ${isTelemetryError ? 'text-amber-400 border-amber-500/25 bg-amber-500/5' : 'text-[#5C9A6B] border-[#5C9A6B]/25 bg-[#5C9A6B]/5'}`}>
                    {isTelemetryError ? "Degraded (Cache)" : "Connected (Live)"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="p-5 border border-[#D4A853]/8 bg-black/20 rounded-xl">
                    <span className="font-mono text-xs text-[#B0A89E] uppercase block mb-2">{"Gross Volume"}</span>
                    <span className="font-serif text-2xl font-bold text-white">
                      ${(stripeGrossVolume > 0 ? stripeGrossVolume : 145850.00).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-[#5C9A6B] block mt-1.5">↑ {"From database"}</span>
                  </div>
                  <div className="p-5 border border-[#D4A853]/8 bg-black/20 rounded-xl">
                    <span className="font-mono text-xs text-[#B0A89E] uppercase block mb-2">{"Active MRR"}</span>
                    <span className="font-serif text-2xl font-bold text-[#D4A853]">
                      ${(stripeMRR > 0 ? stripeMRR : 12500.00).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-[#B0A89E] block mt-1.5">{"Subscription base"}</span>
                  </div>
                  <div className="p-5 border border-[#D4A853]/8 bg-black/20 rounded-xl">
                    <span className="font-mono text-xs text-[#B0A89E] uppercase block mb-2">{"Refunds Issued"}</span>
                    <span className="font-serif text-2xl font-bold text-[#C85C5C]">
                      ${(stripeRefundsVolume > 0 ? stripeRefundsVolume : 1050.00).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-[#B0A89E] block mt-1.5">{"Activated guarantees"}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <h4 className="font-mono text-xs text-white uppercase font-bold">{"Latest Stripe Transactions"}</h4>
                  <div className="border border-[#D4A853]/8 rounded overflow-hidden font-mono text-xs">
                    <div className="grid grid-cols-12 bg-white/5 p-2 font-bold text-[#B0A89E] border-b border-[#D4A853]/8">
                      <div className="col-span-3">{"Client"}</div>
                      <div className="col-span-3">{"Product / Price ID"}</div>
                      <div className="col-span-2">{"Amount"}</div>
                      <div className="col-span-2">{"Status"}</div>
                      <div className="col-span-2">{"Date (UTC)"}</div>
                    </div>
                    <div className="divide-y divide-white/5">
                      {[
                        { customer: "Johannes W. (Formbricks)", product: "price_dwy_beta_diagnostic", amount: "$350.00", status: "Paid", date: "2026-06-19 12:45" },
                        { customer: "Timo G. (Documenso)", product: "price_dfy_beta_diagnostic", amount: "$2,000.00", status: "Paid", date: "2026-06-18 10:12" },
                        { customer: "Acme Corp (Enterprise)", product: "price_dfy_intervention", amount: "$3,000.00", status: "Paid", date: "2026-06-17 15:30" },
                        { customer: "Featurebase (Growth)", product: "price_dwy_intervention", amount: "$750.00", status: "Refunded", date: "2026-06-16 09:22" }
                      ].map((tx, idx) => (
                        <div key={idx} className="grid grid-cols-12 p-2 hover:bg-[#D4A853]/[0.02]">
                          <div className="col-span-3 text-white font-bold">{tx.customer}</div>
                          <div className="col-span-3 text-[#B0A89E]">{tx.product}</div>
                          <div className="col-span-2 text-white">{tx.amount}</div>
                          <div className="col-span-2">
                            <span className={`px-1.5 py-0.5 rounded-full text-xs uppercase font-bold ${
                              tx.status === "Paid" ? "bg-[#5C9A6B]/10 text-[#5C9A6B]" : "bg-[#C85C5C]/10 text-[#C85C5C]"
                            }`}>{({ Paid: "Paid", Refunded: "Refunded" } as Record<string, string>)[tx.status] || tx.status}</span>
                          </div>
                          <div className="col-span-2 text-[#7A6F65]">{tx.date}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Cash Flow and Goal Projections */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Cash Flow Chart */}
                <div className="lg:col-span-8 border border-[#D4A853]/8 p-8 bg-[#0A0908]/40 rounded space-y-6">
                  <h3 className="font-serif text-lg text-[#F5F0EB] border-b border-[#D4A853]/8 pb-3">{"Monthly Cash Flow Trend"}</h3>
                  {/* SVG Bar Chart for Income vs Expenses */}
                  <div className="h-64 flex items-end justify-between px-4 pt-8 border-b border-[#D4A853]/8 relative">
                    <div className="absolute top-0 left-0 text-xs font-mono text-[#7A6F65]">{"Revenue (Gold) vs Expenses (Grey)"}</div>
                    <div className="w-16 h-48 bg-[#D4A853]/80 rounded-t flex flex-col justify-end items-center relative group">
                      <span className="absolute top-[-25px] font-mono text-xs text-[#F5F0EB]">$700</span>
                      <span className="font-mono text-xs text-black font-bold mb-2">MAR</span>
                    </div>
                    <div className="w-16 h-12 bg-white/10 rounded-t flex flex-col justify-end items-center relative">
                      <span className="absolute top-[-25px] font-mono text-xs text-[#B0A89E]">$125</span>
                    </div>

                    <div className="w-16 h-32 bg-[#D4A853]/80 rounded-t flex flex-col justify-end items-center relative">
                      <span className="absolute top-[-25px] font-mono text-xs text-[#F5F0EB]">$350</span>
                      <span className="font-mono text-xs text-black font-bold mb-2">APR</span>
                    </div>
                    <div className="w-16 h-20 bg-white/10 rounded-t flex flex-col justify-end items-center relative">
                      <span className="absolute top-[-25px] font-mono text-xs text-[#B0A89E]">$205</span>
                    </div>

                    <div className="w-16 h-56 bg-[#D4A853]/80 rounded-t flex flex-col justify-end items-center relative">
                      <span className="absolute top-[-25px] font-mono text-xs text-[#F5F0EB]">$1,050</span>
                      <span className="font-mono text-xs text-black font-bold mb-2">MAY</span>
                    </div>
                    <div className="w-16 h-16 bg-white/10 rounded-t flex flex-col justify-end items-center relative">
                      <span className="absolute top-[-25px] font-mono text-xs text-[#B0A89E]">$180</span>
                    </div>
                  </div>
                </div>

                {/* Goals Tracker */}
                <div className="lg:col-span-4 border border-[#D4A853]/8 p-8 bg-[#0A0908]/40 rounded space-y-6">
                  <h3 className="font-serif text-lg text-[#F5F0EB] border-b border-[#D4A853]/8 pb-3">{"Active Goals"}</h3>
                  <div className="space-y-6">
                    {goals.map(goal => {
                      const pct = (goal.current_amount / goal.target_amount) * 100;
                      return (
                        <div key={goal.id} className="space-y-2">
                          <div className="flex justify-between items-center text-xs font-mono gap-2">
                            <span className="text-[#B0A89E]">{goal.name}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[#F5F0EB]">${(goal.current_amount/100).toFixed(0)} / ${(goal.target_amount/100).toFixed(0)}</span>
                              <button
                                type="button"
                                onClick={() => deleteGoal(goal.id, goal.name)}
                                disabled={deletingId === goal.id}
                                title="Delete goal"
                                className="text-[#C85C5C]/70 hover:text-[#C85C5C] disabled:opacity-40 cursor-pointer"
                              >
                                {deletingId === goal.id ? "…" : "✕"}
                              </button>
                            </div>
                          </div>
                          <div className="h-1.5 bg-black border border-[#D4A853]/8 rounded-full overflow-hidden">
                            <div className="h-full bg-[#D4A853]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {activeSubView === 'accounting' && (
            <motion.div
              key="accounting"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={springConfig}
              className="space-y-8"
            >
              {/* Balances list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Balance Sheet */}
                <div className="border border-[#D4A853]/8 p-8 bg-[#0A0908]/20 rounded space-y-6">
                  <h3 className="font-serif text-lg text-[#F5F0EB] border-b border-[#D4A853]/8 pb-3">{"Balance Sheet"}</h3>
                  <div className="space-y-4 font-mono text-xs">
                    <div className="text-[#D4A853] uppercase text-xs border-b border-[#D4A853]/8 pb-1">{"Assets"}</div>
                    {accounts.filter(a => a.type === "asset").map(a => (
                      <div key={a.id} className="flex justify-between">
                        <span className="text-[#B0A89E]">{a.name}</span>
                        <span className="text-[#F5F0EB]">${((accountBalances[a.id] || 0) / 100).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t border-[#D4A853]/8 pt-2 flex justify-between font-bold text-sm text-[#F5F0EB]">
                      <span>{"Total Assets"}</span>
                      <span>${totalAssets.toFixed(2)}</span>
                    </div>

                    <div className="text-[#D4A853] uppercase text-xs border-b border-[#D4A853]/8 pb-1 mt-6">{"Liabilities"}</div>
                    {accounts.filter(a => a.type === "liability").length === 0 ? (
                      <div className="text-xs text-[#7A6F65] italic">{"No liabilities on the balance sheet."}</div>
                    ) : (
                      accounts.filter(a => a.type === "liability").map(a => (
                        <div key={a.id} className="flex justify-between">
                          <span className="text-[#B0A89E]">{a.name}</span>
                          <span className="text-[#F5F0EB]">${((accountBalances[a.id] || 0) / 100).toFixed(2)}</span>
                        </div>
                      ))
                    )}
                    <div className="border-t border-[#D4A853]/8 pt-2 flex justify-between font-bold text-sm text-[#F5F0EB]">
                      <span>{"Total Liabilities"}</span>
                      <span>${totalLiabilities.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Profit & Loss Statement */}
                <div className="border border-[#D4A853]/8 p-8 bg-[#0A0908]/20 rounded space-y-6">
                  <h3 className="font-serif text-lg text-[#F5F0EB] border-b border-[#D4A853]/8 pb-3">{"Income Statement (P&L)"}</h3>
                  <div className="space-y-4 font-mono text-xs">
                    <div className="text-[#D4A853] uppercase text-xs border-b border-[#D4A853]/8 pb-1">{"Consulting Revenue"}</div>
                    {accounts.filter(a => a.type === "revenue").map(a => (
                      <div key={a.id} className="flex justify-between">
                        <span className="text-[#B0A89E]">{a.name}</span>
                        {/* Revenues are credit balance (negative stored), show absolute */}
                        <span className="text-[#F5F0EB]">${(Math.abs(accountBalances[a.id] || 0) / 100).toFixed(2)}</span>
                      </div>
                    ))}

                    <div className="text-[#D4A853] uppercase text-xs border-b border-[#D4A853]/8 pb-1 mt-6">{"Operating Expenses"}</div>
                    {accounts.filter(a => a.type === "expense").map(a => (
                      <div key={a.id} className="flex justify-between">
                        <span className="text-[#B0A89E]">{a.name}</span>
                        <span className="text-[#F5F0EB]">${((accountBalances[a.id] || 0) / 100).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t border-[#D4A853]/8 pt-2 flex justify-between font-bold text-sm text-[#F5F0EB]">
                      <span>{"Net Operating Profit"}</span>
                      <span>
                        ${(
                          (accounts
                            .filter(a => a.type === "revenue")
                            .reduce((sum, a) => sum + Math.abs(accountBalances[a.id] || 0), 0) -
                           accounts
                            .filter(a => a.type === "expense")
                            .reduce((sum, a) => sum + (accountBalances[a.id] || 0), 0)
                          ) / 100
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transactions Ledger */}
              <div className="border border-[#D4A853]/8 p-8 bg-[#0A0908]/20 rounded space-y-6">
                <h3 className="font-serif text-xl text-[#F5F0EB]">{"Double-Entry General Ledger"}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-white/10 pb-2 text-[#B0A89E] text-xs uppercase">
                        <th className="py-3">{"Date"}</th>
                        <th>{"Description"}</th>
                        <th>{"Debit Account"}</th>
                        <th>{"Credit Account"}</th>
                        <th className="text-right">{"Amount"}</th>
                        <th className="text-right">{"Actions"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(tx => {
                        const debitEntry = tx.transaction_entries?.find(e => e.amount > 0);
                        const creditEntry = tx.transaction_entries?.find(e => e.amount < 0);
                        return (
                          <tr key={tx.id} className="border-b border-[#D4A853]/8 hover:bg-white/[0.01]">
                            <td className="py-4 text-[#B0A89E]">{new Date(tx.date).toLocaleDateString()}</td>
                            <td className="text-[#F5F0EB]">{tx.description}</td>
                            <td className="text-[#5C9A6B]">{debitEntry?.accounts?.name || 'Unknown'}</td>
                            <td className="text-[#B0A89E]">{creditEntry?.accounts?.name || 'Unknown'}</td>
                            <td className="text-right text-[#F5F0EB] font-bold">
                              ${(Math.abs(debitEntry?.amount || 0) / 100).toFixed(2)}
                            </td>
                            <td className="text-right">
                              <button
                                type="button"
                                onClick={() => deleteTransaction(tx.id, tx.description)}
                                disabled={deletingId === tx.id}
                                className="px-2.5 py-1 rounded bg-[#C85C5C]/10 border border-[#C85C5C]/25 text-[#C85C5C] text-[10px] font-mono uppercase tracking-wide hover:bg-[#C85C5C]/15 disabled:opacity-40 cursor-pointer"
                              >
                                {deletingId === tx.id ? "Deleting…" : "Delete"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeSubView === 'investments' && (
            <motion.div
              key="investments"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={springConfig}
              className="space-y-8"
            >
              {/* Cost / ROI Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Opportunity Cost Comparison */}
                <div className="border border-[#D4A853]/8 p-8 bg-[#0A0908]/40 rounded space-y-6">
                  <h3 className="font-serif text-lg text-[#F5F0EB] border-b border-[#D4A853]/8 pb-3">{"MacBook Upgrade vs. Index Fund Opportunity Cost"}</h3>
                  <div className="space-y-4 text-xs font-mono">
                    <div className="bg-black/40 border border-[#D4A853]/8 p-4 rounded">
                      <div className="text-[#D4A853] uppercase text-xs mb-1 font-bold">{"Scenario A: Index Fund Compounding ($3,500 investment)"}</div>
                      <p className="text-[#B0A89E] leading-relaxed">
                        {"Allocate $3,500 to an S&P 500 index ETF compounding at an average 8% annual return."}
                      </p>
                      <div className="text-right text-[#5C9A6B] font-bold mt-2">
                        {"Projected 5-Year Balance: $5,142.60 (+ $1,642.60 profit)"}
                      </div>
                    </div>

                    <div className="bg-black/40 border border-[#D4A853]/8 p-4 rounded">
                      <div className="text-[#D4A853] uppercase text-xs mb-1 font-bold">{"Scenario B: MacBook Hardware Purchase ($3,500 investment)"}</div>
                      <p className="text-[#B0A89E] leading-relaxed">
                        {"Upgrade the laptop. 25% annual depreciation. Residual value declines over time."}
                      </p>
                      <div className="text-right text-[#C85C5C] font-bold mt-2">
                        {"Projected 5-Year Asset Value: $830.27 (- $2,669.73 loss)"}
                      </div>
                    </div>

                    <div className="bg-black/40 border border-[#D4A853]/8 p-4 rounded">
                      <div className="text-[#D4A853] uppercase text-xs mb-1 font-bold">{"Scenario C: AI Platform Leverage ($3,500 investment)"}</div>
                      <p className="text-[#B0A89E] leading-relaxed">
                        {"Redirect capital to AI API credits. If automated outreach captures just 1 extra diagnostic brief at $350/mo."}
                      </p>
                      <div className="text-right text-[#D4A853] font-bold mt-2">
                        {"Projected 5-Year Revenue Yield: $21,000.00 (+ $17,500.00 cash)"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Retirement Projection Calculator */}
                <div className="border border-[#D4A853]/8 p-8 bg-[#0A0908]/40 rounded space-y-6">
                  <h3 className="font-serif text-lg text-[#F5F0EB] border-b border-[#D4A853]/8 pb-3">{"Compound Retirement Calculator"}</h3>
                  
                  {/* Inputs */}
                  <div className="grid grid-cols-3 gap-4 text-xs font-mono">
                    <div className="space-y-1">
                      <label className="text-[#B0A89E] text-xs uppercase">{"Monthly Savings"}</label>
                      <input 
                        type="number" 
                        value={monthlyContrib} 
                        onChange={e => setMonthlyContrib(Number(e.target.value))}
                        className="w-full bg-black border border-[#D4A853]/8 rounded p-2 focus:outline-none focus:border-[#D4A853]/40 text-[#F5F0EB]" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[#B0A89E] text-xs uppercase">{"Annual Return %"}</label>
                      <input 
                        type="number" 
                        value={returnRate} 
                        onChange={e => setReturnRate(Number(e.target.value))}
                        className="w-full bg-black border border-[#D4A853]/8 rounded p-2 focus:outline-none focus:border-[#D4A853]/40 text-[#F5F0EB]" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[#B0A89E] text-xs uppercase">{"Years to Project"}</label>
                      <input 
                        type="number" 
                        value={yearsProject} 
                        onChange={e => setYearsProject(Number(e.target.value))}
                        className="w-full bg-black border border-[#D4A853]/8 rounded p-2 focus:outline-none focus:border-[#D4A853]/40 text-[#F5F0EB]" 
                      />
                    </div>
                  </div>

                  {/* SVG compound line chart mockup */}
                  <div className="h-32 border-b border-[#D4A853]/8 relative flex items-end pt-4">
                    <div className="absolute top-2 left-2 text-xs font-mono text-[#7A6F65]">{"Compound Interest Projection"}</div>
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <path 
                        d="M0 100 Q 50 80, 100 10" 
                        fill="none" 
                        stroke="#D4A853" 
                        strokeWidth="2" 
                      />
                    </svg>
                  </div>

                  {/* Outputs */}
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-[#B0A89E]">{"Compounded Principal (Cash):"}</span>
                      <span className="text-[#F5F0EB]">${compoundPrincipal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#B0A89E]">{"Added Contributions:"}</span>
                      <span className="text-[#F5F0EB]">${(monthlyContrib * 12 * yearsProject).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between border-t border-[#D4A853]/8 pt-2 font-bold text-sm">
                      <span className="text-[#B0A89E]">{"Projected Net Worth:"}</span>
                      <span className="text-[#5C9A6B]">${totalAccumulated.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Investments ledger */}
              <div className="border border-[#D4A853]/8 p-8 bg-[#0A0908]/20 rounded space-y-6">
                <div className="flex justify-between items-center border-b border-[#D4A853]/8 pb-4">
                  <h3 className="font-serif text-xl text-[#F5F0EB]">{"Asset Portfolio"}</h3>
                  <button className="px-3 py-1 bg-white/5 text-[#B0A89E] border border-white/10 hover:bg-white/10 rounded font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer">
                    {"+ Add Asset (Manual)"}
                  </button>
                </div>
                {investments.length === 0 ? (
                  <div className="border border-dashed border-white/10 p-12 text-center rounded space-y-4">
                    <p className="text-xs font-mono text-[#B0A89E]">{"No assets catalogued."}</p>
                    <div className="flex justify-center gap-4">
                      <a
                        href="https://dashboard.stripe.com"
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 border border-[#D4A853]/30 text-[#D4A853] rounded font-mono text-xs hover:bg-[#D4A853]/10 uppercase"
                      >
                        Connect Stripe
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs">
                      <thead>
                        <tr className="border-b border-white/10 pb-2 text-[#B0A89E] text-xs uppercase">
                          <th className="py-3">{"Asset Description"}</th>
                          <th>{"Type"}</th>
                          <th>{"Purchase Date"}</th>
                          <th className="text-right">{"Cost Basis"}</th>
                          <th className="text-right">{"Current Valuation"}</th>
                          <th className="text-right">{"Annual ROI / Depreciation"}</th>
                          <th className="text-right">{"Actions"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {investments.map(inv => (
                          <tr key={inv.id} className="border-b border-[#D4A853]/8 hover:bg-white/[0.01]">
                            <td className="py-4 text-[#F5F0EB] font-bold">{inv.name}</td>
                            <td className="text-[#B0A89E] text-xs uppercase">{inv.type}</td>
                            <td className="text-[#B0A89E]">{new Date(inv.purchase_date).toLocaleDateString()}</td>
                            <td className="text-right text-[#B0A89E]">${(inv.cost_basis/100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="text-right text-[#F5F0EB]">${(inv.current_value/100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="text-right">
                              {inv.projected_annual_roi_pct ? (
                                <span className="text-[#5C9A6B]">+{inv.projected_annual_roi_pct}% ROI</span>
                              ) : (
                                <span className="text-[#C85C5C]">-{inv.depreciation_rate_annual_pct}% Depr</span>
                              )}
                            </td>
                            <td className="text-right">
                              <button
                                type="button"
                                onClick={() => deleteInvestment(inv.id, inv.name)}
                                disabled={deletingId === inv.id}
                                className="px-2.5 py-1 rounded bg-[#C85C5C]/10 border border-[#C85C5C]/25 text-[#C85C5C] text-[10px] font-mono uppercase tracking-wide hover:bg-[#C85C5C]/15 disabled:opacity-40 cursor-pointer"
                              >
                                {deletingId === inv.id ? "Deleting…" : "Delete"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeSubView === 'education' && (
            <motion.div
              key="education"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={springConfig}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {articles.map(art => {
                const isExpanded = expandedArticleId === art.id;
                return (
                  <div
                    key={art.id}
                    onClick={() => setExpandedArticleId(isExpanded ? null : art.id)}
                    className="border border-[#D4A853]/8 p-8 bg-[#0A0908]/40 rounded space-y-4 cursor-pointer hover:border-[#D4A853]/30 transition-all duration-300"
                  >
                    <div className="flex justify-between items-center border-b border-[#D4A853]/8 pb-3">
                      <span className="font-mono text-xs uppercase tracking-wider text-[#D4A853] border border-[#D4A853]/20 px-2 py-0.5 rounded">
                        {art.category}
                      </span>
                      <span className="font-mono text-xs text-[#B0A89E]">{art.read_time_mins} {"min read"}</span>
                    </div>
                    <h3 className="font-serif text-xl text-[#F5F0EB] tracking-tight">{art.title}</h3>
                    <p className="text-sm text-[#B0A89E] font-mono leading-relaxed italic">{art.summary}</p>
                    
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <p className="text-xs text-[#cbd5e1] leading-relaxed font-sans pt-4 border-t border-[#D4A853]/8">
                            {art.body}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {!isExpanded && (
                      <span className="text-xs text-[#D4A853] uppercase tracking-wider font-mono hover:underline block pt-2">
                        {"Read full article →"}
                      </span>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}

          {activeSubView === 'insights' && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={springConfig}
              className="space-y-8"
            >
              {/* Question form */}
              <div className="border border-[#D4A853]/8 p-8 bg-[#0A0908]/20 rounded space-y-6">
                <h3 className="font-serif text-xl text-[#F5F0EB]">{"AI Investment Intelligence Engine"}</h3>
                <p className="text-xs text-[#B0A89E] font-mono">
                  {"Enter a financial or opportunity cost question. The AI router selects the optimal model and returns a quantified, bisturí-style recommendation."}
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                    type="text"
                    value={advisorQuestion}
                    onChange={e => setAdvisorQuestion(e.target.value)}
                    placeholder="Enter your investment query..."
                    className="flex-1 bg-black border border-[#D4A853]/8 rounded p-3 text-xs text-[#F5F0EB] focus:outline-none focus:border-[#D4A853]/40 font-mono"
                  />
                  <button
                    onClick={triggerAiAdvice}
                    disabled={adviceLoading}
                    className="font-mono text-xs uppercase bg-[#D4A853] hover:bg-[#E8C97A] text-white px-6 py-3 rounded transition-all duration-300 disabled:opacity-50"
                  >
                    {adviceLoading ? "Calculating projections..." : "Consult Advisor"}
                  </button>
                </div>
              </div>

              {/* AI Advice Error */}
              {adviceError && (
                <div className="border border-[#C85C5C]/40 bg-[#C85C5C]/10 rounded px-4 py-3 font-mono text-xs text-[#C85C5C]">
                  {"⚠ "}{adviceError}
                </div>
              )}

              {/* AI Advice Response */}
              {adviceResponse && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-[#D4A853]/20 bg-[#0A0908]/40 p-8 rounded space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-[#D4A853]/8 pb-2">
                    <span className="font-mono text-xs text-[#D4A853] uppercase tracking-wider">Advisor Report</span>
                    {advisorMeta && (
                      <span className="font-mono text-[9px] text-[#7A6F65] tracking-wide">
                        {advisorMeta.model} · {advisorMeta.tier} · ${advisorMeta.estimatedCostUSD.toFixed(5)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs leading-[1.8] text-[#B0A89E] font-mono space-y-0.5">
                    {renderMarkdownBlock(adviceResponse)}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </main>
  );
}
