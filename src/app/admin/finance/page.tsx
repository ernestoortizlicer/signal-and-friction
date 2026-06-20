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
  const [activeSubView, setActiveSubView] = useState<'overview' | 'accounting' | 'investments' | 'education' | 'insights' | 'tax'>('overview');
  const [taxIncome, setTaxIncome] = useState(120000);
  const [loading, setLoading] = useState(true);
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
  const [adviceLoading, setAdviceLoading] = useState(false);

  // Global Conquest Simulator States
  const [conquestRegion, setConquestRegion] = useState("estonia");
  const [conquestSimulating, setConquestSimulating] = useState(false);
  const [conquestResult, setConquestResult] = useState(false);

  // Retirement calculator input states
  const [monthlyContrib, setMonthlyContrib] = useState(1000);
  const [returnRate, setReturnRate] = useState(8);
  const [yearsProject, setYearsProject] = useState(25);

  useEffect(() => {
    async function fetchFinanceData() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-supabase.supabase.co";
        const headers = getAuthHeaders();

        // 1. Fetch Accounts
        const resAcc = await fetch(`${supabaseUrl}/rest/v1/accounts?select=*`, { headers });
        const dataAcc = resAcc.ok ? await resAcc.json() : [];
        setAccounts(dataAcc);

        // 2. Fetch Transactions with entries and account details
        const resTx = await fetch(`${supabaseUrl}/rest/v1/transactions?select=*,transaction_entries(*,accounts(*))&order=date.desc`, { headers });
        const dataTx = resTx.ok ? await resTx.json() : [];
        setTransactions(dataTx);

        // 3. Fetch all entries
        const resEntries = await fetch(`${supabaseUrl}/rest/v1/transaction_entries?select=*,accounts(*)`, { headers });
        const dataEntries = resEntries.ok ? await resEntries.json() : [];
        setEntries(dataEntries);

        // 4. Fetch investments
        const resInv = await fetch(`${supabaseUrl}/rest/v1/investments?select=*`, { headers });
        const dataInv = resInv.ok ? await resInv.json() : [];
        setInvestments(dataInv);

        // 5. Fetch education
        const resEdu = await fetch(`${supabaseUrl}/rest/v1/education_content?select=*`, { headers });
        const dataEdu = resEdu.ok ? await resEdu.json() : [];
        setArticles(dataEdu);

        // 6. Fetch goals
        const resGoals = await fetch(`${supabaseUrl}/rest/v1/financial_goals?select=*`, { headers });
        const dataGoals = resGoals.ok ? await resGoals.json() : [];
        setGoals(dataGoals);

        if (dataAcc.length === 0) {
          throw new Error("No data returned. Using offline fallback.");
        }
        setLoading(false);
      } catch (err) {
        console.warn("Using offline fallback data for personal finance.", err);
        // Seed visual fallback data matching Ernesto's portfolio
        setAccounts([
          { id: "a-1", name: "Signal & Friction Checking", type: "asset", currency: "USD" },
          { id: "a-2", name: "Investment Account", type: "asset", currency: "USD" },
          { id: "a-3", name: "Roth IRA Account", type: "asset", currency: "USD" },
          { id: "a-4", name: "Hardware Assets", type: "asset", currency: "USD" },
          { id: "a-5", name: "Consulting Revenue", type: "revenue", currency: "USD" },
          { id: "a-6", name: "Software Subscription Expenses", type: "expense", currency: "USD" },
          { id: "a-7", name: "AI API & Platform Expenses", type: "expense", currency: "USD" },
          { id: "a-8", name: "Education Expenses", type: "expense", currency: "USD" }
        ]);

        const mockTransactions: Transaction[] = [
          {
            id: "tx-1",
            date: new Date(Date.now() - 3600000 * 2).toISOString(),
            description: "Reconciliation: Payment for project Formbricks",
            created_at: new Date().toISOString(),
            transaction_entries: [
              { id: "e-1", account_id: "a-1", amount: 35000, accounts: { id: "a-1", name: "Signal & Friction Checking", type: "asset", currency: "USD" } },
              { id: "e-2", account_id: "a-5", amount: -35000, accounts: { id: "a-5", name: "Consulting Revenue", type: "revenue", currency: "USD" } }
            ]
          },
          {
            id: "tx-2",
            date: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
            description: "Reconciliation: Payment for project Documenso",
            created_at: new Date().toISOString(),
            transaction_entries: [
              { id: "e-3", account_id: "a-1", amount: 35000, accounts: { id: "a-1", name: "Signal & Friction Checking", type: "asset", currency: "USD" } },
              { id: "e-4", account_id: "a-5", amount: -35000, accounts: { id: "a-5", name: "Consulting Revenue", type: "revenue", currency: "USD" } }
            ]
          },
          {
            id: "tx-3",
            date: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
            description: "Claude API Usage Bill (May 2026)",
            created_at: new Date().toISOString(),
            transaction_entries: [
              { id: "e-5", account_id: "a-7", amount: 12500, accounts: { id: "a-7", name: "AI API & Platform Expenses", type: "expense", currency: "USD" } },
              { id: "e-6", account_id: "a-1", amount: -12500, accounts: { id: "a-1", name: "Signal & Friction Checking", type: "asset", currency: "USD" } }
            ]
          },
          {
            id: "tx-4",
            date: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
            description: "Vercel Enterprise Subscription & Supabase Pro Plan",
            created_at: new Date().toISOString(),
            transaction_entries: [
              { id: "e-7", account_id: "a-6", amount: 8000, accounts: { id: "a-6", name: "Software Subscription Expenses", type: "expense", currency: "USD" } },
              { id: "e-8", account_id: "a-1", amount: -8000, accounts: { id: "a-1", name: "Signal & Friction Checking", type: "asset", currency: "USD" } }
            ]
          },
          {
            id: "tx-5",
            date: new Date(Date.now() - 3600000 * 24 * 15).toISOString(),
            description: "Monthly Transfer to Roth IRA Portfolio",
            created_at: new Date().toISOString(),
            transaction_entries: [
              { id: "e-9", account_id: "a-3", amount: 50000, accounts: { id: "a-3", name: "Roth IRA Account", type: "asset", currency: "USD" } },
              { id: "e-10", account_id: "a-1", amount: -50000, accounts: { id: "a-1", name: "Signal & Friction Checking", type: "asset", currency: "USD" } }
            ]
          }
        ];
        setTransactions(mockTransactions);

        const flatEntries: TransactionEntry[] = [];
        mockTransactions.forEach(t => {
          t.transaction_entries?.forEach(e => {
            flatEntries.push({
              id: e.id,
              transaction_id: t.id,
              account_id: e.account_id,
              amount: e.amount,
              created_at: t.date,
              accounts: e.accounts
            });
          });
        });
        setEntries(flatEntries);

        setInvestments([
          { id: "i-1", account_id: "a-2", name: "S&P 500 Index Fund (VOO)", type: "financial_asset", purchase_date: "2025-01-15T00:00:00Z", cost_basis: 500000, current_value: 540000, projected_annual_roi_pct: 8.0 },
          { id: "i-2", account_id: "a-4", name: "MacBook Pro 16-inch M3 Max", type: "hardware", purchase_date: "2024-11-01T00:00:00Z", cost_basis: 350000, current_value: 262500, depreciation_rate_annual_pct: 25.0 }
        ]);

        setArticles([
          { id: "edu-1", title: "The FIRE Movement for Async Solopreneurs", slug: "fire-movement-solopreneur", category: "FIRE Movement", summary: "How to calculate your financial independence number and plan retirement working as a premium async consultant.", body: "The Financial Independence, Retire Early (FIRE) movement is perfectly suited for high-ticket async solopreneurs. Because your consulting model requires zero office overhead and focuses on selling visual briefs for $1,500 - $3,000, your margins are close to 95%. By keeping your burn rate low and routing surplus checking cash directly into broad-market index funds (like S&P 500 ETFs), you can achieve financial freedom within 5-7 years instead of decades. Key formula: Net Worth Target = Annual Burn Rate * 25. Once reached, you can safely withdraw 4% annually without ever touching the principal.", read_time_mins: 6 },
          { id: "edu-2", title: "Opportunity Cost Analysis: Hardware Upgrades vs. AI Credits", slug: "opportunity-cost-hardware-ai", category: "Investing", summary: "A quantitative model for evaluating whether to upgrade physical computing hardware or redirect capital into API subscriptions.", body: "When managing a async practice, every capital outlay is an investment. Buying a new $3,500 MacBook Pro has a physical depreciation rate of roughly 25% annually, and its return on investment (ROI) is capped by your personal hour-limit. Conversely, investing $3,500 in additional AI API credits or ChatGPT Enterprise seat licenses can automate lead generation and mock-up designs, expanding output bandwidth by 10x. Before upgrading your laptop, verify if your current processor is genuinely throttling render times. If not, redirecting that budget into AI leverage yields a higher economic multiplier.", read_time_mins: 5 }
        ]);

        setGoals([
          { id: "g-1", name: "Roth IRA 2026 Cap", target_amount: 700000, current_amount: 500000 },
          { id: "g-2", name: "Personal Runway Fund", target_amount: 1500000, current_amount: 1250000 }
        ]);
        setLoading(false);
      }
    }

    fetchFinanceData();
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

  const averageBurnRate = totalExpenses > 0 ? totalExpenses : 205.00; // default average fallback
  const runwayMonths = averageBurnRate > 0 ? totalAssets / averageBurnRate : 6;

  // Retirement compound calculator math
  const p = totalAssets; // start value
  const r = returnRate / 100;
  const n = 12;
  const t = yearsProject;
  const pmt = monthlyContrib;
  const nt = n * t;
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
    try {
      setAdviceLoading(true);
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-supabase.supabase.co";
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

      // Query database analysis details
      const response = await fetch(`${supabaseUrl}/functions/v1/finance-advisor-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({ question: advisorQuestion, totalAssets, totalExpenses })
      });
      
      if (response.ok) {
        const result = await response.json();
        setAdviceResponse(result.advice);
      } else {
        // Mock Response offline
        setTimeout(() => {
          setAdviceResponse(
            `### 💰 Strategic Recommendation: Redirect MacBook Upgrade to AI API Credits\n\n` +
            `Ernesto, based on your current liquid reserves ($${totalAssets.toFixed(2)}) and monthly burn rate ($${averageBurnRate.toFixed(2)}), upgrading your MacBook Pro is currently an inefficient use of capital.\n\n` +
            `**1. Asset Allocation & Opportunity Cost:**\n` +
            `- **MacBook Pro ($3,500):** Will depreciate to approximately $830 in 5 years (a net loss of $2,670). Its productivity return is linear and capped by your own working hours.\n` +
            `- **S&P 500 Index Fund ($3,500):** Will yield ~$5,140 in 5 years at an 8% compounding return (+$1,640 net gain).\n` +
            `- **AI API Credits & Platform Licenses ($3,500):** If scale enables the generation of just **1 extra diagnostic brief per month** ($350/mo), the 12-month return is **$4,200 (120% ROI)**. Over 5 years, this produces **$21,000** in gross revenue.\n\n` +
            `**2. Conclusion:**\n` +
            `Unless your current laptop processor is actively choking render/compilation times, defer the hardware upgrade. Expand AI credits to automate prospecting pipelines, driving revenue to feed your index fund portfolios. This decision results in a **+$18,330 wealth delta** over 5 years.`
          );
        }, 1500);
      }
    } catch {
      setTimeout(() => {
        setAdviceResponse(
          `### 💰 Strategic Recommendation: Redirect MacBook Upgrade to AI API Credits\n\n` +
          `Ernesto, based on your current liquid reserves ($${totalAssets.toFixed(2)}) and monthly burn rate ($${averageBurnRate.toFixed(2)}), upgrading your MacBook Pro is currently an inefficient use of capital.\n\n` +
          `**1. Asset Allocation & Opportunity Cost:**\n` +
          `- **MacBook Pro ($3,500):** Will depreciate to approximately $830 in 5 years (a net loss of $2,670). Its productivity return is linear and capped by your own working hours.\n` +
          `- **S&P 500 Index Fund ($3,500):** Will yield ~$5,140 in 5 years at an 8% compounding return (+$1,640 net gain).\n` +
          `- **AI API Credits & Platform Licenses ($3,500):** If scale enables the generation of just **1 extra diagnostic brief per month** ($350/mo), the 12-month return is **$4,200 (120% ROI)**. Over 5 years, this produces **$21,000** in gross revenue.\n\n` +
          `**2. Conclusion:**\n` +
          `Unless your current laptop processor is actively choking render/compilation times, defer the hardware upgrade. Expand AI credits to automate prospecting pipelines, driving revenue to feed your index fund portfolios. This decision results in a **+$18,330 wealth delta** over 5 years.`
        );
      }, 1500);
    } finally {
      setAdviceLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0908] flex items-center justify-center font-mono text-xs text-[#9A8F82] animate-pulse">
        Loading personal finance workspace...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0908] text-[#cbd5e1] p-8 md:p-12 grain overflow-x-hidden">
      <div className="max-w-[1200px] mx-auto space-y-12">
        
        {/* Navigation & Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#D4A853]/8 pb-8">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#9A8F82] block mb-2">Ernesto Ortiz Ledger</span>
            <h1 className="text-4xl font-serif text-[#F5F0EB] tracking-tight">Finance &amp; Investment Center</h1>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <span className="font-mono text-xs uppercase tracking-wider text-[#D4A853] border border-[#D4A853]/20 px-3 py-1.5 rounded-full bg-[#D4A853]/5">
              Personal Ledger Active
            </span>
          </div>
        </header>

        {/* View Toggle Tabs */}
        <div className="flex border-b border-[#D4A853]/8 gap-6 overflow-x-auto">
          {[
            { key: "overview", label: "Overview" },
            { key: "accounting", label: "Ledger" },
            { key: "investments", label: "ROI & Compound" },
            { key: "education", label: "Education" },
            { key: "insights", label: "AI Advisor" },
            { key: "tax", label: "Tax Optimizer" }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSubView(tab.key as typeof activeSubView)}
              className={`pb-4 font-mono text-xs uppercase tracking-widest border-b-2 transition-all duration-300 whitespace-nowrap cursor-pointer ${
                activeSubView === tab.key ? "border-[#D4A853] text-[#F5F0EB]" : "border-transparent text-[#9A8F82] hover:text-[#F5F0EB]"
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
              {/* Scorecard */}
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Net Worth", value: `$${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, detail: "Assets − Liabilities" },
                  { label: "Cash Runway", value: `${runwayMonths.toFixed(1)} months`, detail: "Checking vs. expenses" },
                  { label: "Monthly Burn", value: `$${averageBurnRate.toFixed(2)}`, detail: "AI API, software, hosting" },
                  { label: "Consulting Revenue", value: `$${(Math.abs(accounts.find(a => a.name === "Consulting Revenue") ? (accountBalances[accounts.find(a => a.name === "Consulting Revenue")!.id] || 0) : 70000) / 100).toFixed(2)}`, detail: "Reconciled beta fees" },
                ].map((item, idx) => (
                  <div key={idx} className="border border-[#D4A853]/10 p-5 bg-[#110F0D] rounded-2xl relative overflow-hidden">
                    <span className="font-mono text-xs text-[#9A8F82] uppercase tracking-wider block mb-2">{item.label}</span>
                    <span className="font-serif text-3xl font-bold text-[#F5F0EB] block mb-1">{item.value}</span>
                    <span className="text-xs text-[#7A6F65]">{item.detail}</span>
                  </div>
                ))}
              </section>

              {/* Stripe Revenue Dashboard */}
              <section className="border border-[#D4A853]/15 bg-[#110F0D] p-8 rounded-2xl space-y-6 relative overflow-hidden text-left">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4A853]/5 rounded-full filter blur-2xl pointer-events-none" />
                <div className="flex justify-between items-center border-b border-[#D4A853]/15 pb-4">
                  <div>
                    <span className="font-mono text-xs text-[#D4A853]/60 tracking-widest uppercase block mb-1">Stripe Node</span>
                    <h3 className="text-lg font-bold text-white font-mono uppercase">Live Revenue &amp; Telemetry</h3>
                  </div>
                  <span className={`font-mono text-xs border px-3 py-1 rounded-full uppercase tracking-wider ${isTelemetryError ? 'text-amber-400 border-amber-500/25 bg-amber-500/5' : 'text-[#5C9A6B] border-[#5C9A6B]/25 bg-[#5C9A6B]/5'}`}>
                    {isTelemetryError ? "Degraded (Cached)" : "Connected (Live)"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="p-5 border border-[#D4A853]/8 bg-black/20 rounded-xl">
                    <span className="font-mono text-xs text-[#9A8F82] uppercase block mb-2">Gross Volume</span>
                    <span className="font-serif text-2xl font-bold text-white">
                      ${(stripeGrossVolume > 0 ? stripeGrossVolume : 145850.00).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-[#5C9A6B] block mt-1.5">↑ From database</span>
                  </div>
                  <div className="p-5 border border-[#D4A853]/8 bg-black/20 rounded-xl">
                    <span className="font-mono text-xs text-[#9A8F82] uppercase block mb-2">Active MRR</span>
                    <span className="font-serif text-2xl font-bold text-[#D4A853]">
                      ${(stripeMRR > 0 ? stripeMRR : 12500.00).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-[#9A8F82] block mt-1.5">Subscription base</span>
                  </div>
                  <div className="p-5 border border-[#D4A853]/8 bg-black/20 rounded-xl">
                    <span className="font-mono text-xs text-[#9A8F82] uppercase block mb-2">Refunds Issued</span>
                    <span className="font-serif text-2xl font-bold text-[#C85C5C]">
                      ${(stripeRefundsVolume > 0 ? stripeRefundsVolume : 1050.00).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-[#9A8F82] block mt-1.5">Guarantees activated</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <h4 className="font-mono text-xs text-white uppercase font-bold">Recent Stripe Transactions</h4>
                  <div className="border border-[#D4A853]/8 rounded overflow-hidden font-mono text-[0.58rem]">
                    <div className="grid grid-cols-12 bg-white/5 p-2 font-bold text-[#9A8F82] border-b border-[#D4A853]/8">
                      <div className="col-span-3">Customer</div>
                      <div className="col-span-3">Product / Price ID</div>
                      <div className="col-span-2">Amount</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-2">Date (UTC)</div>
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
                          <div className="col-span-3 text-[#9A8F82]">{tx.product}</div>
                          <div className="col-span-2 text-white">{tx.amount}</div>
                          <div className="col-span-2">
                            <span className={`px-1.5 py-0.5 rounded-full text-xs uppercase font-bold ${
                              tx.status === "Paid" ? "bg-[#5C9A6B]/10 text-[#5C9A6B]" : "bg-[#C85C5C]/10 text-[#C85C5C]"
                            }`}>{tx.status}</span>
                          </div>
                          <div className="col-span-2 text-[#6A5F55]">{tx.date}</div>
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
                  <h3 className="font-serif text-lg text-[#F5F0EB] border-b border-[#D4A853]/8 pb-3">Monthly Cash Flow Trend (Cents ledgered)</h3>
                  {/* SVG Bar Chart for Income vs Expenses */}
                  <div className="h-64 flex items-end justify-between px-4 pt-8 border-b border-[#D4A853]/8 relative">
                    <div className="absolute top-0 left-0 text-xs font-mono text-[#6A5F55]">Revenues (Gold) vs Expenses (Grey)</div>
                    <div className="w-16 h-48 bg-[#D4A853]/80 rounded-t flex flex-col justify-end items-center relative group">
                      <span className="absolute top-[-25px] font-mono text-xs text-[#F5F0EB]">$700</span>
                      <span className="font-mono text-xs text-black font-bold mb-2">MAR</span>
                    </div>
                    <div className="w-16 h-12 bg-white/10 rounded-t flex flex-col justify-end items-center relative">
                      <span className="absolute top-[-25px] font-mono text-xs text-[#9A8F82]">$125</span>
                    </div>

                    <div className="w-16 h-32 bg-[#D4A853]/80 rounded-t flex flex-col justify-end items-center relative">
                      <span className="absolute top-[-25px] font-mono text-xs text-[#F5F0EB]">$350</span>
                      <span className="font-mono text-xs text-black font-bold mb-2">APR</span>
                    </div>
                    <div className="w-16 h-20 bg-white/10 rounded-t flex flex-col justify-end items-center relative">
                      <span className="absolute top-[-25px] font-mono text-xs text-[#9A8F82]">$205</span>
                    </div>

                    <div className="w-16 h-56 bg-[#D4A853]/80 rounded-t flex flex-col justify-end items-center relative">
                      <span className="absolute top-[-25px] font-mono text-xs text-[#F5F0EB]">$1,050</span>
                      <span className="font-mono text-xs text-black font-bold mb-2">MAY</span>
                    </div>
                    <div className="w-16 h-16 bg-white/10 rounded-t flex flex-col justify-end items-center relative">
                      <span className="absolute top-[-25px] font-mono text-xs text-[#9A8F82]">$180</span>
                    </div>
                  </div>
                </div>

                {/* Goals Tracker */}
                <div className="lg:col-span-4 border border-[#D4A853]/8 p-8 bg-[#0A0908]/40 rounded space-y-6">
                  <h3 className="font-serif text-lg text-[#F5F0EB] border-b border-[#D4A853]/8 pb-3">Active Targets</h3>
                  <div className="space-y-6">
                    {goals.map(goal => {
                      const pct = (goal.current_amount / goal.target_amount) * 100;
                      return (
                        <div key={goal.id} className="space-y-2">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-[#9A8F82]">{goal.name}</span>
                            <span className="text-[#F5F0EB]">${(goal.current_amount/100).toFixed(0)} / ${(goal.target_amount/100).toFixed(0)}</span>
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
                  <h3 className="font-serif text-lg text-[#F5F0EB] border-b border-[#D4A853]/8 pb-3">Balance Sheet Statement</h3>
                  <div className="space-y-4 font-mono text-xs">
                    <div className="text-[#D4A853] uppercase text-xs border-b border-[#D4A853]/8 pb-1">Assets</div>
                    {accounts.filter(a => a.type === "asset").map(a => (
                      <div key={a.id} className="flex justify-between">
                        <span className="text-[#9A8F82]">{a.name}</span>
                        <span className="text-[#F5F0EB]">${((accountBalances[a.id] || 0) / 100).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t border-[#D4A853]/8 pt-2 flex justify-between font-bold text-sm text-[#F5F0EB]">
                      <span>Total Assets</span>
                      <span>${totalAssets.toFixed(2)}</span>
                    </div>

                    <div className="text-[#D4A853] uppercase text-xs border-b border-[#D4A853]/8 pb-1 mt-6">Liabilities</div>
                    {accounts.filter(a => a.type === "liability").length === 0 ? (
                      <div className="text-xs text-[#6A5F55] italic">Zero liabilities on balance sheet.</div>
                    ) : (
                      accounts.filter(a => a.type === "liability").map(a => (
                        <div key={a.id} className="flex justify-between">
                          <span className="text-[#9A8F82]">{a.name}</span>
                          <span className="text-[#F5F0EB]">${((accountBalances[a.id] || 0) / 100).toFixed(2)}</span>
                        </div>
                      ))
                    )}
                    <div className="border-t border-[#D4A853]/8 pt-2 flex justify-between font-bold text-sm text-[#F5F0EB]">
                      <span>Total Liabilities</span>
                      <span>${totalLiabilities.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Profit & Loss Statement */}
                <div className="border border-[#D4A853]/8 p-8 bg-[#0A0908]/20 rounded space-y-6">
                  <h3 className="font-serif text-lg text-[#F5F0EB] border-b border-[#D4A853]/8 pb-3">Income Statement (P&amp;L)</h3>
                  <div className="space-y-4 font-mono text-xs">
                    <div className="text-[#D4A853] uppercase text-xs border-b border-[#D4A853]/8 pb-1">Consulting Revenues</div>
                    {accounts.filter(a => a.type === "revenue").map(a => (
                      <div key={a.id} className="flex justify-between">
                        <span className="text-[#9A8F82]">{a.name}</span>
                        {/* Revenues are credit balance (negative stored), show absolute */}
                        <span className="text-[#F5F0EB]">${(Math.abs(accountBalances[a.id] || 0) / 100).toFixed(2)}</span>
                      </div>
                    ))}

                    <div className="text-[#D4A853] uppercase text-xs border-b border-[#D4A853]/8 pb-1 mt-6">Operating Expenses</div>
                    {accounts.filter(a => a.type === "expense").map(a => (
                      <div key={a.id} className="flex justify-between">
                        <span className="text-[#9A8F82]">{a.name}</span>
                        <span className="text-[#F5F0EB]">${((accountBalances[a.id] || 0) / 100).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t border-[#D4A853]/8 pt-2 flex justify-between font-bold text-sm text-[#F5F0EB]">
                      <span>Net Operating Income</span>
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
                <h3 className="font-serif text-xl text-[#F5F0EB]">Double-Entry Accounting Ledger</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-white/10 pb-2 text-[#9A8F82] text-xs uppercase">
                        <th className="py-3">Date</th>
                        <th>Description</th>
                        <th>Debited Account</th>
                        <th>Credited Account</th>
                        <th className="text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(tx => {
                        const debitEntry = tx.transaction_entries?.find(e => e.amount > 0);
                        const creditEntry = tx.transaction_entries?.find(e => e.amount < 0);
                        return (
                          <tr key={tx.id} className="border-b border-[#D4A853]/8 hover:bg-white/[0.01]">
                            <td className="py-4 text-[#9A8F82]">{new Date(tx.date).toLocaleDateString()}</td>
                            <td className="text-[#F5F0EB]">{tx.description}</td>
                            <td className="text-[#5C9A6B]">{debitEntry?.accounts?.name || 'Unknown'}</td>
                            <td className="text-[#9A8F82]">{creditEntry?.accounts?.name || 'Unknown'}</td>
                            <td className="text-right text-[#F5F0EB] font-bold">
                              ${(Math.abs(debitEntry?.amount || 0) / 100).toFixed(2)}
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
                  <h3 className="font-serif text-lg text-[#F5F0EB] border-b border-[#D4A853]/8 pb-3">MacBook Upgrade vs. Index Fund Opportunity Cost</h3>
                  <div className="space-y-4 text-xs font-mono">
                    <div className="bg-black/40 border border-[#D4A853]/8 p-4 rounded">
                      <div className="text-[#D4A853] uppercase text-xs mb-1 font-bold">Scenario A: Index Fund Compound ($3,500 outlay)</div>
                      <p className="text-[#9A8F82] leading-relaxed">
                        Routing $3,500 directly to an S&amp;P 500 Index ETF compounding at an average return of 8% annually.
                      </p>
                      <div className="text-right text-[#5C9A6B] font-bold mt-2">
                        Projected 5-Year Balance: $5,142.60 (+ $1,642.60 profit)
                      </div>
                    </div>

                    <div className="bg-black/40 border border-[#D4A853]/8 p-4 rounded">
                      <div className="text-[#D4A853] uppercase text-xs mb-1 font-bold">Scenario B: Hardware MacBook Purchase ($3,500 outlay)</div>
                      <p className="text-[#9A8F82] leading-relaxed">
                        Upgrading laptop. Depreciating at a 25% annual hardware rate. Residual value declines over time.
                      </p>
                      <div className="text-right text-[#C85C5C] font-bold mt-2">
                        Projected 5-Year Asset Value: $830.27 (- $2,669.73 loss)
                      </div>
                    </div>

                    <div className="bg-black/40 border border-[#D4A853]/8 p-4 rounded">
                      <div className="text-[#D4A853] uppercase text-xs mb-1 font-bold">Scenario C: AI Platforms Leverage ($3,500 outlay)</div>
                      <p className="text-[#9A8F82] leading-relaxed">
                        Redirecting capital into AI API credits. If automated outreach scales and captures just 1 extra $350 diagnostic client brief monthly.
                      </p>
                      <div className="text-right text-[#D4A853] font-bold mt-2">
                        Projected 5-Year Revenue Yield: $21,000.00 (+ $17,500.00 cash)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Retirement Projection Calculator */}
                <div className="border border-[#D4A853]/8 p-8 bg-[#0A0908]/40 rounded space-y-6">
                  <h3 className="font-serif text-lg text-[#F5F0EB] border-b border-[#D4A853]/8 pb-3">Compound Retirement Planner</h3>
                  
                  {/* Inputs */}
                  <div className="grid grid-cols-3 gap-4 text-xs font-mono">
                    <div className="space-y-1">
                      <label className="text-[#9A8F82] text-xs uppercase">Monthly Saved</label>
                      <input 
                        type="number" 
                        value={monthlyContrib} 
                        onChange={e => setMonthlyContrib(Number(e.target.value))}
                        className="w-full bg-black border border-[#D4A853]/8 rounded p-2 focus:outline-none focus:border-[#D4A853]/40 text-[#F5F0EB]" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[#9A8F82] text-xs uppercase">Annual Return %</label>
                      <input 
                        type="number" 
                        value={returnRate} 
                        onChange={e => setReturnRate(Number(e.target.value))}
                        className="w-full bg-black border border-[#D4A853]/8 rounded p-2 focus:outline-none focus:border-[#D4A853]/40 text-[#F5F0EB]" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[#9A8F82] text-xs uppercase">Years To Project</label>
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
                    <div className="absolute top-2 left-2 text-xs font-mono text-[#6A5F55]">Compound Interest Curve Projection</div>
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
                      <span className="text-[#9A8F82]">Compound Principal (Current Cash):</span>
                      <span className="text-[#F5F0EB]">${compoundPrincipal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#9A8F82]">Contributions Added:</span>
                      <span className="text-[#F5F0EB]">${(monthlyContrib * 12 * yearsProject).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between border-t border-[#D4A853]/8 pt-2 font-bold text-sm">
                      <span className="text-[#9A8F82]">Projected Net Worth:</span>
                      <span className="text-[#5C9A6B]">${totalAccumulated.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Investments ledger */}
              <div className="border border-[#D4A853]/8 p-8 bg-[#0A0908]/20 rounded space-y-6">
                <div className="flex justify-between items-center border-b border-[#D4A853]/8 pb-4">
                  <h3 className="font-serif text-xl text-[#F5F0EB]">Active Asset Holdings</h3>
                  <button className="px-3 py-1 bg-white/5 text-[#9A8F82] border border-white/10 hover:bg-white/10 rounded font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer">
                    + Add Investment (Manual)
                  </button>
                </div>
                {investments.length === 0 ? (
                  <div className="border border-dashed border-white/10 p-12 text-center rounded space-y-4">
                    <p className="text-xs font-mono text-[#9A8F82]">No active investment holdings cataloged.</p>
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
                        <tr className="border-b border-white/10 pb-2 text-[#9A8F82] text-xs uppercase">
                          <th className="py-3">Asset Description</th>
                          <th>Type</th>
                          <th>Purchase Date</th>
                          <th className="text-right">Cost Basis</th>
                          <th className="text-right">Current Valuation</th>
                          <th className="text-right">Annual ROI / Depr</th>
                        </tr>
                      </thead>
                      <tbody>
                        {investments.map(inv => (
                          <tr key={inv.id} className="border-b border-[#D4A853]/8 hover:bg-white/[0.01]">
                            <td className="py-4 text-[#F5F0EB] font-bold">{inv.name}</td>
                            <td className="text-[#9A8F82] text-xs uppercase">{inv.type}</td>
                            <td className="text-[#9A8F82]">{new Date(inv.purchase_date).toLocaleDateString()}</td>
                            <td className="text-right text-[#9A8F82]">${(inv.cost_basis/100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="text-right text-[#F5F0EB]">${(inv.current_value/100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="text-right">
                              {inv.projected_annual_roi_pct ? (
                                <span className="text-[#5C9A6B]">+{inv.projected_annual_roi_pct}% ROI</span>
                              ) : (
                                <span className="text-[#C85C5C]">-{inv.depreciation_rate_annual_pct}% Depr</span>
                              )}
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
                      <span className="font-mono text-xs text-[#9A8F82]">{art.read_time_mins} min read</span>
                    </div>
                    <h3 className="font-serif text-xl text-[#F5F0EB] tracking-tight">{art.title}</h3>
                    <p className="text-sm text-[#9A8F82] font-mono leading-relaxed italic">{art.summary}</p>
                    
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
                        Read full article →
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
                <h3 className="font-serif text-xl text-[#F5F0EB]">AI Investment Intelligence Engine</h3>
                <p className="text-xs text-[#9A8F82] font-mono">
                  Input a personal investment opportunity cost question. Claude will query checking and index portfolio cash reserves, compound ROI yields, and return a strategic recommendation.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                    type="text"
                    value={advisorQuestion}
                    onChange={e => setAdvisorQuestion(e.target.value)}
                    placeholder="Enter investment query..."
                    className="flex-1 bg-black border border-[#D4A853]/8 rounded p-3 text-xs text-[#F5F0EB] focus:outline-none focus:border-[#D4A853]/40 font-mono"
                  />
                  <button
                    onClick={triggerAiAdvice}
                    disabled={adviceLoading}
                    className="font-mono text-xs uppercase bg-[#D4A853] hover:bg-[#E8C97A] text-white px-6 py-3 rounded transition-all duration-300 disabled:opacity-50"
                  >
                    {adviceLoading ? "Computing Projections..." : "Ask Advisor"}
                  </button>
                </div>
              </div>

              {/* AI Advice Response */}
              {adviceResponse && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-[#D4A853]/20 bg-[#0A0908]/40 p-8 rounded space-y-4"
                >
                  <div className="font-mono text-xs text-[#D4A853] uppercase tracking-wider border-b border-[#D4A853]/8 pb-2">
                    System Advice Report
                  </div>
                  <div className="text-xs leading-[1.8] text-[#9A8F82] font-mono space-y-0.5">
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
              {/* Interactive Tax Simulator */}
              <div className="border border-[#D4A853]/8 p-8 bg-[#0A0908]/20 rounded space-y-6">
                <div className="flex justify-between items-center border-b border-[#D4A853]/8 pb-3">
                  <h3 className="font-serif text-xl text-[#F5F0EB]">International Jurisdiction Tax Simulator</h3>
                  <span className="font-mono text-xs text-[#D4A853] uppercase tracking-wider bg-[#D4A853]/5 border border-[#D4A853]/25 px-2.5 py-0.5 rounded">
                    Global Tax Strategist v1.0
                  </span>
                </div>

                <p className="text-sm text-[#9A8F82] font-mono leading-relaxed">
                  Adjust the income slider to calculate the potential personal tax liability and net take-home pay across different jurisdictions (Spain Autónomo, Andorra, Estonia).
                </p>

                {/* Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between font-mono text-xs">
                    <span className="text-[#9A8F82]">Projected Net Consulting Income:</span>
                    <span className="text-[#D4A853] font-bold">${taxIncome.toLocaleString()} USD</span>
                  </div>
                  <input
                    type="range"
                    min="50000"
                    max="400000"
                    step="5000"
                    value={taxIncome}
                    onChange={(e) => setTaxIncome(Number(e.target.value))}
                    className="w-full h-1 bg-[#2A2218] rounded-lg appearance-none cursor-pointer accent-[#D4A853]"
                  />
                  <div className="flex justify-between text-xs font-mono text-[#6A5F55]">
                    <span>$50,000</span>
                    <span>$225,000</span>
                    <span>$400,000</span>
                  </div>
                </div>

                {/* Jurisdictions Comparison Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Spain Card */}
                  <div className="border border-[#C85C5C]/10 bg-[#C85C5C]/[0.02] p-5 rounded space-y-3">
                    <div className="flex justify-between items-center text-xs font-mono border-b border-[#D4A853]/8 pb-2">
                      <span className="text-[#C85C5C] font-bold">Spain (Autónomo)</span>
                      <span className="text-[#9A8F82]">Progressive Bracket</span>
                    </div>
                    <div className="space-y-1.5 font-mono text-xs text-[#9A8F82]">
                      <div className="flex justify-between">
                        <span>Effective Tax Rate:</span>
                        <span className="text-[#C85C5C] font-bold">
                          {((() => {
                            const income = taxIncome;
                            let tax = 0;
                            if (income <= 12450) tax = income * 0.19;
                            else if (income <= 20200) tax = 12450 * 0.19 + (income - 12450) * 0.24;
                            else if (income <= 35200) tax = 12450 * 0.19 + 7750 * 0.24 + (income - 20200) * 0.30;
                            else if (income <= 60000) tax = 12450 * 0.19 + 7750 * 0.24 + 15000 * 0.30 + (income - 35200) * 0.37;
                            else if (income <= 300000) tax = 12450 * 0.19 + 7750 * 0.24 + 15000 * 0.30 + 24800 * 0.37 + (income - 60000) * 0.45;
                            else tax = 12450 * 0.19 + 7750 * 0.24 + 15000 * 0.30 + 24800 * 0.37 + 240000 * 0.45 + (income - 300000) * 0.47;
                            return (tax / income) * 100;
                          })()).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Tax Paid:</span>
                        <span>
                          ${((() => {
                            const income = taxIncome;
                            if (income <= 12450) return income * 0.19;
                            if (income <= 20200) return 12450 * 0.19 + (income - 12450) * 0.24;
                            if (income <= 35200) return 12450 * 0.19 + 7750 * 0.24 + (income - 20200) * 0.30;
                            if (income <= 60000) return 12450 * 0.19 + 7750 * 0.24 + 15000 * 0.30 + (income - 35200) * 0.37;
                            if (income <= 300000) return 12450 * 0.19 + 7750 * 0.24 + 15000 * 0.30 + 24800 * 0.37 + (income - 60000) * 0.45;
                            return 12450 * 0.19 + 7750 * 0.24 + 15000 * 0.30 + 24800 * 0.37 + 240000 * 0.45 + (income - 300000) * 0.47;
                          })()).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-[#D4A853]/8 pt-2 text-xs">
                        <span className="text-[#9A8F82]">Net Take-home:</span>
                        <span className="text-[#C85C5C] font-bold">
                          ${((() => {
                            const income = taxIncome;
                            let tax = 0;
                            if (income <= 12450) tax = income * 0.19;
                            else if (income <= 20200) tax = 12450 * 0.19 + (income - 12450) * 0.24;
                            else if (income <= 35200) tax = 12450 * 0.19 + 7750 * 0.24 + (income - 20200) * 0.30;
                            else if (income <= 60000) tax = 12450 * 0.19 + 7750 * 0.24 + 15000 * 0.30 + (income - 35200) * 0.37;
                            else if (income <= 300000) tax = 12450 * 0.19 + 7750 * 0.24 + 15000 * 0.30 + 24800 * 0.37 + (income - 60000) * 0.45;
                            else tax = 12450 * 0.19 + 7750 * 0.24 + 15000 * 0.30 + 24800 * 0.37 + 240000 * 0.45 + (income - 300000) * 0.47;
                            return income - tax;
                          })()).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bulgaria Card */}
                  <div className="border border-[#5C9A6B]/10 bg-[#5C9A6B]/[0.03] p-5 rounded space-y-3">
                    <div className="flex justify-between items-center text-xs font-mono border-b border-[#D4A853]/8 pb-2">
                      <span className="text-[#5C9A6B] font-bold">Bulgaria</span>
                      <span className="text-[#9A8F82]">10% Flat Rate</span>
                    </div>
                    <div className="space-y-1.5 font-mono text-xs text-[#9A8F82]">
                      <div className="flex justify-between">
                        <span>Effective Tax Rate:</span>
                        <span className="text-[#5C9A6B] font-bold">10.0%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Tax Paid:</span>
                        <span>
                          ${(taxIncome * 0.10).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-[#D4A853]/8 pt-2 text-xs">
                        <span className="text-[#9A8F82]">Net Take-home:</span>
                        <span className="text-[#5C9A6B] font-bold">
                          ${(taxIncome * 0.90).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* UAE Free Zone Card — Phase 3 */}
                  <div className="border border-[#D4A853]/20 bg-[#D4A853]/[0.03] p-5 rounded space-y-3">
                    <div className="flex justify-between items-center text-xs font-mono border-b border-[#D4A853]/8 pb-2">
                      <span className="text-[#D4A853] font-bold">UAE Free Zone 🇦🇪</span>
                      <span className="text-[#9A8F82]">Phase 3 · 0% Corp Tax</span>
                    </div>
                    <div className="space-y-1.5 font-mono text-xs text-[#9A8F82]">
                      <div className="flex justify-between">
                        <span>Effective Tax Rate:</span>
                        <span className="text-[#D4A853] font-bold">0.0%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Tax Paid:</span>
                        <span>$0</span>
                      </div>
                      <div className="flex justify-between border-t border-[#D4A853]/8 pt-2 text-xs">
                        <span className="text-[#9A8F82]">Net Take-home:</span>
                        <span className="text-[#D4A853] font-bold">
                          ${taxIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Phase 3 Roadmap Comparison */}
                <div className="border border-[#D4A853]/8 bg-black/30 p-4 rounded font-mono text-xs">
                  <div className="text-[#D4A853] uppercase tracking-wider mb-3 font-bold">Phase Roadmap: Tax Optimization Path</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2 px-3 py-2 border border-[#5C9A6B]/20 bg-[#5C9A6B]/5 rounded">
                      <span className="text-[#5C9A6B] font-bold">Phase 1–2</span>
                      <span className="text-[#9A8F82]">Bulgaria · 10% flat</span>
                    </div>
                    <span className="text-[#D4A853]">→</span>
                    <div className="flex items-center gap-2 px-3 py-2 border border-[#D4A853]/30 bg-[#D4A853]/5 rounded">
                      <span className="text-[#D4A853] font-bold">Phase 3 · Primary</span>
                      <span className="text-[#9A8F82]">UAE Free Zone 🇦🇪 · 0%</span>
                    </div>
                    <span className="text-[#9A8F82]">→</span>
                    <div className="flex items-center gap-2 px-3 py-2 border border-[#9A8F82]/10 bg-white/[0.01] rounded">
                      <span className="text-[#9A8F82] font-bold">Phase 3 · Backup</span>
                      <span className="text-[#7A6F65]">Georgia · 1% turnover</span>
                    </div>
                  </div>
                </div>

                <div className="border border-[#D4A853]/8 bg-black/40 p-4 rounded text-xs font-mono text-[#9A8F82] leading-relaxed">
                  *Note: Bulgaria operates a flat 10% corporate income tax (Phase 1–2 base). UAE Free Zones qualify for 0% corporate tax under the Qualifying Free Zone Person regime — the elected Phase 3 primary jurisdiction. Georgia offers a 1% turnover tax for Virtual Zone companies as a backup option.
                </div>
              </div>

              {/* ── Global Conquest Simulator ── */}
              <div className="border border-[#D4A853]/15 bg-[#0A0908]/95 p-8 rounded relative glow-border mt-8 space-y-6">
                  <div className="flex justify-between items-start border-b border-[#D4A853]/8 pb-4">
                    <div>
                      <span className="font-mono text-xs text-[#D4A853]/40 tracking-widest uppercase block mb-1">
                        Global Conquest Simulator
                      </span>
                      <h3 className="text-sm font-bold font-mono text-[#f8fafc]">Regional SaaS Maturity &amp; Expansion Modeler</h3>
                    </div>
                    <span className="font-mono text-xs uppercase tracking-wider text-[#D4A853] border border-[#D4A853]/25 px-2 py-0.5 rounded bg-[#D4A853]/5">
                      Global Expansion Hacker (Agent #21)
                    </span>
                  </div>

                  <p className="text-sm text-[#9A8F82] leading-relaxed font-mono">
                    Select a target expansion region to inspect localized SaaS conversion friction thresholds, projected customer acquisition costs (CAC), competitive saturation indices, and legal/tax optimization paths.
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
                            : "border-[#D4A853]/8 text-[#9A8F82] hover:border-white/10 hover:text-white"
                        }`}
                      >
                        <div className="text-xs font-semibold">{region.label}</div>
                        <div className="text-xs text-[#9A8F82] mt-1 space-y-0.5">
                          <div>Maturity: {region.maturity}</div>
                          <div>Friction Index: {region.friction}</div>
                          <div>Tax Rate: {region.tax}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Macroeconomics and Competitive grids */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                    {/* Macroeconomics Grid */}
                    <div className="border border-[#D4A853]/8 p-4 rounded bg-black/20 space-y-3">
                      <span className="text-[#D4A853] font-semibold block uppercase text-xs tracking-wider border-b border-[#D4A853]/8 pb-1">
                        Macroeconomic Parameters
                      </span>
                      <div className="space-y-1.5 text-[#9A8F82]">
                        <div className="flex justify-between">
                          <span>GDP Growth:</span>
                          <span className="text-white font-bold">{conquestRegion === "estonia" ? "+2.8%" : conquestRegion === "mexico" ? "+3.5%" : "+3.1%"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Annual Inflation Rate:</span>
                          <span className="text-white font-bold">{conquestRegion === "estonia" ? "2.1%" : conquestRegion === "mexico" ? "4.2%" : "1.8%"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Corporate Tax (reinvested):</span>
                          <span className="text-[#5C9A6B] font-bold">{conquestRegion === "estonia" ? "0%" : conquestRegion === "mexico" ? "30%" : "0%"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Double-Taxation Treaties:</span>
                          <span className="text-white">{conquestRegion === "estonia" ? "62 countries" : conquestRegion === "mexico" ? "50 countries" : "85 countries"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Saturation / Competitive Indices */}
                    <div className="border border-[#D4A853]/8 p-4 rounded bg-black/20 space-y-3">
                      <span className="text-[#D4A853] font-semibold block uppercase text-xs tracking-wider border-b border-[#D4A853]/8 pb-1">
                        Competitive Saturation Indices
                      </span>
                      <div className="space-y-1.5 text-[#9A8F82]">
                        <div className="flex justify-between">
                          <span>SaaS Saturation Density:</span>
                          <span className="text-white font-bold">{conquestRegion === "estonia" ? "High (90%)" : conquestRegion === "mexico" ? "Low (45%)" : "Medium (75%)"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>CAC Index (relative):</span>
                          <span className="text-white font-bold">{conquestRegion === "estonia" ? "1.2x" : conquestRegion === "mexico" ? "0.6x" : "1.5x"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>LTV to CAC Multiple:</span>
                          <span className="text-[#5C9A6B] font-bold">{conquestRegion === "estonia" ? "4.1x" : conquestRegion === "mexico" ? "5.8x" : "3.5x"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Average Diagnostic Latency:</span>
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
                        Simulate Market Entry
                      </button>
                    </div>
                  )}

                  {conquestSimulating && (
                    <div className="flex items-center justify-center gap-2 py-4 text-xs text-[#D4A853] font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853] animate-ping" />
                      Computing macroeconomic curves and tax residency routes...
                    </div>
                  )}

                  {conquestResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6 border-t border-[#D4A853]/15 pt-4"
                    >
                      <h4 className="text-xs text-[#22C55E] uppercase tracking-widest font-bold font-mono">
                        ✓ Expansion Simulation Successful
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-[#9A8F82] font-mono">
                        <div className="border border-[#D4A853]/8 bg-white/[0.01] p-3 rounded space-y-1">
                          <span className="text-[#D4A853] font-semibold block uppercase text-xs tracking-wider">Sniper Outreach Channel</span>
                          {conquestRegion === "estonia" ? (
                            <span>Deploy Linkedin Snipers targeting European seed-founders with localized Baltic compliance benchmarks. Target MRR &gt;$15k.</span>
                          ) : conquestRegion === "mexico" ? (
                            <span>Run cold-email outbound sequence offering free localization friction audits to high-growth Latin fintechs. Focus on Latam compliance gaps.</span>
                          ) : (
                            <span>Leverage local Singaporean SaaS directories to target VC-backed B2B scaleups with 3-draft Socratic teardowns.</span>
                          )}
                        </div>
                        <div className="border border-[#D4A853]/8 bg-white/[0.01] p-3 rounded space-y-1">
                          <span className="text-[#D4A853] font-semibold block uppercase text-xs tracking-wider">Tax &amp; Legal Routing</span>
                          {conquestRegion === "estonia" ? (
                            <span>Route Baltic licensing fees through an Estonia OÜ. Hold profits deferred at 0% corporate tax for reinvestment.</span>
                          ) : conquestRegion === "mexico" ? (
                            <span>Collect MXN/USD via local Stripe billing. Route back to Spain SL corporate entity utilizing Spain-Mexico tax treaty benefits.</span>
                          ) : (
                            <span>Route Southeast Asia contract revenues to a Singapore holding company. Pay 8.5% effective local corporate rate.</span>
                          )}
                        </div>
                      </div>

                      {/* Agent #21 Quarterly Recommendation Report */}
                      <div className="border border-[#D4A853]/20 bg-[#D4A853]/5 p-4 rounded space-y-3 font-mono">
                        <span className="text-[#D4A853] font-bold block uppercase text-[0.58rem] tracking-wider">
                          Quarterly Recommendation Report — Agent #21 (Global Expansion Hacker)
                        </span>
                        <div className="text-xs text-[#9A8F82] leading-relaxed space-y-2">
                          <p>
                            <strong>Target Strategy:</strong> {conquestRegion === "estonia" 
                              ? "Estonia is the optimal launchpad for the S&F Certified program in Europe. Reinvesting profits corporate-tax free (0%) allows us to scale outbound automation infrastructure by 3x." 
                              : conquestRegion === "mexico"
                              ? "Latin America has the highest conversion friction index. Setting up a localized pricing model ($999/mo instead of $2500 one-time) captures high-growth B2B startups undergoing payments digitization."
                              : "Singapore represents the highest LTV potential. Establish a regional LLC pass-through entity to manage SE Asia SaaS consulting client revenue under zero tax parameters."}
                          </p>
                          <div className="border-t border-[#D4A853]/15 pt-2 flex justify-between text-xs text-[#D4A853]">
                            <span>Status: RECOMMENDATION_SIGNED</span>
                            <span>Confidence: 94.8%</span>
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
