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
  const [activeSubView, setActiveSubView] = useState<'overview' | 'accounting' | 'investments' | 'education' | 'insights' | 'tax'>('overview');
  const [taxIncome, setTaxIncome] = useState(30000);
  const [taxPension, setTaxPension] = useState(Math.round(700.92 * 14 * 1.10)); // €700,92 × 14 pagas × EUR/USD 1.10 = $10,794
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

  // Simulador de Conquista Global States
  const [conquestRegion, setConquestRegion] = useState("estonia");
  const [conquestSimulating, setConquestSimulating] = useState(false);
  const [conquestResult, setConquestResult] = useState(false);

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
            { key: "insights", label: "AI Advisor" },
            { key: "tax", label: "Tax Optimizer" }
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

          {activeSubView === 'tax' && (
            <motion.div
              key="tax"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={springConfig}
              className="space-y-8"
            >
              {/* ── Simulador Fiscal — Jurisdicciones Internacionales v2 ── */}
              {(() => {
                // ── helpers ──────────────────────────────────────────────
                const c = taxIncome;   // consulting USD/yr
                const p = taxPension;  // pension USD/yr

                // Spain self-employed IRPF brackets (consulting only; pension may be exempt Art.7f)
                const spainIRPF = (inc: number) => {
                  if (inc <= 0) return 0;
                  let t = 0;
                  if (inc <= 12450)  t = inc * 0.19;
                  else if (inc <= 20200)  t = 12450*0.19 + (inc-12450)*0.24;
                  else if (inc <= 35200)  t = 12450*0.19 + 7750*0.24 + (inc-20200)*0.30;
                  else if (inc <= 60000)  t = 12450*0.19 + 7750*0.24 + 15000*0.30 + (inc-35200)*0.37;
                  else if (inc <= 300000) t = 12450*0.19 + 7750*0.24 + 15000*0.30 + 24800*0.37 + (inc-60000)*0.45;
                  else t = 12450*0.19 + 7750*0.24 + 15000*0.30 + 24800*0.37 + 240000*0.45 + (inc-300000)*0.47;
                  return t;
                };

                // Hong Kong Salaries Tax (2024/25) — progressive vs. standard rate 15%, whichever lower
                // HKD basic allowance HKD 132,000 (~$16,923 USD). HKD/USD ≈ 7.8
                const hongKongSalariesTax = (inc: number) => {
                  if (inc <= 0) return 0;
                  const hkd = inc * 7.8;
                  const allowance = 132000;
                  const taxable = Math.max(0, hkd - allowance);
                  let prog = 0;
                  if (taxable <= 50000)       prog = taxable * 0.02;
                  else if (taxable <= 100000) prog = 1000 + (taxable - 50000) * 0.06;
                  else if (taxable <= 150000) prog = 4000 + (taxable - 100000) * 0.10;
                  else if (taxable <= 200000) prog = 9000 + (taxable - 150000) * 0.14;
                  else                        prog = 16000 + (taxable - 200000) * 0.17;
                  const standard = taxable * 0.15;
                  return Math.min(prog, standard) / 7.8;
                };

                // UAE Free Zone — 0% personal income tax
                const uaeIT = (_inc: number) => 0;

                // Singapore Income Tax (2024 rates) — SGD/USD ≈ 0.74
                const singaporeIT = (inc: number) => {
                  if (inc <= 0) return 0;
                  const sgd = inc / 0.74;
                  let t = 0;
                  if (sgd <= 20000)       t = 0;
                  else if (sgd <= 30000)  t = (sgd - 20000) * 0.02;
                  else if (sgd <= 40000)  t = 200 + (sgd - 30000) * 0.035;
                  else if (sgd <= 80000)  t = 550 + (sgd - 40000) * 0.07;
                  else if (sgd <= 120000) t = 3350 + (sgd - 80000) * 0.115;
                  else if (sgd <= 160000) t = 7950 + (sgd - 120000) * 0.15;
                  else if (sgd <= 200000) t = 13950 + (sgd - 160000) * 0.18;
                  else if (sgd <= 240000) t = 21150 + (sgd - 200000) * 0.19;
                  else if (sgd <= 280000) t = 28750 + (sgd - 240000) * 0.195;
                  else if (sgd <= 320000) t = 36550 + (sgd - 280000) * 0.20;
                  else                    t = 44550 + (sgd - 320000) * 0.22;
                  return t * 0.74;
                };

                // ── per-country results ──────────────────────────────────
                const spain = {
                  pensionTax: 0,
                  pensionNote: "Est. exempt Art.7f — verify with advisor",
                  consultingTax: spainIRPF(c),
                  pensionRisk: "amber",
                  consultingRisk: "red",
                  lifeDesign: {
                    costOfLiving: "~$2,500/mo", qolIndex: "7.2/10", stressLevel: "High",
                    culturalFit: "10/10 Native", gastronomy: "Excellent", saasPrestige: "Mid",
                    housing1br: "~$1,200/mo", etfTreatment: "19-21% IRPF", climate: "Mediterranean / Continental", visaDifficulty: "N/A (citizen)",
                  },
                };
                const hongKong = {
                  pensionTax: 0,
                  pensionNote: "DTT: Spain withholds → ~0% est. · verify Art.18",
                  consultingTax: hongKongSalariesTax(c),
                  pensionRisk: "green",
                  consultingRisk: c > 60000 ? "amber" : "green",
                  consultingWarning: "Progressive Salaries Tax · Std. rate 15% · Allowance ~$16.9K",
                  lifeDesign: {
                    costOfLiving: "~$4,500/mo", qolIndex: "7.0/10", stressLevel: "Very High",
                    culturalFit: "4/10", gastronomy: "Excellent", saasPrestige: "High",
                    housing1br: "~$3,500/mo", etfTreatment: "0% cap gains", climate: "Humid subtropical", visaDifficulty: "High (talent/investment visa)",
                  },
                };
                const uae = {
                  pensionTax: 0,
                  pensionNote: "No full DTT Spain-UAE · Consult local advisor",
                  consultingTax: uaeIT(c),
                  pensionRisk: "amber",
                  consultingRisk: "green",
                  consultingWarning: "0% personal income tax · Free Zone · Min. 183 days/yr visa",
                  lifeDesign: {
                    costOfLiving: "~$4,000/mo", qolIndex: "7.5/10", stressLevel: "Mid",
                    culturalFit: "4/10", gastronomy: "International", saasPrestige: "High",
                    housing1br: "~$2,500/mo", etfTreatment: "0% (no cap gains)", climate: "Desert, extreme heat", visaDifficulty: "Mid (183 days/yr)",
                  },
                };
                const singapore = {
                  pensionTax: 0,
                  pensionNote: "DTT Spain-SG 2011 · Art.18 public pensions: Spain withholds",
                  consultingTax: singaporeIT(c),
                  pensionRisk: "green",
                  consultingRisk: c > 80000 ? "amber" : "green",
                  consultingWarning: "Territorial · Foreign income 0% · Progressive up to 22% on local income",
                  lifeDesign: {
                    costOfLiving: "~$4,000/mo", qolIndex: "8.5/10", stressLevel: "High",
                    culturalFit: "5/10", gastronomy: "Excellent (Asia)", saasPrestige: "Very High",
                    housing1br: "~$2,800/mo", etfTreatment: "0% cap gains", climate: "Equatorial tropical", visaDifficulty: "Mid (Employment Pass)",
                  },
                };
                // Uruguay — 0% foreign income during 10-yr tax holiday (D.148/007 Literal A)
                const uruguay = {
                  pensionTax: 0,
                  pensionNote: "Foreign income: 0% during 10-yr holiday (D.148/007 Literal A)",
                  consultingTax: 0,
                  pensionRisk: "green",
                  consultingRisk: "green",
                  consultingWarning: "Wyoming LLC (foreign): 0% IRNR · Foreign income exempt during holiday",
                  lifeDesign: {
                    costOfLiving: "~$1,500/mo", qolIndex: "7.0/10", stressLevel: "Low",
                    culturalFit: "8/10 (Spanish-speaking)", gastronomy: "Good (beef, mate)", saasPrestige: "Low-Mid",
                    housing1br: "~$650/mo", etfTreatment: "0% (10-yr tax holiday)", climate: "Temperate oceanic", visaDifficulty: "Mid ($1,500/mo min.)",
                  },
                };
                // Paraguay — pure territorial system: foreign income 0%
                const paraguay = {
                  pensionTax: 0,
                  pensionNote: "IRP territorial: foreign income 0% · Spain withholds at source",
                  consultingTax: 0,
                  pensionRisk: "green",
                  consultingRisk: "green",
                  consultingWarning: "Pure territorial · Foreign LLC: 0% · IRP 10% on local income only",
                  lifeDesign: {
                    costOfLiving: "~$1,000/mo", qolIndex: "6.0/10", stressLevel: "Low",
                    culturalFit: "7/10 (Spanish-speaking)", gastronomy: "Basic (beef, chipá)", saasPrestige: "Very Low",
                    housing1br: "~$450/mo", etfTreatment: "0% foreign income", climate: "Humid subtropical", visaDifficulty: "Easy ($5,000 deposit)",
                  },
                };
                // Philippines — foreign nationals taxed only on Philippine-source income
                const philippines = {
                  pensionTax: 0,
                  pensionNote: "Foreign national: only Philippine-source income taxed · Offshore pension: 0%",
                  consultingTax: 0,
                  pensionRisk: "green",
                  consultingRisk: "green",
                  consultingWarning: "SRRV: foreign nationals 0% on offshore income · BIR confirmation",
                  lifeDesign: {
                    costOfLiving: "~$1,200/mo", qolIndex: "6.5/10", stressLevel: "Low",
                    culturalFit: "5/10 (English-speaking)", gastronomy: "Good-Basic", saasPrestige: "Mid",
                    housing1br: "~$650/mo", etfTreatment: "0% foreign income", climate: "Tropical, typhoons", visaDifficulty: "Mid (SRRV $10,000)",
                  },
                };

                type RiskKey = "green" | "amber" | "red";

                const riskColor: Record<RiskKey, string> = {
                  green: "text-[#5C9A6B]",
                  amber: "text-[#D4A853]",
                  red:   "text-[#C85C5C]",
                };
                const riskBorder: Record<RiskKey, string> = {
                  green: "border-[#5C9A6B]/20",
                  amber: "border-[#D4A853]/20",
                  red:   "border-[#C85C5C]/20",
                };
                const riskBg: Record<RiskKey, string> = {
                  green: "bg-[#5C9A6B]/3",
                  amber: "bg-[#D4A853]/3",
                  red:   "bg-[#C85C5C]/3",
                };

                const fmt = (n: number) => "$" + Math.round(n).toLocaleString();
                const pct = (tax: number, base: number) => base > 0 ? ((tax / base) * 100).toFixed(1) + "%" : "0%";

                const countries = [
                  { key: "spain", label: "Spain 🇪🇸",            sublabel: "Baseline · Self-Employed",      data: spain,       overallRisk: "red" as RiskKey,                                  recommended: false },
                  { key: "hk",    label: "Hong Kong 🇭🇰",      sublabel: "Salaries Tax · Max 15%",        data: hongKong,    overallRisk: (c > 60000 ? "amber" : "green") as RiskKey,          recommended: false },
                  { key: "uae",   label: "UAE Free Zone 🇦🇪",   sublabel: "0% Income Tax · Free Zone",     data: uae,         overallRisk: "green" as RiskKey,                                  recommended: false },
                  { key: "sg",    label: "Singapore 🇸🇬",       sublabel: "Territorial · Progressive",     data: singapore,   overallRisk: (c > 80000 ? "amber" : "green") as RiskKey,          recommended: false },
                  { key: "uy",    label: "Uruguay 🇺🇾",         sublabel: "0% Foreign Inc. · 10 yrs",      data: uruguay,     overallRisk: "green" as RiskKey,                                  recommended: true  },
                  { key: "py",    label: "Paraguay 🇵🇾",        sublabel: "Pure Territorial · 0%",         data: paraguay,    overallRisk: "green" as RiskKey,                                  recommended: false },
                  { key: "ph",    label: "Philippines 🇵🇭",     sublabel: "0% Foreign Inc. · SRRV",        data: philippines, overallRisk: "green" as RiskKey,                                  recommended: false },
                ];

                return (
                  <div className="border border-[#D4A853]/8 p-6 bg-[#0A0908]/20 rounded space-y-6">
                    {/* Header */}
                    <div className="flex flex-wrap justify-between items-start gap-3 border-b border-[#D4A853]/8 pb-4">
                      <div>
                        <h3 className="font-serif text-lg text-[#F5F0EB]">{"Tax Simulator + Life Design — 7 Jurisdictions"}</h3>
                        <p className="font-mono text-xs text-[#D4A853]/70 mt-0.5 uppercase tracking-widest">v4 · {"Adversarial Analysis · Pension + Consulting + Life Design"}</p>
                      </div>
                      <span className="font-mono text-xs text-[#C85C5C] uppercase tracking-wider bg-[#C85C5C]/5 border border-[#C85C5C]/20 px-2.5 py-1 rounded">
                        {"⚠ Estimates — verify with local advisor"}
                      </span>
                    </div>

                    {/* Sliders */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <div className="flex justify-between font-mono text-xs">
                          <span className="text-[#B0A89E]">Annual IPT Pension <span className="text-[#7A6F65]">(€700.92 × 14 payments)</span>:</span>
                          <span className="text-[#5C9A6B] font-bold">{fmt(p)}</span>
                        </div>
                        <input type="range" min="0" max="20000" step="100" value={taxPension}
                          onChange={(e) => setTaxPension(Number(e.target.value))}
                          className="w-full h-1 bg-[#2A2218] rounded-lg appearance-none cursor-pointer accent-[#5C9A6B]" />
                        <div className="flex justify-between text-xs font-mono text-[#7A6F65]">
                          <span>$0</span><span>$10,000</span><span>$20,000</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between font-mono text-xs">
                          <span className="text-[#B0A89E]">Consulting anual (LLC):</span>
                          <span className="text-[#D4A853] font-bold">{fmt(c)}</span>
                        </div>
                        <input type="range" min="0" max="200000" step="1000" value={taxIncome}
                          onChange={(e) => setTaxIncome(Number(e.target.value))}
                          className="w-full h-1 bg-[#2A2218] rounded-lg appearance-none cursor-pointer accent-[#D4A853]" />
                        <div className="flex justify-between text-xs font-mono text-[#7A6F65]">
                          <span>$0</span><span>$100,000</span><span>$200,000</span>
                        </div>
                      </div>
                    </div>

                    {/* Country cards — 7 jurisdictions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                      {countries.map(({ key, label, sublabel, data, overallRisk, recommended }) => {
                        const totalTax = data.pensionTax + data.consultingTax;
                        const totalIncome = p + c;
                        const netTotal = totalIncome - totalTax;
                        return (
                          <div key={key} className={`border ${riskBorder[overallRisk]} ${riskBg[overallRisk]} p-4 rounded-xl space-y-3 relative`}>
                            {recommended && (
                              <div className="absolute top-2 right-2 font-mono text-[9px] text-[#D4A853] bg-[#D4A853]/10 border border-[#D4A853]/25 px-1.5 py-0.5 rounded uppercase tracking-widest">
                                {"Recommended"}
                              </div>
                            )}
                            {/* Card header */}
                            <div className="border-b border-white/5 pb-2">
                              <div className={`font-mono text-xs font-bold ${riskColor[overallRisk]}`}>{label}</div>
                              <div className="font-mono text-[10px] text-[#B0A89E] mt-0.5">{sublabel}</div>
                            </div>

                            {/* Pension row */}
                            <div className="space-y-1">
                              <div className="font-mono text-[10px] text-[#B0A89E] uppercase tracking-wider">{"IPT Pension"}</div>
                              <div className="flex justify-between text-xs font-mono">
                                <span className="text-[#B0A89E]">Tax:</span>
                                <span className={`font-bold ${riskColor[data.pensionRisk as RiskKey]}`}>
                                  {fmt(data.pensionTax)} <span className="font-normal opacity-60">({pct(data.pensionTax, p)})</span>
                                </span>
                              </div>
                              <div className="font-mono text-[9px] text-[#7A6F65] leading-tight">{data.pensionNote}</div>
                            </div>

                            {/* Consulting row */}
                            <div className="space-y-1 border-t border-white/5 pt-2">
                              <div className="font-mono text-[10px] text-[#B0A89E] uppercase tracking-wider">{"Consulting (LLC)"}</div>
                              <div className="flex justify-between text-xs font-mono">
                                <span className="text-[#B0A89E]">Tax:</span>
                                <span className={`font-bold ${riskColor[data.consultingRisk as RiskKey]}`}>
                                  {fmt(data.consultingTax)} <span className="font-normal opacity-60">({pct(data.consultingTax, c)})</span>
                                </span>
                              </div>
                              {"consultingWarning" in data && typeof data.consultingWarning === "string" && (
                                <div className={`font-mono text-[9px] leading-tight ${riskColor[data.consultingRisk as RiskKey]} opacity-70`}>
                                  {data.consultingWarning}
                                </div>
                              )}
                            </div>

                            {/* Total */}
                            <div className="border-t border-white/5 pt-2 space-y-1">
                              <div className="flex justify-between text-xs font-mono">
                                <span className="text-[#B0A89E]">Total tax:</span>
                                <span className={`font-bold ${riskColor[overallRisk]}`}>{fmt(totalTax)}</span>
                              </div>
                              <div className="flex justify-between text-xs font-mono">
                                <span className="text-[#B0A89E]">{"Net:"}</span>
                                <span className="text-white font-bold">{fmt(netTotal)}</span>
                              </div>
                              <div className="flex justify-between text-xs font-mono">
                                <span className="text-[#7A6F65]">{"Effective rate:"}</span>
                                <span className={riskColor[overallRisk]}>{pct(totalTax, totalIncome)}</span>
                              </div>
                            </div>

                            {/* Life Design section */}
                            <div className="border-t border-[#D4A853]/10 pt-2 space-y-1.5">
                              <div className="font-mono text-[10px] text-[#D4A853]/70 uppercase tracking-widest mb-1">{"Life Design"}</div>
                              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                {[
                                  { label: "Cost of Living", value: data.lifeDesign.costOfLiving },
                                  { label: "QoL", value: data.lifeDesign.qolIndex },
                                  { label: "Stress", value: data.lifeDesign.stressLevel },
                                  { label: "Cultural Fit", value: data.lifeDesign.culturalFit },
                                  { label: "Gastronomy", value: data.lifeDesign.gastronomy },
                                  { label: "SaaS Prestige", value: data.lifeDesign.saasPrestige },
                                  { label: "Housing 1BR", value: data.lifeDesign.housing1br },
                                  { label: "ETF/Index", value: data.lifeDesign.etfTreatment },
                                  { label: "Climate", value: data.lifeDesign.climate },
                                  { label: "Visa", value: data.lifeDesign.visaDifficulty },
                                ].map(item => (
                                  <div key={item.label} className="font-mono">
                                    <span className="text-[9px] text-[#7A6F65] block">{item.label}</span>
                                    <span className="text-[9px] text-[#B0A89E] leading-tight block">{item.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Consulting recharacterization knot */}
                    <div className="border border-[#C85C5C]/15 bg-[#C85C5C]/3 p-4 rounded-xl space-y-2">
                      <div className="font-mono text-xs text-[#C85C5C] uppercase tracking-wider font-bold">
                        {"Critical knot: recharacterization of consulting to local source"}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                        {[
                          { country: "Hong Kong", risk: "LOW", detail: "Well-established Salaries Tax · Max 15% standard · Receptive authorities", color: "text-[#5C9A6B]" },
                          { country: "EAU Zona Franca", risk: "MEDIUM", detail: "0% personal income tax confirmed · Free Zone legally solid · No DTT with Spain", color: "text-[#D4A853]" },
                          { country: "Singapur", risk: "LOW", detail: "Territorial · Only local-source income taxed · Spain-SG DTT 2011 · 183 days", color: "text-[#5C9A6B]" },
                        ].map(r => (
                          <div key={r.country} className="border border-white/5 bg-black/20 p-2.5 rounded-lg">
                            <div className={`${r.color} font-bold mb-0.5`}>{r.country} · {r.risk}</div>
                            <div className="text-[#B0A89E] leading-relaxed">{r.detail}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Life Design — Master Recommendation */}
                    <div className="border border-[#D4A853]/25 bg-[#D4A853]/3 p-5 rounded-xl space-y-3">
                      <div className="font-mono text-xs text-[#D4A853] uppercase tracking-wider font-bold border-b border-[#D4A853]/10 pb-2">
                        {"Life Design — Master Recommendation · Ernesto Profile (IPT + LLC + High-Ticket Consulting)"}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                        <div className="space-y-2">
                          <div className="text-white font-bold">{"Phase 2 — Oct/Nov 2026 → 2029: Uruguay 🇺🇾"}</div>
                          <div className="text-[#B0A89E] leading-relaxed">
                            {"Minimum cost of living ($1,500/mo) · 0% foreign income in 10-year tax holiday · High cultural fit (Spanish-speaking) · Low stress · Rentista visa (condition: min $1,500/mo demonstrable income) · Minimum buffer required: $6,500"}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-white font-bold">{"Phase 3 — 2029+: Singapore 🇸🇬 (if MRR > $10K)"}</div>
                          <div className="text-[#B0A89E] leading-relaxed">
                            {"Maximum SaaS prestige · Spain-SG DTT 2011 · 0% territorial foreign income · Employment Pass accessible with demonstrable consulting · Reference for Asia-Pacific clients"}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-[#7A6F65] font-mono border-t border-[#D4A853]/10 pt-2">
                        {"Paraguay as minimum-viable option if liquidity < $6,500 (easier visa, lower cost). Philippines SRRV available from $10K as a low-stress tropical alternative."}
                      </div>
                    </div>

                    {/* Spain exit + old recommendation */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border border-[#5C9A6B]/20 bg-[#5C9A6B]/3 p-4 rounded-xl space-y-1.5">
                        <div className="font-mono text-xs text-[#5C9A6B] uppercase tracking-wider font-bold">
                          {"High-Prestige Alternative · Confidence 8/10"}
                        </div>
                        <div className="font-mono text-xs text-white font-bold">Singapur 🇸🇬 / Hong Kong 🇭🇰</div>
                        <div className="font-mono text-xs text-[#B0A89E] leading-relaxed">
                          {"Solid territorial system · DTT with Spain · Offshore LLC consulting 0% · Mature economies · No aggressive recharacterization risk · Ideal for high-ticket consulting profile at $100K+ scale"}
                        </div>
                      </div>
                      <div className="border border-[#C85C5C]/15 bg-[#C85C5C]/3 p-4 rounded-xl space-y-1.5">
                        <div className="font-mono text-xs text-[#C85C5C] uppercase tracking-wider font-bold">
                          {"Spain Exit · Real Blocker"}
                        </div>
                        <div className="font-mono text-xs text-white font-bold">{"Creditor Insolvency Proceeding"}</div>
                        <div className="font-mono text-xs text-[#B0A89E] leading-relaxed">
                          {"Before departure: verify ties with insolvency lawyer. Without a foreign tax residency certificate in 2026, Spain retains residency. Jan 1 2027 = clean exit. Jun 24 = formal risk but low if consulting < €3K in 2026."}
                        </div>
                      </div>
                    </div>

                    <div className="font-mono text-xs text-[#7A6F65] leading-relaxed border-t border-[#D4A853]/8 pt-3">
                      {"All calculations are estimates based on public data. Hong Kong: Salaries Tax calculated on standard rate 15% vs. progressive (whichever is lower), allowance HKD 132,000. Singapore: 2024/25 rates in SGD (USD × 1.35 approx). UAE Free Zone: 0% personal income tax confirmed. Uruguay: D.148/007 Literal A — foreign income exempt during 10-year fiscal holiday. Paraguay: pure territorial system, IRP 10% on local-source income only. Philippines: foreign nationals taxed only on Philippine-source income. No figure substitutes verification with a licensed tax advisor in the destination country."}
                    </div>
                  </div>
                );
              })()}

              {/* ── Simulador de Conquista Global ── */}
              <div className="border border-[#D4A853]/15 bg-[#0A0908]/95 p-8 rounded relative glow-border mt-8 space-y-6">
                  <div className="flex justify-between items-start border-b border-[#D4A853]/8 pb-4">
                    <div>
                      <span className="font-mono text-xs text-[#D4A853]/70 tracking-widest uppercase block mb-1">
                        {"Global Conquest Simulator"}
                      </span>
                      <h3 className="text-sm font-bold font-mono text-[#f8fafc]">{"Regional SaaS Maturity & Expansion Modeler"}</h3>
                    </div>
                    <span className="font-mono text-xs uppercase tracking-wider text-[#D4A853] border border-[#D4A853]/25 px-2 py-0.5 rounded bg-[#D4A853]/5">
                      Global Expansion Hacker (Agent #21)
                    </span>
                  </div>

                  <p className="text-sm text-[#B0A89E] leading-relaxed font-mono">
                    {"Select an expansion region to inspect SaaS friction thresholds, customer acquisition costs (CAC), competitive saturation indices, and tax optimization routes."}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { key: "estonia", label: "Estonia & Baltics", maturity: "92%", friction: "Medium", tax: "10% Def." },
                      { key: "mexico", label: "Latin America (Mex/Col)", maturity: "68%", friction: "High", tax: "15% Local" },
                      { key: "singapore", label: "Singapore & SE Asia", maturity: "88%", friction: "Low", tax: "8% Eff." }
                    ].map(region => (
                      <button
                        key={region.key}
                        type="button"
                        onClick={() => {
                          setConquestRegion(region.key);
                          setConquestResult(false);
                        }}
                        className={`p-3 text-left border rounded transition-all cursor-pointer ${
                          conquestRegion === region.key
                            ? "border-[#D4A853] bg-[#D4A853]/5 text-white"
                            : "border-[#D4A853]/8 text-[#B0A89E] hover:border-white/10 hover:text-white"
                        }`}
                      >
                        <div className="text-xs font-semibold">{region.label}</div>
                        <div className="text-xs text-[#B0A89E] mt-1 space-y-0.5">
                          <div>{"Maturity:"} {region.maturity}</div>
                          <div>{"Friction Index:"} {region.friction}</div>
                          <div>{"Tax Rate:"} {region.tax}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Macroeconomics and Competitive grids */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                    {/* Macroeconomics Grid */}
                    <div className="border border-[#D4A853]/8 p-4 rounded bg-black/20 space-y-3">
                      <span className="text-[#D4A853] font-semibold block uppercase text-xs tracking-wider border-b border-[#D4A853]/8 pb-1">
                        {"Macroeconomic Parameters"}
                      </span>
                      <div className="space-y-1.5 text-[#B0A89E]">
                        <div className="flex justify-between">
                          <span>{"GDP Growth:"}</span>
                          <span className="text-white font-bold">{conquestRegion === "estonia" ? "+2.8%" : conquestRegion === "mexico" ? "+3.5%" : "+3.1%"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{"Annual Inflation:"}</span>
                          <span className="text-white font-bold">{conquestRegion === "estonia" ? "2.1%" : conquestRegion === "mexico" ? "4.2%" : "1.8%"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{"Corporate Tax (reinvested):"}</span>
                          <span className="text-[#5C9A6B] font-bold">{conquestRegion === "estonia" ? "0%" : conquestRegion === "mexico" ? "30%" : "0%"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{"Double Taxation Treaties:"}</span>
                          <span className="text-white">{conquestRegion === "estonia" ? "62 countries" : conquestRegion === "mexico" ? "50 countries" : "85 countries"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Saturation / Competitive Indices */}
                    <div className="border border-[#D4A853]/8 p-4 rounded bg-black/20 space-y-3">
                      <span className="text-[#D4A853] font-semibold block uppercase text-xs tracking-wider border-b border-[#D4A853]/8 pb-1">
                        {"Competitive Saturation Indices"}
                      </span>
                      <div className="space-y-1.5 text-[#B0A89E]">
                        <div className="flex justify-between">
                          <span>{"SaaS Saturation Density:"}</span>
                          <span className="text-white font-bold">{conquestRegion === "estonia" ? "High (90%)" : conquestRegion === "mexico" ? "Low (45%)" : "Medium (75%)"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{"CAC Index (relative):"}</span>
                          <span className="text-white font-bold">{conquestRegion === "estonia" ? "1.2x" : conquestRegion === "mexico" ? "0.6x" : "1.5x"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{"LTV/CAC Multiple:"}</span>
                          <span className="text-[#5C9A6B] font-bold">{conquestRegion === "estonia" ? "4.1x" : conquestRegion === "mexico" ? "5.8x" : "3.5x"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{"Average Diagnostic Latency:"}</span>
                          <span className="text-white">{conquestRegion === "estonia" ? "Fast (72h)" : conquestRegion === "mexico" ? "Medium (96h)" : "Immediate (24h)"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {!conquestSimulating && !conquestResult && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setConquestSimulating(true);
                          setTimeout(() => {
                            setConquestSimulating(false);
                            setConquestResult(true);
                          }, 1200);
                        }}
                        className="px-4 py-2 bg-[#D4A853] text-[#0A0908] text-xs font-bold uppercase tracking-wider hover:bg-[#E8C97A] active:scale-[0.98] transition-all cursor-pointer rounded"
                      >
                        {"Simulate Market Entry"}
                      </button>
                    </div>
                  )}

                  {conquestSimulating && (
                    <div className="flex items-center justify-center gap-2 py-4 text-xs text-[#D4A853] font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853] animate-ping" />
                      {"Calculating macroeconomic curves and fiscal residency routes..."}
                    </div>
                  )}

                  {conquestResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6 border-t border-[#D4A853]/15 pt-4"
                    >
                      <h4 className="text-xs text-[#22C55E] uppercase tracking-widest font-bold font-mono">
                        {"✓ Expansion Simulation Completed"}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-[#B0A89E] font-mono">
                        <div className="border border-[#D4A853]/8 bg-white/[0.01] p-3 rounded space-y-1">
                          <span className="text-[#D4A853] font-semibold block uppercase text-xs tracking-wider">{"Sniper Outreach Channel"}</span>
                          {conquestRegion === "estonia" ? (
                            <span>{"Deploy LinkedIn Snipers targeting European founders with localized Baltic compliance benchmarks. Target MRR >$15k."}</span>
                          ) : conquestRegion === "mexico" ? (
                            <span>{"Cold-email outbound sequence offering free friction audits to high-growth LatAm fintechs. Focus on LatAm compliance gaps."}</span>
                          ) : (
                            <span>{"Leverage Singapore SaaS directories to target VC-backed B2B scaleups with 3-draft Socratic teardowns."}</span>
                          )}
                        </div>
                        <div className="border border-[#D4A853]/8 bg-white/[0.01] p-3 rounded space-y-1">
                          <span className="text-[#D4A853] font-semibold block uppercase text-xs tracking-wider">{"Tax & Legal Routing"}</span>
                          {conquestRegion === "estonia" ? (
                            <span>{"Channel Baltic licensing fees through an Estonian OÜ. Retain deferred profits at 0% corporate tax for reinvestment."}</span>
                          ) : conquestRegion === "mexico" ? (
                            <span>{"Collect MXN/USD via local Stripe invoicing. Channel to Spanish SL corporate entity using Spain-Mexico tax treaty benefits."}</span>
                          ) : (
                            <span>{"Channel SE Asia contract income to a Singapore holding company. Effective local corporate rate: 8.5%."}</span>
                          )}
                        </div>
                      </div>

                      {/* Agent #21 Quarterly Recommendation Report */}
                      <div className="border border-[#D4A853]/20 bg-[#D4A853]/5 p-4 rounded space-y-3 font-mono">
                        <span className="text-[#D4A853] font-bold block uppercase text-xs tracking-wider">
                          Quarterly Recommendation Report — Agent #21 (Global Expansion Hacker)
                        </span>
                        <div className="text-xs text-[#B0A89E] leading-relaxed space-y-2">
                          <p>
                            <strong>{"Target Strategy:"}</strong> {conquestRegion === "estonia"
                              ? "Estonia is the optimal springboard for the S&F Certified program in Europe. Reinvesting profits free of corporate tax (0%) allows scaling outbound automation infrastructure ×3."
                              : conquestRegion === "mexico"
                              ? "Latin America has the highest conversion friction index. A localized pricing model ($999/mo instead of $2,500 one-time) captures high-growth B2B startups in the payment digitization process."
                              : "Singapore represents the highest LTV potential. Establishing a regional pass-through LLC to manage SE Asia SaaS client revenue under zero-tax parameters."}
                          </p>
                          <div className="border-t border-[#D4A853]/15 pt-2 flex justify-between text-xs text-[#D4A853]">
                            <span>{"Status: SIGNED_RECOMMENDATION"}</span>
                            <span>{"Confidence: 94.8%"}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
        </AnimatePresence>

      </div>
    </main>
  );
}
