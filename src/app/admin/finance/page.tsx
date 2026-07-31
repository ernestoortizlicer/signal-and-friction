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

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Add/Edit modal state ──
  const [showTxModal, setShowTxModal] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [showInvModal, setShowInvModal] = useState(false);
  const [editingInv, setEditingInv] = useState<Investment | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-supabase.supabase.co";

  async function fetchFinanceData() {
    setFetchError(null);
    try {
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

  useEffect(() => {
    fetchFinanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const consultingAccount = accounts.find(a => a.name === "Consulting Revenue");
  const consultingRevenue = consultingAccount ? Math.abs(accountBalances[consultingAccount.id] || 0) / 100 : 0;

  // Retirement compound calculator math
  const p = totalAssets; // start value
  const r = returnRate / 100;
  const n = 12;
  const yrs = yearsProject;
  const pmt = monthlyContrib;
  const nt = n * yrs;
  const rn = r / n;
  // rn can be 0 (0% return rate) — the annuity formula divides by rn, so a
  // real 0% scenario needs its own branch instead of producing NaN.
  const contributionsAt = (months: number) =>
    rn > 0 ? pmt * ((Math.pow(1 + rn, months) - 1) / rn) * (1 + rn) : pmt * months;
  const compoundPrincipal = p * Math.pow(1 + rn, nt);
  const compoundContributions = contributionsAt(nt);
  const totalAccumulated = compoundPrincipal + compoundContributions;

  // Real yearly trajectory for the projection chart — replaces a
  // previously-static decorative SVG path that never reflected the actual
  // inputs.
  const chartYears = Math.max(1, Math.min(60, Math.round(yearsProject)));
  const trajectory = Array.from({ length: chartYears + 1 }, (_, yr) => {
    const months = n * yr;
    return p * Math.pow(1 + rn, months) + contributionsAt(months);
  });
  const trajectoryMax = Math.max(...trajectory, 1);
  const trajectoryPath = trajectory
    .map((v, i) => {
      const x = (i / chartYears) * 100;
      const y = 100 - (v / trajectoryMax) * 92;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  // AI Advice Handler
  async function triggerAiAdvice() {
    setAdviceLoading(true);
    setAdviceError(null);
    setAdvisorMeta(null);
    try {
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

  // ── Create/update — real balanced double-entry writes ──
  //
  // A transaction is never written as a single row: the deferred
  // sum-to-zero constraint on transaction_entries checks "this
  // transaction's entries sum to zero" at the end of the SQL transaction
  // the insert ran in, so both entries must land in ONE insert call, not
  // two — the same pattern already used by the Stripe webhook's ledger
  // posting (functions/api/stripe/webhook.ts).
  async function saveTransaction(input: {
    date: string; description: string; debitAccountId: string; creditAccountId: string; amountUsd: number;
  }): Promise<string | null> {
    const headers = { ...getAuthHeaders(), "Content-Type": "application/json", Prefer: "return=representation" };
    const amountCents = Math.round(input.amountUsd * 100);

    if (editingTx) {
      // Replace the entries rather than PATCH them in place — changing an
      // amount or account in place risks a moment where the two entries
      // don't sum to zero if one write succeeds and the other fails.
      // Delete + single re-insert keeps the balanced-pair invariant intact
      // the same way creation does.
      const patchRes = await fetch(`${supabaseUrl}/rest/v1/transactions?id=eq.${editingTx.id}`, {
        method: "PATCH", headers,
        body: JSON.stringify({ date: input.date, description: input.description }),
      });
      if (!patchRes.ok) throw new Error(`Failed to update transaction (${patchRes.status}).`);

      const delRes = await fetch(`${supabaseUrl}/rest/v1/transaction_entries?transaction_id=eq.${editingTx.id}`, {
        method: "DELETE", headers,
      });
      if (!delRes.ok) throw new Error(`Failed to clear old entries (${delRes.status}).`);

      const insRes = await fetch(`${supabaseUrl}/rest/v1/transaction_entries`, {
        method: "POST", headers,
        body: JSON.stringify([
          { transaction_id: editingTx.id, account_id: input.debitAccountId, amount: amountCents },
          { transaction_id: editingTx.id, account_id: input.creditAccountId, amount: -amountCents },
        ]),
      });
      if (!insRes.ok) throw new Error(`Failed to write new entries (${insRes.status}).`);
      return editingTx.id;
    }

    const txRes = await fetch(`${supabaseUrl}/rest/v1/transactions`, {
      method: "POST", headers,
      body: JSON.stringify({ date: input.date, description: input.description }),
    });
    if (!txRes.ok) throw new Error(`Failed to create transaction (${txRes.status}).`);
    const [tx] = await txRes.json();
    if (!tx?.id) throw new Error("Transaction created but no id returned.");

    const entriesRes = await fetch(`${supabaseUrl}/rest/v1/transaction_entries`, {
      method: "POST", headers,
      body: JSON.stringify([
        { transaction_id: tx.id, account_id: input.debitAccountId, amount: amountCents },
        { transaction_id: tx.id, account_id: input.creditAccountId, amount: -amountCents },
      ]),
    });
    if (!entriesRes.ok) {
      // The transaction header exists but has no balanced entries — an
      // orphaned header is safer to leave for manual cleanup than to
      // silently hide, so surface the real error rather than retry blind.
      throw new Error(`Transaction created but entries failed to write (${entriesRes.status}). Transaction id ${tx.id} needs manual review.`);
    }
    return tx.id;
  }

  async function saveInvestment(input: {
    name: string; type: Investment['type']; accountId: string; purchaseDate: string;
    costBasisUsd: number; currentValueUsd: number; projectedRoiPct: number; depreciationPct: number;
  }) {
    const headers = { ...getAuthHeaders(), "Content-Type": "application/json", Prefer: "return=representation" };
    const body = {
      name: input.name,
      type: input.type,
      account_id: input.accountId,
      purchase_date: input.purchaseDate,
      cost_basis: Math.round(input.costBasisUsd * 100),
      current_value: Math.round(input.currentValueUsd * 100),
      projected_annual_roi_pct: input.projectedRoiPct || 0,
      depreciation_rate_annual_pct: input.depreciationPct || 0,
    };
    const res = editingInv
      ? await fetch(`${supabaseUrl}/rest/v1/investments?id=eq.${editingInv.id}`, { method: "PATCH", headers, body: JSON.stringify(body) })
      : await fetch(`${supabaseUrl}/rest/v1/investments`, { method: "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Failed to ${editingInv ? "update" : "create"} investment (${res.status}).`);
  }

  async function saveGoal(input: { name: string; targetAmountUsd: number; currentAmountUsd: number; targetDate: string }) {
    const headers = { ...getAuthHeaders(), "Content-Type": "application/json", Prefer: "return=representation" };
    const body = {
      name: input.name,
      target_amount: Math.round(input.targetAmountUsd * 100),
      current_amount: Math.round(input.currentAmountUsd * 100),
      target_date: input.targetDate || null,
    };
    const res = editingGoal
      ? await fetch(`${supabaseUrl}/rest/v1/financial_goals?id=eq.${editingGoal.id}`, { method: "PATCH", headers, body: JSON.stringify(body) })
      : await fetch(`${supabaseUrl}/rest/v1/financial_goals`, { method: "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Failed to ${editingGoal ? "update" : "create"} goal (${res.status}).`);
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
              {/* Scorecard — every figure computed from real accounts/entries, real $0 when there's nothing to show */}
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Net Worth", value: `$${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, detail: "Assets − Liabilities" },
                  { label: "Cash Runway", value: `${runwayMonths.toFixed(1)} ${"months"}`, detail: "Checking vs. expenses" },
                  { label: "Monthly Burn", value: `$${averageBurnRate.toFixed(2)}`, detail: "AI API, software, hosting" },
                  { label: "Consulting Revenue", value: `$${consultingRevenue.toFixed(2)}`, detail: "Reconciled beta fees" },
                ].map((item, idx) => (
                  <div key={idx} className="border border-[#D4A853]/10 p-5 bg-[#110F0D] rounded-2xl relative overflow-hidden">
                    <span className="font-mono text-xs text-[#B0A89E] uppercase tracking-wider block mb-2">{item.label}</span>
                    <span className="font-serif text-3xl font-bold text-[#F5F0EB] block mb-1">{item.value}</span>
                    <span className="text-xs text-[#7A6F65]">{item.detail}</span>
                  </div>
                ))}
              </section>

              {/* Goals Tracker */}
              <section className="border border-[#D4A853]/8 p-8 bg-[#0A0908]/40 rounded space-y-6">
                <div className="flex justify-between items-center border-b border-[#D4A853]/8 pb-3">
                  <h3 className="font-serif text-lg text-[#F5F0EB]">{"Active Goals"}</h3>
                  <button
                    type="button"
                    onClick={() => { setEditingGoal(null); setShowGoalModal(true); }}
                    className="px-3 py-1 bg-[#D4A853]/10 text-[#D4A853] border border-[#D4A853]/25 hover:bg-[#D4A853]/15 rounded font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    {"+ Add Goal"}
                  </button>
                </div>
                {goals.length === 0 ? (
                  <p className="text-xs font-mono text-[#7A6F65] italic">{"No goals yet."}</p>
                ) : (
                  <div className="space-y-6">
                    {goals.map(goal => {
                      const pct = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
                      return (
                        <div key={goal.id} className="space-y-2">
                          <div className="flex justify-between items-center text-xs font-mono gap-2">
                            <button type="button" onClick={() => { setEditingGoal(goal); setShowGoalModal(true); }} className="text-[#B0A89E] hover:text-[#D4A853] cursor-pointer text-left">
                              {goal.name}
                            </button>
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
                            <div className="h-full bg-[#D4A853]" style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
                <div className="flex justify-between items-center">
                  <h3 className="font-serif text-xl text-[#F5F0EB]">{"Double-Entry General Ledger"}</h3>
                  <button
                    type="button"
                    onClick={() => { setEditingTx(null); setShowTxModal(true); }}
                    className="px-3 py-1.5 bg-[#D4A853]/10 text-[#D4A853] border border-[#D4A853]/25 hover:bg-[#D4A853]/15 rounded font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    {"+ Add Transaction"}
                  </button>
                </div>
                {transactions.length === 0 ? (
                  <p className="text-xs font-mono text-[#7A6F65] italic py-4">{"No transactions yet. Add the first one, or a real Stripe payment will post here automatically."}</p>
                ) : (
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
                            <td className="text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => { setEditingTx(tx); setShowTxModal(true); }}
                                className="px-2.5 py-1 mr-1.5 rounded bg-white/5 border border-white/10 text-[#B0A89E] text-[10px] font-mono uppercase tracking-wide hover:bg-white/10 cursor-pointer"
                              >
                                {"Edit"}
                              </button>
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
                )}
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
              {/* Retirement Projection Calculator — a labeled what-if tool:
                  starts from your real net worth, everything past that is
                  your own adjustable assumptions, never asserted as fact. */}
              <div className="border border-[#D4A853]/8 p-8 bg-[#0A0908]/40 rounded space-y-6">
                <div>
                  <h3 className="font-serif text-lg text-[#F5F0EB] border-b border-[#D4A853]/8 pb-3">{"Compound Retirement Calculator"}</h3>
                  <p className="text-xs text-[#7A6F65] font-mono pt-2">{"A what-if projection, not a forecast — starts from your real net worth ($" + totalAssets.toFixed(2) + "), everything else below is whatever you enter."}</p>
                </div>

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

                {/* Real trajectory chart — plots the actual year-by-year
                    compounding of the inputs above, not a fixed decorative
                    curve. */}
                <div className="h-32 border-b border-[#D4A853]/8 relative flex items-end pt-4">
                  <div className="absolute top-2 left-2 text-xs font-mono text-[#7A6F65]">{"Compound Interest Projection"}</div>
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d={trajectoryPath} fill="none" stroke="#D4A853" strokeWidth="2" vectorEffect="non-scaling-stroke" />
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

              {/* Investments ledger */}
              <div className="border border-[#D4A853]/8 p-8 bg-[#0A0908]/20 rounded space-y-6">
                <div className="flex justify-between items-center border-b border-[#D4A853]/8 pb-4">
                  <h3 className="font-serif text-xl text-[#F5F0EB]">{"Asset Portfolio"}</h3>
                  <button
                    type="button"
                    onClick={() => { setEditingInv(null); setShowInvModal(true); }}
                    className="px-3 py-1 bg-[#D4A853]/10 text-[#D4A853] border border-[#D4A853]/25 hover:bg-[#D4A853]/15 rounded font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    {"+ Add Asset"}
                  </button>
                </div>
                {investments.length === 0 ? (
                  <div className="border border-dashed border-white/10 p-12 text-center rounded space-y-4">
                    <p className="text-xs font-mono text-[#B0A89E]">{"No assets catalogued."}</p>
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
                            <td className="text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => { setEditingInv(inv); setShowInvModal(true); }}
                                className="px-2.5 py-1 mr-1.5 rounded bg-white/5 border border-white/10 text-[#B0A89E] text-[10px] font-mono uppercase tracking-wide hover:bg-white/10 cursor-pointer"
                              >
                                {"Edit"}
                              </button>
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

      <AnimatePresence>
        {showTxModal && (
          <TransactionModal
            accounts={accounts}
            editing={editingTx}
            onClose={() => { setShowTxModal(false); setEditingTx(null); }}
            onSave={async (input) => {
              await saveTransaction(input);
              await fetchFinanceData();
            }}
          />
        )}
        {showInvModal && (
          <InvestmentModal
            accounts={accounts}
            editing={editingInv}
            onClose={() => { setShowInvModal(false); setEditingInv(null); }}
            onSave={async (input) => {
              await saveInvestment(input);
              await fetchFinanceData();
            }}
          />
        )}
        {showGoalModal && (
          <GoalModal
            editing={editingGoal}
            onClose={() => { setShowGoalModal(false); setEditingGoal(null); }}
            onSave={async (input) => {
              await saveGoal(input);
              await fetchFinanceData();
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

// ── Shared modal chrome ──────────────────────────────────────────────────
function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#0A0908] border border-[#D4A853]/20 rounded-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-[#D4A853]/8 pb-3">
          <h3 className="font-serif text-lg text-[#F5F0EB]">{title}</h3>
          <button onClick={onClose} className="font-mono text-xs text-[#7A6F65] hover:text-white uppercase cursor-pointer">{"✕"}</button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider block mb-1">{children}</label>;
}

const inputClass = "w-full bg-black/40 border border-[#D4A853]/15 rounded px-3 py-2 text-sm font-mono text-[#F5F0EB] focus:outline-none focus:border-[#D4A853]/40";

// ── Add/Edit Transaction ──────────────────────────────────────────────────
function TransactionModal({
  accounts, editing, onClose, onSave,
}: {
  accounts: Account[];
  editing: Transaction | null;
  onClose: () => void;
  onSave: (input: { date: string; description: string; debitAccountId: string; creditAccountId: string; amountUsd: number }) => Promise<void>;
}) {
  const existingDebit = editing?.transaction_entries?.find(e => e.amount > 0);
  const existingCredit = editing?.transaction_entries?.find(e => e.amount < 0);
  const [date, setDate] = useState(editing ? editing.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState(editing?.description ?? "");
  const [debitAccountId, setDebitAccountId] = useState(existingDebit?.account_id ?? "");
  const [creditAccountId, setCreditAccountId] = useState(existingCredit?.account_id ?? "");
  const [amountUsd, setAmountUsd] = useState(existingDebit ? Math.abs(existingDebit.amount) / 100 : 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!description.trim()) return setError("Description is required.");
    if (!debitAccountId || !creditAccountId) return setError("Both a debit and credit account are required.");
    if (debitAccountId === creditAccountId) return setError("Debit and credit accounts must be different — that's not a real transaction.");
    if (!amountUsd || amountUsd <= 0) return setError("Amount must be greater than zero.");
    setSaving(true);
    try {
      await onSave({ date, description: description.trim(), debitAccountId, creditAccountId, amountUsd });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save transaction.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={editing ? "Edit Transaction" : "Add Transaction"} onClose={onClose}>
      {error && <div className="border border-[#C85C5C]/40 bg-[#C85C5C]/10 rounded px-3 py-2 font-mono text-xs text-[#C85C5C]">{"⚠ "}{error}</div>}
      <p className="text-xs text-[#7A6F65] font-mono leading-relaxed">
        {"Real double-entry: money is debited from one account and credited to another. Recording income? Debit your checking account, credit a revenue account. Recording an expense? Debit an expense account, credit checking."}
      </p>
      <div className="space-y-3">
        <div><FieldLabel>Date</FieldLabel><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} /></div>
        <div><FieldLabel>Description *</FieldLabel><input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Consulting invoice — PayFlux" className={inputClass} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Debit Account *</FieldLabel>
            <select value={debitAccountId} onChange={e => setDebitAccountId(e.target.value)} className={inputClass}>
              <option value="">Select…</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Credit Account *</FieldLabel>
            <select value={creditAccountId} onChange={e => setCreditAccountId(e.target.value)} className={inputClass}>
              <option value="">Select…</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
            </select>
          </div>
        </div>
        <div><FieldLabel>Amount ($) *</FieldLabel><input type="number" min={0.01} step={0.01} value={amountUsd} onChange={e => setAmountUsd(Number(e.target.value))} className={inputClass} /></div>
      </div>
      <div className="flex justify-end gap-3 border-t border-[#D4A853]/8 pt-4">
        <button type="button" onClick={onClose} className="px-4 py-2 border border-white/10 hover:text-white uppercase tracking-wider rounded cursor-pointer text-xs font-mono">Cancel</button>
        <button type="button" disabled={saving} onClick={handleSubmit} className="px-5 py-2 bg-[#D4A853] text-[#0A0908] font-bold uppercase tracking-wider hover:bg-[#E8C97A] transition-all rounded cursor-pointer text-xs font-mono disabled:opacity-40">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </ModalShell>
  );
}

// ── Add/Edit Investment ───────────────────────────────────────────────────
function InvestmentModal({
  accounts, editing, onClose, onSave,
}: {
  accounts: Account[];
  editing: Investment | null;
  onClose: () => void;
  onSave: (input: {
    name: string; type: Investment['type']; accountId: string; purchaseDate: string;
    costBasisUsd: number; currentValueUsd: number; projectedRoiPct: number; depreciationPct: number;
  }) => Promise<void>;
}) {
  const assetAccounts = accounts.filter(a => a.type === "asset");
  const [name, setName] = useState(editing?.name ?? "");
  const [type, setType] = useState<Investment['type']>(editing?.type ?? "software");
  const [accountId, setAccountId] = useState(editing?.account_id ?? assetAccounts[0]?.id ?? "");
  const [purchaseDate, setPurchaseDate] = useState(editing ? editing.purchase_date.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [costBasisUsd, setCostBasisUsd] = useState(editing ? editing.cost_basis / 100 : 0);
  const [currentValueUsd, setCurrentValueUsd] = useState(editing ? editing.current_value / 100 : 0);
  const [projectedRoiPct, setProjectedRoiPct] = useState(editing?.projected_annual_roi_pct ?? 0);
  const [depreciationPct, setDepreciationPct] = useState(editing?.depreciation_rate_annual_pct ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim()) return setError("Name is required.");
    if (!accountId) return setError("An account is required.");
    if (costBasisUsd < 0 || currentValueUsd < 0) return setError("Values can't be negative.");
    setSaving(true);
    try {
      await onSave({ name: name.trim(), type, accountId, purchaseDate, costBasisUsd, currentValueUsd, projectedRoiPct, depreciationPct });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save investment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={editing ? "Edit Asset" : "Add Asset"} onClose={onClose}>
      {error && <div className="border border-[#C85C5C]/40 bg-[#C85C5C]/10 rounded px-3 py-2 font-mono text-xs text-[#C85C5C]">{"⚠ "}{error}</div>}
      <div className="space-y-3">
        <div><FieldLabel>Name *</FieldLabel><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. MacBook Pro M4" className={inputClass} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Type</FieldLabel>
            <select value={type} onChange={e => setType(e.target.value as Investment['type'])} className={inputClass}>
              {(['hardware', 'ai_tools', 'software', 'financial_asset'] as const).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Linked Account *</FieldLabel>
            <select value={accountId} onChange={e => setAccountId(e.target.value)} className={inputClass}>
              <option value="">Select…</option>
              {(assetAccounts.length > 0 ? assetAccounts : accounts).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
        <div><FieldLabel>Purchase Date</FieldLabel><input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className={inputClass} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><FieldLabel>Cost Basis ($)</FieldLabel><input type="number" min={0} step={0.01} value={costBasisUsd} onChange={e => setCostBasisUsd(Number(e.target.value))} className={inputClass} /></div>
          <div><FieldLabel>Current Value ($)</FieldLabel><input type="number" min={0} step={0.01} value={currentValueUsd} onChange={e => setCurrentValueUsd(Number(e.target.value))} className={inputClass} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><FieldLabel>Projected Annual ROI %</FieldLabel><input type="number" step={0.1} value={projectedRoiPct} onChange={e => setProjectedRoiPct(Number(e.target.value))} className={inputClass} /></div>
          <div><FieldLabel>Depreciation %/yr</FieldLabel><input type="number" step={0.1} value={depreciationPct} onChange={e => setDepreciationPct(Number(e.target.value))} className={inputClass} /></div>
        </div>
      </div>
      <div className="flex justify-end gap-3 border-t border-[#D4A853]/8 pt-4">
        <button type="button" onClick={onClose} className="px-4 py-2 border border-white/10 hover:text-white uppercase tracking-wider rounded cursor-pointer text-xs font-mono">Cancel</button>
        <button type="button" disabled={saving} onClick={handleSubmit} className="px-5 py-2 bg-[#D4A853] text-[#0A0908] font-bold uppercase tracking-wider hover:bg-[#E8C97A] transition-all rounded cursor-pointer text-xs font-mono disabled:opacity-40">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </ModalShell>
  );
}

// ── Add/Edit Goal ─────────────────────────────────────────────────────────
function GoalModal({
  editing, onClose, onSave,
}: {
  editing: Goal | null;
  onClose: () => void;
  onSave: (input: { name: string; targetAmountUsd: number; currentAmountUsd: number; targetDate: string }) => Promise<void>;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [targetAmountUsd, setTargetAmountUsd] = useState(editing ? editing.target_amount / 100 : 0);
  const [currentAmountUsd, setCurrentAmountUsd] = useState(editing ? editing.current_amount / 100 : 0);
  const [targetDate, setTargetDate] = useState(editing?.target_date?.slice(0, 10) ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim()) return setError("Name is required.");
    if (!targetAmountUsd || targetAmountUsd <= 0) return setError("Target amount must be greater than zero.");
    if (currentAmountUsd < 0) return setError("Current amount can't be negative.");
    setSaving(true);
    try {
      await onSave({ name: name.trim(), targetAmountUsd, currentAmountUsd, targetDate });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save goal.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={editing ? "Edit Goal" : "Add Goal"} onClose={onClose}>
      {error && <div className="border border-[#C85C5C]/40 bg-[#C85C5C]/10 rounded px-3 py-2 font-mono text-xs text-[#C85C5C]">{"⚠ "}{error}</div>}
      <div className="space-y-3">
        <div><FieldLabel>Name *</FieldLabel><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Emergency Fund" className={inputClass} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><FieldLabel>Target Amount ($) *</FieldLabel><input type="number" min={0.01} step={0.01} value={targetAmountUsd} onChange={e => setTargetAmountUsd(Number(e.target.value))} className={inputClass} /></div>
          <div><FieldLabel>Current Amount ($)</FieldLabel><input type="number" min={0} step={0.01} value={currentAmountUsd} onChange={e => setCurrentAmountUsd(Number(e.target.value))} className={inputClass} /></div>
        </div>
        <div><FieldLabel>Target Date</FieldLabel><input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className={inputClass} /></div>
      </div>
      <div className="flex justify-end gap-3 border-t border-[#D4A853]/8 pt-4">
        <button type="button" onClick={onClose} className="px-4 py-2 border border-white/10 hover:text-white uppercase tracking-wider rounded cursor-pointer text-xs font-mono">Cancel</button>
        <button type="button" disabled={saving} onClick={handleSubmit} className="px-5 py-2 bg-[#D4A853] text-[#0A0908] font-bold uppercase tracking-wider hover:bg-[#E8C97A] transition-all rounded cursor-pointer text-xs font-mono disabled:opacity-40">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </ModalShell>
  );
}
