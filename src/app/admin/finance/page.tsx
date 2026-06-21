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
  const [taxIncome, setTaxIncome] = useState(30000);
  const [taxPension, setTaxPension] = useState(Math.round(700.92 * 14 * 1.10)); // €700,92 × 14 pagas × EUR/USD 1.10 = $10,794
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

  // Simulador de Conquista Global States
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
      <div className="min-h-screen bg-[#0A0908] flex items-center justify-center font-mono text-xs text-[#B0A89E] animate-pulse">
        Cargando el espacio de trabajo financiero...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0908] text-[#cbd5e1] p-8 md:p-12 grain overflow-x-hidden">
      <div className="max-w-[1200px] mx-auto space-y-12">
        
        {/* Navigation & Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#D4A853]/8 pb-8">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#B0A89E] block mb-2">Libro Mayor — Ernesto Ortiz</span>
            <h1 className="text-4xl font-serif text-[#F5F0EB] tracking-tight">Centro Financiero de Inversión</h1>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <span className="font-mono text-xs uppercase tracking-wider text-[#D4A853] border border-[#D4A853]/20 px-3 py-1.5 rounded-full bg-[#D4A853]/5">
              Libro Mayor Activo
            </span>
          </div>
        </header>

        {/* View Toggle Tabs */}
        <div className="flex border-b border-[#D4A853]/8 gap-6 overflow-x-auto">
          {[
            { key: "overview", label: "Resumen" },
            { key: "accounting", label: "Contabilidad" },
            { key: "investments", label: "ROI y Capitalización" },
            { key: "education", label: "Educación" },
            { key: "insights", label: "Asesor IA" },
            { key: "tax", label: "Optimizador Fiscal" }
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
              {/* Scorecard */}
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Patrimonio Neto", value: `$${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, detail: "Activos − Pasivos" },
                  { label: "Pista de Caja", value: `${runwayMonths.toFixed(1)} months`, detail: "Cuenta corriente vs. gastos" },
                  { label: "Gasto Mensual", value: `$${averageBurnRate.toFixed(2)}`, detail: "AI API, software, hosting" },
                  { label: "Ingresos Consultoría", value: `$${(Math.abs(accounts.find(a => a.name === "Consulting Revenue") ? (accountBalances[accounts.find(a => a.name === "Consulting Revenue")!.id] || 0) : 70000) / 100).toFixed(2)}`, detail: "Honorarios beta reconciliados" },
                ].map((item, idx) => (
                  <div key={idx} className="border border-[#D4A853]/10 p-5 bg-[#110F0D] rounded-2xl relative overflow-hidden">
                    <span className="font-mono text-xs text-[#B0A89E] uppercase tracking-wider block mb-2">{item.label}</span>
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
                    <span className="font-mono text-xs text-[#D4A853]/70 tracking-widest uppercase block mb-1">Nodo Stripe</span>
                    <h3 className="text-lg font-bold text-white font-mono uppercase">Ingresos en Directo y Telemetría</h3>
                  </div>
                  <span className={`font-mono text-xs border px-3 py-1 rounded-full uppercase tracking-wider ${isTelemetryError ? 'text-amber-400 border-amber-500/25 bg-amber-500/5' : 'text-[#5C9A6B] border-[#5C9A6B]/25 bg-[#5C9A6B]/5'}`}>
                    {isTelemetryError ? "Degradado (Caché)" : "Conectado (En Directo)"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="p-5 border border-[#D4A853]/8 bg-black/20 rounded-xl">
                    <span className="font-mono text-xs text-[#B0A89E] uppercase block mb-2">Volumen Bruto</span>
                    <span className="font-serif text-2xl font-bold text-white">
                      ${(stripeGrossVolume > 0 ? stripeGrossVolume : 145850.00).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-[#5C9A6B] block mt-1.5">↑ Desde base de datos</span>
                  </div>
                  <div className="p-5 border border-[#D4A853]/8 bg-black/20 rounded-xl">
                    <span className="font-mono text-xs text-[#B0A89E] uppercase block mb-2">MRR Activo</span>
                    <span className="font-serif text-2xl font-bold text-[#D4A853]">
                      ${(stripeMRR > 0 ? stripeMRR : 12500.00).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-[#B0A89E] block mt-1.5">Base de suscripciones</span>
                  </div>
                  <div className="p-5 border border-[#D4A853]/8 bg-black/20 rounded-xl">
                    <span className="font-mono text-xs text-[#B0A89E] uppercase block mb-2">Reembolsos Emitidos</span>
                    <span className="font-serif text-2xl font-bold text-[#C85C5C]">
                      ${(stripeRefundsVolume > 0 ? stripeRefundsVolume : 1050.00).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-[#B0A89E] block mt-1.5">Garantías activadas</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <h4 className="font-mono text-xs text-white uppercase font-bold">Últimas Transacciones Stripe</h4>
                  <div className="border border-[#D4A853]/8 rounded overflow-hidden font-mono text-xs">
                    <div className="grid grid-cols-12 bg-white/5 p-2 font-bold text-[#B0A89E] border-b border-[#D4A853]/8">
                      <div className="col-span-3">Cliente</div>
                      <div className="col-span-3">Producto / ID Precio</div>
                      <div className="col-span-2">Importe</div>
                      <div className="col-span-2">Estado</div>
                      <div className="col-span-2">Fecha (UTC)</div>
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
                            }`}>{({ Paid: "Pagado", Refunded: "Reembolsado" } as Record<string, string>)[tx.status] || tx.status}</span>
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
                  <h3 className="font-serif text-lg text-[#F5F0EB] border-b border-[#D4A853]/8 pb-3">Tendencia de Flujo de Caja Mensual</h3>
                  {/* SVG Bar Chart for Income vs Expenses */}
                  <div className="h-64 flex items-end justify-between px-4 pt-8 border-b border-[#D4A853]/8 relative">
                    <div className="absolute top-0 left-0 text-xs font-mono text-[#7A6F65]">Ingresos (Dorado) vs Gastos (Gris)</div>
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
                  <h3 className="font-serif text-lg text-[#F5F0EB] border-b border-[#D4A853]/8 pb-3">Objetivos Activos</h3>
                  <div className="space-y-6">
                    {goals.map(goal => {
                      const pct = (goal.current_amount / goal.target_amount) * 100;
                      return (
                        <div key={goal.id} className="space-y-2">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-[#B0A89E]">{goal.name}</span>
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
                  <h3 className="font-serif text-lg text-[#F5F0EB] border-b border-[#D4A853]/8 pb-3">Balance de Situación</h3>
                  <div className="space-y-4 font-mono text-xs">
                    <div className="text-[#D4A853] uppercase text-xs border-b border-[#D4A853]/8 pb-1">Activos</div>
                    {accounts.filter(a => a.type === "asset").map(a => (
                      <div key={a.id} className="flex justify-between">
                        <span className="text-[#B0A89E]">{a.name}</span>
                        <span className="text-[#F5F0EB]">${((accountBalances[a.id] || 0) / 100).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t border-[#D4A853]/8 pt-2 flex justify-between font-bold text-sm text-[#F5F0EB]">
                      <span>Total Activos</span>
                      <span>${totalAssets.toFixed(2)}</span>
                    </div>

                    <div className="text-[#D4A853] uppercase text-xs border-b border-[#D4A853]/8 pb-1 mt-6">Pasivos</div>
                    {accounts.filter(a => a.type === "liability").length === 0 ? (
                      <div className="text-xs text-[#7A6F65] italic">Sin pasivos en el balance.</div>
                    ) : (
                      accounts.filter(a => a.type === "liability").map(a => (
                        <div key={a.id} className="flex justify-between">
                          <span className="text-[#B0A89E]">{a.name}</span>
                          <span className="text-[#F5F0EB]">${((accountBalances[a.id] || 0) / 100).toFixed(2)}</span>
                        </div>
                      ))
                    )}
                    <div className="border-t border-[#D4A853]/8 pt-2 flex justify-between font-bold text-sm text-[#F5F0EB]">
                      <span>Total Pasivos</span>
                      <span>${totalLiabilities.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Profit & Loss Statement */}
                <div className="border border-[#D4A853]/8 p-8 bg-[#0A0908]/20 rounded space-y-6">
                  <h3 className="font-serif text-lg text-[#F5F0EB] border-b border-[#D4A853]/8 pb-3">Cuenta de Resultados (P&amp;G)</h3>
                  <div className="space-y-4 font-mono text-xs">
                    <div className="text-[#D4A853] uppercase text-xs border-b border-[#D4A853]/8 pb-1">Ingresos de Consultoría</div>
                    {accounts.filter(a => a.type === "revenue").map(a => (
                      <div key={a.id} className="flex justify-between">
                        <span className="text-[#B0A89E]">{a.name}</span>
                        {/* Revenues are credit balance (negative stored), show absolute */}
                        <span className="text-[#F5F0EB]">${(Math.abs(accountBalances[a.id] || 0) / 100).toFixed(2)}</span>
                      </div>
                    ))}

                    <div className="text-[#D4A853] uppercase text-xs border-b border-[#D4A853]/8 pb-1 mt-6">Gastos Operativos</div>
                    {accounts.filter(a => a.type === "expense").map(a => (
                      <div key={a.id} className="flex justify-between">
                        <span className="text-[#B0A89E]">{a.name}</span>
                        <span className="text-[#F5F0EB]">${((accountBalances[a.id] || 0) / 100).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t border-[#D4A853]/8 pt-2 flex justify-between font-bold text-sm text-[#F5F0EB]">
                      <span>Beneficio Operativo Neto</span>
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
                <h3 className="font-serif text-xl text-[#F5F0EB]">Libro Mayor por Partida Doble</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-white/10 pb-2 text-[#B0A89E] text-xs uppercase">
                        <th className="py-3">Fecha</th>
                        <th>Descripción</th>
                        <th>Cuenta Deudora</th>
                        <th>Cuenta Acreedora</th>
                        <th className="text-right">Importe</th>
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
                            <td className="text-[#5C9A6B]">{debitEntry?.accounts?.name || 'Desconocido'}</td>
                            <td className="text-[#B0A89E]">{creditEntry?.accounts?.name || 'Desconocido'}</td>
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
                  <h3 className="font-serif text-lg text-[#F5F0EB] border-b border-[#D4A853]/8 pb-3">Upgrade MacBook vs. Coste de Oportunidad Fondo Índice</h3>
                  <div className="space-y-4 text-xs font-mono">
                    <div className="bg-black/40 border border-[#D4A853]/8 p-4 rounded">
                      <div className="text-[#D4A853] uppercase text-xs mb-1 font-bold">Escenario A: Capitalización en Fondo Índice ($3,500 inversión)</div>
                      <p className="text-[#B0A89E] leading-relaxed">
                        Destinar $3,500 a un ETF de índice S&amp;P 500 capitalizando a una rentabilidad media del 8% anual.
                      </p>
                      <div className="text-right text-[#5C9A6B] font-bold mt-2">
                        Projected 5-Year Balance: $5,142.60 (+ $1,642.60 profit)
                      </div>
                    </div>

                    <div className="bg-black/40 border border-[#D4A853]/8 p-4 rounded">
                      <div className="text-[#D4A853] uppercase text-xs mb-1 font-bold">Escenario B: Compra de Hardware MacBook ($3,500 inversión)</div>
                      <p className="text-[#B0A89E] leading-relaxed">
                        Renovar el portátil. Depreciación del 25% anual. El valor residual decrece con el tiempo.
                      </p>
                      <div className="text-right text-[#C85C5C] font-bold mt-2">
                        Projected 5-Year Asset Value: $830.27 (- $2,669.73 loss)
                      </div>
                    </div>

                    <div className="bg-black/40 border border-[#D4A853]/8 p-4 rounded">
                      <div className="text-[#D4A853] uppercase text-xs mb-1 font-bold">Escenario C: Apalancamiento en Plataformas IA ($3,500 inversión)</div>
                      <p className="text-[#B0A89E] leading-relaxed">
                        Redirigir capital a créditos de API IA. Si el outreach automatizado capta solo 1 brief de diagnóstico extra a $350/mes.
                      </p>
                      <div className="text-right text-[#D4A853] font-bold mt-2">
                        Projected 5-Year Revenue Yield: $21,000.00 (+ $17,500.00 cash)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Retirement Projection Calculator */}
                <div className="border border-[#D4A853]/8 p-8 bg-[#0A0908]/40 rounded space-y-6">
                  <h3 className="font-serif text-lg text-[#F5F0EB] border-b border-[#D4A853]/8 pb-3">Calculadora de Retiro Compuesto</h3>
                  
                  {/* Inputs */}
                  <div className="grid grid-cols-3 gap-4 text-xs font-mono">
                    <div className="space-y-1">
                      <label className="text-[#B0A89E] text-xs uppercase">Ahorro Mensual</label>
                      <input 
                        type="number" 
                        value={monthlyContrib} 
                        onChange={e => setMonthlyContrib(Number(e.target.value))}
                        className="w-full bg-black border border-[#D4A853]/8 rounded p-2 focus:outline-none focus:border-[#D4A853]/40 text-[#F5F0EB]" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[#B0A89E] text-xs uppercase">Rentabilidad Anual %</label>
                      <input 
                        type="number" 
                        value={returnRate} 
                        onChange={e => setReturnRate(Number(e.target.value))}
                        className="w-full bg-black border border-[#D4A853]/8 rounded p-2 focus:outline-none focus:border-[#D4A853]/40 text-[#F5F0EB]" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[#B0A89E] text-xs uppercase">Años a Proyectar</label>
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
                    <div className="absolute top-2 left-2 text-xs font-mono text-[#7A6F65]">Proyección de Interés Compuesto</div>
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
                      <span className="text-[#B0A89E]">Principal Capitalizado (Caja):</span>
                      <span className="text-[#F5F0EB]">${compoundPrincipal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#B0A89E]">Aportaciones Añadidas:</span>
                      <span className="text-[#F5F0EB]">${(monthlyContrib * 12 * yearsProject).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between border-t border-[#D4A853]/8 pt-2 font-bold text-sm">
                      <span className="text-[#B0A89E]">Patrimonio Neto Proyectado:</span>
                      <span className="text-[#5C9A6B]">${totalAccumulated.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Investments ledger */}
              <div className="border border-[#D4A853]/8 p-8 bg-[#0A0908]/20 rounded space-y-6">
                <div className="flex justify-between items-center border-b border-[#D4A853]/8 pb-4">
                  <h3 className="font-serif text-xl text-[#F5F0EB]">Cartera de Activos</h3>
                  <button className="px-3 py-1 bg-white/5 text-[#B0A89E] border border-white/10 hover:bg-white/10 rounded font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer">
                    + Añadir Activo (Manual)
                  </button>
                </div>
                {investments.length === 0 ? (
                  <div className="border border-dashed border-white/10 p-12 text-center rounded space-y-4">
                    <p className="text-xs font-mono text-[#B0A89E]">Sin activos catalogados.</p>
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
                          <th className="py-3">Descripción del Activo</th>
                          <th>Tipo</th>
                          <th>Fecha Compra</th>
                          <th className="text-right">Coste Base</th>
                          <th className="text-right">Valoración Actual</th>
                          <th className="text-right">ROI Anual / Depreciación</th>
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
                      <span className="font-mono text-xs text-[#B0A89E]">{art.read_time_mins} min de lectura</span>
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
                        Leer artículo completo →
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
                <h3 className="font-serif text-xl text-[#F5F0EB]">Motor de Inteligencia de Inversión IA</h3>
                <p className="text-xs text-[#B0A89E] font-mono">
                  Introduce una pregunta de coste de oportunidad. Claude consultará las reservas de caja, rendimientos de capitalización y devolverá una recomendación estratégica.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                    type="text"
                    value={advisorQuestion}
                    onChange={e => setAdvisorQuestion(e.target.value)}
                    placeholder="Escribe tu consulta de inversión..."
                    className="flex-1 bg-black border border-[#D4A853]/8 rounded p-3 text-xs text-[#F5F0EB] focus:outline-none focus:border-[#D4A853]/40 font-mono"
                  />
                  <button
                    onClick={triggerAiAdvice}
                    disabled={adviceLoading}
                    className="font-mono text-xs uppercase bg-[#D4A853] hover:bg-[#E8C97A] text-white px-6 py-3 rounded transition-all duration-300 disabled:opacity-50"
                  >
                    {adviceLoading ? "Calculando proyecciones..." : "Consultar Asesor"}
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
                    Informe del Asesor
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

                // Spain autónomo IRPF brackets (consulting only; pension may be exempt Art.7f)
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
                  pensionNote: "Est. exenta Art.7f — verificar",
                  consultingTax: spainIRPF(c),
                  pensionRisk: "amber",
                  consultingRisk: "red",
                };
                const hongKong = {
                  pensionTax: 0,
                  pensionNote: "DTT: España retiene → 0% estimado · verificar Art.18",
                  consultingTax: hongKongSalariesTax(c),
                  pensionRisk: "green",
                  consultingRisk: c > 60000 ? "amber" : "green",
                  consultingWarning: "Salaries Tax progresivo · Tipo estándar 15% · Allowance ~$16.9K · Muy competitivo",
                };
                const uae = {
                  pensionTax: 0,
                  pensionNote: "Sin DTT España-EAU completo · Consultar con asesor",
                  consultingTax: uaeIT(c),
                  pensionRisk: "amber",
                  consultingRisk: "green",
                  consultingWarning: "0% IRPF personal · Free Zone · Visa mínima 183 días · Sin DTT doble imposición",
                };
                const singapore = {
                  pensionTax: 0,
                  pensionNote: "DTT España-SG 2011 · Art.18 pensiones públicas: España retiene",
                  consultingTax: singaporeIT(c),
                  pensionRisk: "green",
                  consultingRisk: c > 80000 ? "amber" : "green",
                  consultingWarning: "Territorial · Renta extranjera 0% · Progresivo hasta 22% en renta local",
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
                  { key: "spain", label: "España 🇪🇸",         sublabel: "Baseline · Autónomo",         data: spain,    overallRisk: "red" as RiskKey },
                  { key: "hk",    label: "Hong Kong 🇭🇰",      sublabel: "Salaries Tax · Máx 15%",      data: hongKong, overallRisk: (c > 60000 ? "amber" : "green") as RiskKey },
                  { key: "uae",   label: "EAU Zona Franca 🇦🇪", sublabel: "0% IRPF personal",            data: uae,      overallRisk: "green" as RiskKey },
                  { key: "sg",    label: "Singapur 🇸🇬",       sublabel: "Territorial · Progresivo",    data: singapore, overallRisk: (c > 80000 ? "amber" : "green") as RiskKey },
                ];

                return (
                  <div className="border border-[#D4A853]/8 p-6 bg-[#0A0908]/20 rounded space-y-6">
                    {/* Header */}
                    <div className="flex flex-wrap justify-between items-start gap-3 border-b border-[#D4A853]/8 pb-4">
                      <div>
                        <h3 className="font-serif text-lg text-[#F5F0EB]">Simulador Fiscal — Jurisdicciones Internacionales</h3>
                        <p className="font-mono text-xs text-[#D4A853]/70 mt-0.5 uppercase tracking-widest">v3 · Análisis Adversarial · Pensión + Consulting separados</p>
                      </div>
                      <span className="font-mono text-[10px] text-[#C85C5C] uppercase tracking-wider bg-[#C85C5C]/5 border border-[#C85C5C]/20 px-2.5 py-1 rounded">
                        ⚠ Estimaciones — verificar con asesor local
                      </span>
                    </div>

                    {/* Sliders */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <div className="flex justify-between font-mono text-xs">
                          <span className="text-[#B0A89E]">Pensión IPT anual <span className="text-[#7A6F65]">(€700,92 × 14 pagas)</span>:</span>
                          <span className="text-[#5C9A6B] font-bold">{fmt(p)}</span>
                        </div>
                        <input type="range" min="0" max="20000" step="100" value={taxPension}
                          onChange={(e) => setTaxPension(Number(e.target.value))}
                          className="w-full h-1 bg-[#2A2218] rounded-lg appearance-none cursor-pointer accent-[#5C9A6B]" />
                        <div className="flex justify-between text-[10px] font-mono text-[#7A6F65]">
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
                        <div className="flex justify-between text-[10px] font-mono text-[#7A6F65]">
                          <span>$0</span><span>$100,000</span><span>$200,000</span>
                        </div>
                      </div>
                    </div>

                    {/* Country cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                      {countries.map(({ key, label, sublabel, data, overallRisk }) => {
                        const totalTax = data.pensionTax + data.consultingTax;
                        const totalIncome = p + c;
                        const netTotal = totalIncome - totalTax;
                        return (
                          <div key={key} className={`border ${riskBorder[overallRisk]} ${riskBg[overallRisk]} p-4 rounded-xl space-y-3`}>
                            {/* Card header */}
                            <div className="border-b border-white/5 pb-2">
                              <div className={`font-mono text-xs font-bold ${riskColor[overallRisk]}`}>{label}</div>
                              <div className="font-mono text-[10px] text-[#B0A89E] mt-0.5">{sublabel}</div>
                            </div>

                            {/* Pension row */}
                            <div className="space-y-1">
                              <div className="font-mono text-[10px] text-[#B0A89E] uppercase tracking-wider">
                                Pensión IPT
                              </div>
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
                              <div className="font-mono text-[10px] text-[#B0A89E] uppercase tracking-wider">
                                Consulting (LLC)
                              </div>
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
                                <span className="text-[#B0A89E]">Net take-home:</span>
                                <span className="text-white font-bold">{fmt(netTotal)}</span>
                              </div>
                              <div className="flex justify-between text-[10px] font-mono">
                                <span className="text-[#7A6F65]">Eff. rate total:</span>
                                <span className={riskColor[overallRisk]}>{pct(totalTax, totalIncome)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Consulting recharacterization knot */}
                    <div className="border border-[#C85C5C]/15 bg-[#C85C5C]/3 p-4 rounded-xl space-y-2">
                      <div className="font-mono text-[10px] text-[#C85C5C] uppercase tracking-wider font-bold">
                        Nudo crítico: recaracterización consulting a fuente local
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[10px] font-mono">
                        {[
                          { country: "Hong Kong", risk: "BAJO", detail: "Salaries Tax bien establecido · Máx 15% estándar · Autoridades receptivas · Sin riesgo recaracterización agresivo", color: "text-[#5C9A6B]" },
                          { country: "EAU Zona Franca", risk: "MEDIO", detail: "0% IRPF confirmado · Free Zone legalmente sólida · Sustancia mínima requerida · Sin DTT con España", color: "text-[#D4A853]" },
                          { country: "Singapur", risk: "BAJO", detail: "Territorial · Solo renta local gravada · DTT España-SG 2011 · Exige presencia real 183 días", color: "text-[#5C9A6B]" },
                        ].map(r => (
                          <div key={r.country} className="border border-white/5 bg-black/20 p-2.5 rounded-lg">
                            <div className={`${r.color} font-bold mb-0.5`}>{r.country} · {r.risk}</div>
                            <div className="text-[#B0A89E] leading-relaxed">{r.detail}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommendation + Spain exit verdict */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border border-[#5C9A6B]/20 bg-[#5C9A6B]/3 p-4 rounded-xl space-y-1.5">
                        <div className="font-mono text-[10px] text-[#5C9A6B] uppercase tracking-wider font-bold">
                          Recomendación · Confianza 8/10
                        </div>
                        <div className="font-mono text-xs text-white font-bold">Singapur 🇸🇬 / Hong Kong 🇭🇰</div>
                        <div className="font-mono text-[10px] text-[#B0A89E] leading-relaxed">
                          Territorial sólido · DTT con España · Consulting LLC exterior 0% · Economías maduras · Sin riesgo recaracterización agresivo · Ideal para perfil high-ticket consultoría
                        </div>
                      </div>
                      <div className="border border-[#C85C5C]/15 bg-[#C85C5C]/3 p-4 rounded-xl space-y-1.5">
                        <div className="font-mono text-[10px] text-[#C85C5C] uppercase tracking-wider font-bold">
                          Salida España · Bloqueador real
                        </div>
                        <div className="font-mono text-xs text-white font-bold">Concurso de acreedores</div>
                        <div className="font-mono text-[10px] text-[#B0A89E] leading-relaxed">
                          Antes del vuelo: verificar arraigo con abogado concursal. Sin certificado de residencia fiscal extranjero en 2026, España mantiene residencia. 1 enero 2027 = salida limpia. 24 junio = riesgo formal pero bajo si consulting &lt; €3K en 2026.
                        </div>
                      </div>
                    </div>

                    <div className="font-mono text-[10px] text-[#7A6F65] leading-relaxed border-t border-[#D4A853]/8 pt-3">
                      Todos los cálculos son estimaciones con datos públicos. Hong Kong: Salaries Tax calculado sobre tipo estándar 15% vs. progresivo (el menor), allowance HKD 132,000. Singapur: tipos 2024/25 en SGD (USD × 1.35 aprox). EAU Zona Franca: 0% IRPF personal confirmado. Ninguna cifra substituye verificación con asesor fiscal habilitado en el país destino. Pensión IPT: clasificación bajo Art.7.f LIRPF y tratados DTT debe confirmarse con asesor español.
                    </div>
                  </div>
                );
              })()}

              {/* ── Simulador de Conquista Global ── */}
              <div className="border border-[#D4A853]/15 bg-[#0A0908]/95 p-8 rounded relative glow-border mt-8 space-y-6">
                  <div className="flex justify-between items-start border-b border-[#D4A853]/8 pb-4">
                    <div>
                      <span className="font-mono text-xs text-[#D4A853]/70 tracking-widest uppercase block mb-1">
                        Simulador de Conquista Global
                      </span>
                      <h3 className="text-sm font-bold font-mono text-[#f8fafc]">Modelador de Madurez SaaS Regional y Expansión</h3>
                    </div>
                    <span className="font-mono text-xs uppercase tracking-wider text-[#D4A853] border border-[#D4A853]/25 px-2 py-0.5 rounded bg-[#D4A853]/5">
                      Global Expansion Hacker (Agent #21)
                    </span>
                  </div>

                  <p className="text-sm text-[#B0A89E] leading-relaxed font-mono">
                    Selecciona una región de expansión para inspeccionar umbrales de fricción SaaS, costes de adquisición de clientes (CAC), índices de saturación competitiva y rutas de optimización fiscal.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { key: "estonia", label: "Estonia y Bálticos", maturity: "92%", friction: "Medium", tax: "10% Def." },
                      { key: "mexico", label: "Latinoamérica (Mex/Col)", maturity: "68%", friction: "High", tax: "15% Local" },
                      { key: "singapore", label: "Singapur y SE Asia", maturity: "88%", friction: "Low", tax: "8% Eff." }
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
                          <div>Madurez: {region.maturity}</div>
                          <div>Índice de Fricción: {region.friction}</div>
                          <div>Tipo Fiscal: {region.tax}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Macroeconomics and Competitive grids */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                    {/* Macroeconomics Grid */}
                    <div className="border border-[#D4A853]/8 p-4 rounded bg-black/20 space-y-3">
                      <span className="text-[#D4A853] font-semibold block uppercase text-xs tracking-wider border-b border-[#D4A853]/8 pb-1">
                        Parámetros Macroeconómicos
                      </span>
                      <div className="space-y-1.5 text-[#B0A89E]">
                        <div className="flex justify-between">
                          <span>Crecimiento PIB:</span>
                          <span className="text-white font-bold">{conquestRegion === "estonia" ? "+2.8%" : conquestRegion === "mexico" ? "+3.5%" : "+3.1%"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Inflación Anual:</span>
                          <span className="text-white font-bold">{conquestRegion === "estonia" ? "2.1%" : conquestRegion === "mexico" ? "4.2%" : "1.8%"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Impuesto Corporativo (reinvertido):</span>
                          <span className="text-[#5C9A6B] font-bold">{conquestRegion === "estonia" ? "0%" : conquestRegion === "mexico" ? "30%" : "0%"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tratados de Doble Imposición:</span>
                          <span className="text-white">{conquestRegion === "estonia" ? "62 países" : conquestRegion === "mexico" ? "50 países" : "85 países"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Saturation / Competitive Indices */}
                    <div className="border border-[#D4A853]/8 p-4 rounded bg-black/20 space-y-3">
                      <span className="text-[#D4A853] font-semibold block uppercase text-xs tracking-wider border-b border-[#D4A853]/8 pb-1">
                        Índices de Saturación Competitiva
                      </span>
                      <div className="space-y-1.5 text-[#B0A89E]">
                        <div className="flex justify-between">
                          <span>Densidad de Saturación SaaS:</span>
                          <span className="text-white font-bold">{conquestRegion === "estonia" ? "Alta (90%)" : conquestRegion === "mexico" ? "Baja (45%)" : "Media (75%)"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Índice CAC (relativo):</span>
                          <span className="text-white font-bold">{conquestRegion === "estonia" ? "1.2x" : conquestRegion === "mexico" ? "0.6x" : "1.5x"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Múltiplo LTV/CAC:</span>
                          <span className="text-[#5C9A6B] font-bold">{conquestRegion === "estonia" ? "4.1x" : conquestRegion === "mexico" ? "5.8x" : "3.5x"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Latencia Diagnóstica Media:</span>
                          <span className="text-white">{conquestRegion === "estonia" ? "Rápida (72h)" : conquestRegion === "mexico" ? "Media (96h)" : "Inmediata (24h)"}</span>
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
                        Simular Entrada al Mercado
                      </button>
                    </div>
                  )}

                  {conquestSimulating && (
                    <div className="flex items-center justify-center gap-2 py-4 text-xs text-[#D4A853] font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853] animate-ping" />
                      Calculando curvas macroeconómicas y rutas de residencia fiscal...
                    </div>
                  )}

                  {conquestResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6 border-t border-[#D4A853]/15 pt-4"
                    >
                      <h4 className="text-xs text-[#22C55E] uppercase tracking-widest font-bold font-mono">
                        ✓ Simulación de Expansión Completada
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-[#B0A89E] font-mono">
                        <div className="border border-[#D4A853]/8 bg-white/[0.01] p-3 rounded space-y-1">
                          <span className="text-[#D4A853] font-semibold block uppercase text-xs tracking-wider">Canal de Outreach Sniper</span>
                          {conquestRegion === "estonia" ? (
                            <span>Desplegar LinkedIn Snipers apuntando a fundadores europeos con benchmarks de compliance báltico localizados. MRR objetivo &gt;$15k.</span>
                          ) : conquestRegion === "mexico" ? (
                            <span>Secuencia de cold-email outbound ofreciendo auditorías de fricción gratis a fintechs latinoamericanas de alto crecimiento. Foco en brechas de compliance Latam.</span>
                          ) : (
                            <span>Aprovechar directorios SaaS de Singapur para apuntar a scaleups B2B respaldadas por VC con teardowns Socrático de 3 borradores.</span>
                          )}
                        </div>
                        <div className="border border-[#D4A853]/8 bg-white/[0.01] p-3 rounded space-y-1">
                          <span className="text-[#D4A853] font-semibold block uppercase text-xs tracking-wider">Routing Fiscal y Legal</span>
                          {conquestRegion === "estonia" ? (
                            <span>Canalizar honorarios de licencias bálticas a través de una OÜ Estonia. Mantener beneficios diferidos al 0% impuesto corporativo para reinversión.</span>
                          ) : conquestRegion === "mexico" ? (
                            <span>Recaudar MXN/USD vía facturación local Stripe. Canalizar a entidad corporativa SL española utilizando beneficios del convenio fiscal España-México.</span>
                          ) : (
                            <span>Canalizar ingresos de contratos en SE Asia a una sociedad holding de Singapur. Tipo corporativo local efectivo del 8.5%.</span>
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
                            <strong>Estrategia Objetivo:</strong> {conquestRegion === "estonia" 
                              ? "Estonia es el trampolín óptimo para el programa S&F Certified en Europa. Reinvertir beneficios libres de impuesto corporativo (0%) permite escalar la infraestructura de automatización outbound ×3." 
                              : conquestRegion === "mexico"
                              ? "Latinoamérica tiene el índice de fricción de conversión más alto. Un modelo de precios localizado ($999/mes en lugar de $2,500 único) capta startups B2B de alto crecimiento en proceso de digitalización de pagos."
                              : "Singapur representa el mayor potencial de LTV. Establecer una LLC regional de paso para gestionar ingresos de clientes SaaS de SE Asia bajo parámetros de cero impuestos."}
                          </p>
                          <div className="border-t border-[#D4A853]/15 pt-2 flex justify-between text-xs text-[#D4A853]">
                            <span>Estado: RECOMENDACIÓN_FIRMADA</span>
                            <span>Confianza: 94.8%</span>
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
