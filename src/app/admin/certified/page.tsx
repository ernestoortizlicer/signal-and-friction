"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAuthHeaders } from "@/lib/supabase";
import Link from "next/link";

interface CertifiedPractitioner {
  id: string;
  client_id: string;
  program_id: string;
  certified_at: string;
  expires_at: string;
  satisfaction_score: number;
  exam_score?: number;
  modules_completed?: number;
  status: "active" | "suspended" | "expired";
  clients: {
    company_name: string;
    contact_name: string;
    contact_email: string;
  };
  certification_programs: {
    name: string;
  };
}

const springConfig = { type: "spring" as const, stiffness: 100, damping: 18 };

const MOCK_PRACTITIONERS: CertifiedPractitioner[] = [
  {
    id: "prac-1",
    client_id: "c-1",
    program_id: "p-1",
    certified_at: new Date(Date.now() - 30 * 24 * 3600000).toISOString(),
    expires_at: new Date(Date.now() + 335 * 24 * 3600000).toISOString(),
    satisfaction_score: 95,
    exam_score: 88,
    modules_completed: 6,
    status: "active",
    clients: {
      company_name: "Divergent Optimization",
      contact_name: "Ernesto Ortiz",
      contact_email: "ernestoortiz@gmail.com",
    },
    certification_programs: { name: "Signal & Friction Method™ Certified Practitioner" },
  },
  {
    id: "prac-2",
    client_id: "c-2",
    program_id: "p-1",
    certified_at: new Date(Date.now() - 60 * 24 * 3600000).toISOString(),
    expires_at: new Date(Date.now() + 305 * 24 * 3600000).toISOString(),
    satisfaction_score: 72,
    exam_score: 61,
    modules_completed: 4,
    status: "suspended",
    clients: {
      company_name: "Frictionless Growth SL",
      contact_name: "Laura G.",
      contact_email: "laura@frictionless.es",
    },
    certification_programs: { name: "Signal & Friction Method™ Certified Practitioner" },
  },
];

const LINKEDIN_TEMPLATES = [
  {
    target: "SaaS Agency Owners",
    text: `Hi [Name] — B2B SaaS agencies struggle to charge $5k+ for audits because clients are skeptical of outputs with no telemetry behind them. I license the S&F Method™ to agencies: clinical diagnostic framework, PostHog-backed, results-guaranteed. Licensed partners charge 3–5× more per engagement. Worth 5 minutes to see if it fits? [Link]`,
  },
  {
    target: "VC Growth Partners",
    text: `Hi [Name] — managing conversion across 20+ portfolio startups means you see the same onboarding collapses repeatedly. We license standardized B2B diagnostics that isolate exactly why activation flows fail — with telemetry verification, not gut feel. Might be worth a look for your portfolio ops stack: [Link]`,
  },
  {
    target: "Independent Consultants",
    text: `Hi [Name] — if you're doing CRO/growth consulting, the market is getting crowded. The practitioners charging $5–10K per engagement have a methodology with a name behind it. The S&F Certified™ program licenses you the clinical diagnostic framework + the certified badge. 12 weeks, 100% async, live exam. Interested? [Link]`,
  },
];

const EMAIL_SEQUENCE = [
  {
    day: "Day 1",
    subject: "Welcome to the 1% — The S&F Method™ Certification",
    preview: `Traditional agency work is a race to the bottom. Most firms sell suggestions. We sell clinical diagnostics. One finding. One fix. Telemetry-verified.

Module 1 — The Signal & Friction Method™ Core — starts with a single question: what is the difference between a signal and a noise? Most audits can't answer that. After Module 1, you can.

Access your curriculum at [link]. The 72h exam window opens after Module 4.`,
  },
  {
    day: "Day 3",
    subject: "Case Study: The 45% Onboarding Drop — TikTok India",
    preview: `A major SaaS platform localized their app for India. Day-7 retention collapsed 45% vs. their US version. The obvious hypothesis: cultural UX differences.

The actual finding: SMS gateway routing through a US carrier caused 28-second OTP latency for Indian mobile numbers. The onboarding flow had a 30-second timeout. Users abandoned before the code arrived.

One vendor change. +$280K ARR from the Indian cohort in 30 days.

This is Module 3. Five case studies like this. Each one teaches you to look past the obvious diagnosis.`,
  },
  {
    day: "Day 5",
    subject: "72h Live Exam — What to Expect",
    preview: `The S&F Certification exam is not multiple-choice.

You receive a real anonymized client brief — company type, funnel data, PostHog export, support ticket themes. You have 72 hours to produce 3 documents: a Diagnosis (600 words), an Intervention Brief (400 words), and an Executive Cover (200 words).

Pass threshold: 75 out of 100 on the S&F grading rubric.

If you score below 75, you get one remediation attempt with a new brief.

The exam brief pool has 12 cases across 4 verticals. No two practitioners get the same brief.`,
  },
];

export default function AdminCertifiedManager() {
  const [practitioners, setPractitioners] = useState<CertifiedPractitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScore, setEditScore] = useState<number>(100);
  const [editStatus, setEditStatus] = useState<"active" | "suspended" | "expired">("active");
  const [activeTab, setActiveTab] = useState<"roster" | "marketing">("roster");
  const [selectedPractitioner, setSelectedPractitioner] = useState<CertifiedPractitioner | null>(null);
  const [expandedEmail, setExpandedEmail] = useState<number | null>(null);

  const fetchPractitioners = async () => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tsaarsuuclvkjsgjcmoj.supabase.co";
      const headers = getAuthHeaders();
      const res = await fetch(
        `${supabaseUrl}/rest/v1/certified_practitioners?select=*,clients(company_name,contact_name,contact_email),certification_programs(name)`,
        { headers }
      );
      if (!res.ok) throw new Error("Failed to load practitioners");
      const data = await res.json();
      setPractitioners(data);
    } catch (err) {
      console.warn("API offline. Loading mockup data.", err);
      setUsingMockData(true);
      setPractitioners(MOCK_PRACTITIONERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPractitioners();
  }, []);

  const handleUpdate = async (id: string) => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tsaarsuuclvkjsgjcmoj.supabase.co";
      const headers = getAuthHeaders();
      const res = await fetch(`${supabaseUrl}/rest/v1/certified_practitioners?id=eq.${id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ satisfaction_score: editScore, status: editStatus, updated_at: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setEditingId(null);
      fetchPractitioners();
    } catch {
      setPractitioners(prev => prev.map(p => p.id === id ? { ...p, satisfaction_score: editScore, status: editStatus } : p));
      setEditingId(null);
    }
  };

  const activePractitioners = practitioners.filter(p => p.status === "active");
  const avgCSAT = practitioners.length ? Math.round(practitioners.reduce((a, c) => a + c.satisfaction_score, 0) / practitioners.length) : 0;
  const avgExamScore = practitioners.filter(p => p.exam_score).length
    ? Math.round(practitioners.filter(p => p.exam_score).reduce((a, c) => a + (c.exam_score || 0), 0) / practitioners.filter(p => p.exam_score).length)
    : 0;
  const totalMRR = activePractitioners.length * 375;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0908] flex items-center justify-center font-mono text-xs text-[#B0A89E] animate-pulse">
        {"Loading certified practitioners database..."}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0908] text-[#B8B0A8] p-8 md:p-12 grain overflow-x-hidden">
      <div className="max-w-[1200px] mx-auto space-y-12">
        {usingMockData && (
          <div className="border-2 border-[#C85C5C]/50 bg-[#C85C5C]/10 px-4 py-2.5 rounded flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C85C5C] animate-pulse shrink-0" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#C85C5C]">
              {"⚠ Showing Mock Data — Live Fetch Failed"}
            </span>
          </div>
        )}

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#D4A853]/8 pb-8">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#B0A89E] block mb-2">{"Licensed Partners Directory"}</span>
            <h1 className="text-4xl font-serif text-[#F5F0EB] tracking-tight">S&amp;F Certified™ Administration</h1>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <Link
              href="/certified"
              target="_blank"
              className="font-mono text-xs uppercase tracking-wider text-[#5C9A6B] border border-[#5C9A6B]/25 px-4 py-1.5 rounded-full bg-[#5C9A6B]/5 hover:bg-[#5C9A6B]/15 transition-all"
            >
              {"View Public Page ↗"}
            </Link>
            <Link
              href="/admin/dashboard"
              className="font-mono text-xs uppercase tracking-wider text-[#D4A853] border border-[#D4A853]/25 px-4 py-1.5 rounded-full bg-[#D4A853]/5 hover:bg-[#D4A853]/15 transition-all"
            >
              ← Pipeline
            </Link>
          </div>
        </header>

        {/* Program Telemetry */}
        <section className="space-y-4">
          <div className="font-mono text-xs uppercase tracking-widest text-[#D4A853]">{"Program Telemetry"}</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Total Practitioners", value: practitioners.length, desc: "Active + Suspended" },
              { label: "Active Licenses", value: activePractitioners.length, desc: "Operational under SLA" },
              { label: "Monthly Revenue", value: `$${totalMRR.toLocaleString()}`, desc: "Est. @ $375/active/mo" },
              { label: "Avg Exam Score", value: avgExamScore ? `${avgExamScore}/100` : "—", desc: "Pass threshold: 75" },
              { label: "Avg CSAT", value: `${avgCSAT}%`, desc: "Minimum compliance: 80%" },
            ].map((stat, i) => (
              <div key={i} className="border border-[#D4A853]/10 p-4 bg-[#110F0D] rounded-2xl">
                <span className="font-mono text-[10px] text-[#B0A89E] uppercase tracking-wider block mb-2">{stat.label}</span>
                <span className="font-serif text-2xl font-bold text-[#F5F0EB] block mb-0.5">{stat.value}</span>
                <span className="text-[10px] text-[#7A6F65] font-mono">{stat.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Tabs */}
        <div className="flex border-b border-[#D4A853]/8 gap-8">
          {(["roster", "marketing"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 font-mono text-xs uppercase tracking-widest border-b-2 transition-all duration-300 cursor-pointer ${
                activeTab === tab ? "border-[#D4A853] text-[#D4A853]" : "border-transparent text-[#B0A89E] hover:text-[#B0A89E]"
              }`}
            >
              {tab === "roster" ? "Practitioners Roster" : "Marketing & Sales Kits"}
            </button>
          ))}
        </div>

        {/* Roster Tab */}
        {activeTab === "roster" && (
          <>
            <section className="border border-[#D4A853]/8 p-8 bg-[#110F0D]/60 rounded-2xl space-y-6">
              <div className="flex justify-between items-center border-b border-[#D4A853]/8 pb-4">
                <h3 className="font-serif text-xl text-[#F5F0EB]">{"Licensed Agencies & Consultants"}</h3>
                <span className="font-mono text-xs text-[#7A6F65]">{"Authorized under Signal & Friction Method™"}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-[#7A6F65] text-xs uppercase tracking-wider">
                      <th className="py-3">{"Agency / Contact"}</th>
                      <th>{"Certified At"}</th>
                      <th>{"Expires"}</th>
                      <th>{"Modules"}</th>
                      <th>{"Exam"}</th>
                      <th>{"Status"}</th>
                      <th>CSAT</th>
                      <th className="text-right">{"Action"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {practitioners.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-[#B0A89E] italic">
                          No certified practitioners registered yet.
                        </td>
                      </tr>
                    ) : (
                      practitioners.map(p => (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedPractitioner(p)}
                          className="border-b border-[#D4A853]/8 hover:bg-white/[0.01] cursor-pointer"
                        >
                          <td className="py-4">
                            <span className="text-[#F5F0EB] font-serif font-bold block">{p.clients?.company_name || "Unknown"}</span>
                            <span className="text-xs text-[#B0A89E]">{p.clients?.contact_name} · {p.clients?.contact_email}</span>
                          </td>
                          <td className="text-[#B0A89E]">{new Date(p.certified_at).toLocaleDateString()}</td>
                          <td className="text-[#B0A89E]">{new Date(p.expires_at).toLocaleDateString()}</td>
                          <td>
                            <span className={`font-mono font-bold ${(p.modules_completed || 0) >= 6 ? "text-[#5C9A6B]" : "text-[#D4A853]"}`}>
                              {p.modules_completed || 0}/6
                            </span>
                          </td>
                          <td>
                            <span className={`font-mono font-bold ${(p.exam_score || 0) >= 75 ? "text-[#5C9A6B]" : p.exam_score ? "text-orange-400" : "text-[#7A6F65]"}`}>
                              {p.exam_score ? `${p.exam_score}/100` : "—"}
                            </span>
                          </td>
                          <td>
                            <span className={`text-xs uppercase px-2 py-0.5 border rounded-full ${
                              p.status === "active" ? "bg-[#5C9A6B]/10 border-[#5C9A6B]/20 text-[#5C9A6B]"
                                : p.status === "suspended" ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
                                : "bg-[#C85C5C]/10 border-[#C85C5C]/20 text-[#C85C5C]"
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td>
                            <span className={`font-bold ${p.satisfaction_score >= 80 ? "text-[#D4A853]" : "text-[#C85C5C]"}`}>
                              {p.satisfaction_score}%
                            </span>
                          </td>
                          <td className="text-right" onClick={e => e.stopPropagation()}>
                            {editingId === p.id ? (
                              <div className="inline-flex gap-2">
                                <button onClick={() => handleUpdate(p.id)} className="px-2 py-1 bg-[#5C9A6B] text-black font-bold uppercase tracking-wider text-xs hover:bg-[#5C9A6B]/90 rounded cursor-pointer">{"Save"}</button>
                                <button onClick={() => setEditingId(null)} className="px-2 py-1 border border-white/10 text-[#B0A89E] hover:text-white uppercase tracking-wider text-xs rounded cursor-pointer">{"Cancel"}</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setEditingId(p.id); setEditScore(p.satisfaction_score); setEditStatus(p.status); }}
                                className="px-2 py-1 border border-[#D4A853]/30 text-[#D4A853] hover:bg-[#D4A853]/5 uppercase tracking-wider text-xs rounded cursor-pointer"
                              >
                                Audit
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Edit Panel */}
            <AnimatePresence>
              {editingId && (
                <motion.section
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  transition={springConfig}
                  className="border border-[#D4A853]/25 bg-[#121110] p-8 rounded glow-border space-y-6"
                >
                  <h3 className="font-serif text-lg text-white border-b border-[#D4A853]/8 pb-3 flex items-center gap-2">
                    <span className="text-[#D4A853]">⚙</span> {"Parameter Compliance Audit Editor"}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-mono text-xs">
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-[#B0A89E] uppercase tracking-wider">CSAT Score:</span>
                        <span className="text-[#D4A853] font-bold">{editScore}%</span>
                      </div>
                      <input type="range" min="0" max="100" step="1" value={editScore} onChange={e => setEditScore(Number(e.target.value))} className="w-full h-1 bg-[#2A2218] rounded-lg appearance-none cursor-pointer accent-[#D4A853]" />
                      <div className="flex justify-between text-xs text-[#7A6F65]">
                        <span>0% ({"Revoke"})</span><span>80% ({"Threshold"})</span><span>100%</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[#B0A89E] uppercase tracking-wider block mb-1">{"License Status:"}</label>
                      <div className="flex gap-2">
                        {(["active", "suspended", "expired"] as const).map(status => (
                          <button key={status} type="button" onClick={() => setEditStatus(status)}
                            className={`flex-1 py-2 border rounded text-center transition-all cursor-pointer ${editStatus === status ? "border-[#D4A853] bg-[#D4A853]/5 text-white font-bold" : "border-[#D4A853]/8 text-[#B0A89E] hover:text-white"}`}>
                            {status.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-[#D4A853]/8">
                    <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 border border-white/10 text-xs hover:text-white uppercase tracking-wider rounded cursor-pointer">{"Cancel"}</button>
                    <button type="button" onClick={() => handleUpdate(editingId)} className="px-5 py-2 bg-[#D4A853] text-[#0A0908] font-bold text-xs uppercase tracking-wider hover:bg-[#E8C97A] transition-all rounded cursor-pointer">{"Apply Parameters"}</button>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Practitioner Detail Modal */}
            <AnimatePresence>
              {selectedPractitioner && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={springConfig}
                    className="w-full max-w-lg border border-[#D4A853]/30 bg-[#121110] p-8 rounded relative glow-border text-left font-mono"
                  >
                    <button onClick={() => setSelectedPractitioner(null)} className="absolute top-4 right-4 text-xs hover:text-[#D4A853] text-[#B0A89E]">{"[CLOSE]"}</button>

                    <div className="border-b border-[#D4A853]/8 pb-4 mb-6">
                      <span className="text-xs text-[#D4A853] uppercase tracking-[0.2em] block mb-1">{"Certified Partner Profile"}</span>
                      <h3 className="font-serif text-2xl text-white font-bold">{selectedPractitioner.clients?.company_name}</h3>
                    </div>

                    <div className="space-y-4 text-xs">
                      <div className="grid grid-cols-2 gap-4 border-b border-[#D4A853]/8 pb-4">
                        <div>
                          <span className="text-[#B0A89E] block uppercase">{"Primary Contact"}</span>
                          <span className="text-[#F5F0EB] block font-bold mt-0.5">{selectedPractitioner.clients?.contact_name}</span>
                          <span className="text-[#B0A89E]">{selectedPractitioner.clients?.contact_email}</span>
                        </div>
                        <div>
                          <span className="text-[#B0A89E] block uppercase">{"License Status"}</span>
                          <span className={`inline-block text-xs uppercase px-2 py-0.5 border rounded mt-1 ${
                            selectedPractitioner.status === "active" ? "bg-[#5C9A6B]/10 border-[#5C9A6B]/20 text-[#5C9A6B]"
                              : selectedPractitioner.status === "suspended" ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
                              : "bg-[#C85C5C]/10 border-[#C85C5C]/20 text-[#C85C5C]"
                          }`}>{selectedPractitioner.status}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-b border-[#D4A853]/8 pb-4">
                        <div>
                          <span className="text-[#B0A89E] block uppercase">{"Certified At"}</span>
                          <span className="text-[#F5F0EB] block mt-0.5">{new Date(selectedPractitioner.certified_at).toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span className="text-[#B0A89E] block uppercase">{"Renewal Date"}</span>
                          <span className="text-[#F5F0EB] block mt-0.5">{new Date(selectedPractitioner.expires_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 border-b border-[#D4A853]/8 pb-4">
                        <div>
                          <span className="text-[#B0A89E] block uppercase">{"Exam Score"}</span>
                          <span className={`text-sm font-bold block mt-0.5 ${(selectedPractitioner.exam_score || 0) >= 75 ? "text-[#5C9A6B]" : selectedPractitioner.exam_score ? "text-orange-400" : "text-[#7A6F65]"}`}>
                            {selectedPractitioner.exam_score ? `${selectedPractitioner.exam_score}/100` : "Pending"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#B0A89E] block uppercase">{"Modules"}</span>
                          <span className={`text-sm font-bold block mt-0.5 ${(selectedPractitioner.modules_completed || 0) >= 6 ? "text-[#5C9A6B]" : "text-[#D4A853]"}`}>
                            {selectedPractitioner.modules_completed || 0}/6
                          </span>
                        </div>
                        <div>
                          <span className="text-[#B0A89E] block uppercase">CSAT</span>
                          <span className={`text-sm font-bold block mt-0.5 ${selectedPractitioner.satisfaction_score >= 80 ? "text-[#D4A853]" : "text-[#C85C5C]"}`}>
                            {selectedPractitioner.satisfaction_score}%
                          </span>
                        </div>
                      </div>

                      <div className="bg-[#110F0D]/40 border border-[#D4A853]/8 p-4 rounded space-y-1">
                        <span className="text-[#B0A89E] block uppercase mb-1">{"Authorization Details"}</span>
                        <div className="space-y-1">
                          <div><span className="text-[#F5F0EB]">{"License ID:"}</span> <span className="text-[#7A6F65]">{selectedPractitioner.id}</span></div>
                          <div><span className="text-[#F5F0EB]">{"Syllabus:"}</span> <span className="text-[#B0A89E] italic">{selectedPractitioner.certification_programs?.name}</span></div>
                          <div><span className="text-[#F5F0EB]">SLA {"Active:"}</span> <span className={selectedPractitioner.status === "active" ? "text-[#5C9A6B]" : "text-[#C85C5C]"}>{selectedPractitioner.status === "active" ? "✓ YES" : "✗ NO"}</span></div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Marketing Kits Tab */}
        {activeTab === "marketing" && (
          <section className="space-y-8">
            <div className="border border-[#D4A853]/8 p-6 bg-[#121110]/40 rounded">
              <h3 className="font-serif text-lg text-white font-bold">{"Certified Licensing — Outbound & Sales Assets"}</h3>
              <p className="text-xs text-[#B0A89E] font-mono mt-1">{"Updated to reflect the new 6-module, 42h curriculum. Agents #12 & #13 copywriting."}</p>
            </div>

            {/* Email Sequence */}
            <div className="border border-[#D4A853]/8 bg-[#121110]/20 p-6 rounded space-y-4 font-mono">
              <div className="flex justify-between items-center border-b border-[#D4A853]/8 pb-3">
                <span className="text-[#D4A853] font-bold uppercase text-xs tracking-wider">{"Onboarding Email Sequence — 3 Emails"}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(EMAIL_SEQUENCE.map(e => `${e.day}\nSubject: ${e.subject}\n\n${e.preview}`).join("\n\n---\n\n")); alert("✓ 3-email sequence copied!"); }}
                  className="px-2.5 py-1 border border-[#D4A853]/30 text-[#D4A853] hover:bg-[#D4A853]/5 uppercase text-xs rounded cursor-pointer"
                >
                  {"Copy All"}
                </button>
              </div>

              <div className="space-y-3">
                {EMAIL_SEQUENCE.map((email, i) => (
                  <div key={i} className="border border-[#D4A853]/8 rounded overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedEmail(expandedEmail === i ? null : i)}
                      className="w-full text-left p-4 flex justify-between items-center hover:bg-white/[0.01] cursor-pointer"
                    >
                      <div>
                        <span className="text-[#D4A853] text-xs font-bold">{email.day}</span>
                        <span className="text-white ml-3 text-xs">{email.subject}</span>
                      </div>
                      <span className={`text-[#D4A853] text-sm transition-transform ${expandedEmail === i ? "rotate-45" : ""}`}>+</span>
                    </button>
                    <AnimatePresence>
                      {expandedEmail === i && (
                        <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                          <div className="px-4 pb-4 pt-0 border-t border-[#D4A853]/8">
                            <pre className="text-[#B0A89E] text-xs leading-relaxed whitespace-pre-wrap mt-3">{email.preview}</pre>
                            <button
                              onClick={() => { navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.preview}`); alert(`✓ ${email.day} copied!`); }}
                              className="mt-3 px-3 py-1 border border-[#D4A853]/20 text-[#D4A853] text-xs rounded hover:bg-[#D4A853]/5 cursor-pointer"
                            >{"Copy Email"}</button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>

            {/* LinkedIn Templates */}
            <div className="border border-[#D4A853]/8 bg-[#121110]/20 p-6 rounded space-y-4 font-mono">
              <div className="flex justify-between items-center border-b border-[#D4A853]/8 pb-3">
                <span className="text-[#D4A853] font-bold uppercase text-xs tracking-wider">{"LinkedIn Outreach Templates — 3 Profiles"}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(LINKEDIN_TEMPLATES.map(tmpl => `[${tmpl.target}]\n${tmpl.text}`).join("\n\n---\n\n")); alert("✓ 3 LinkedIn templates copied!"); }}
                  className="px-2.5 py-1 border border-[#D4A853]/30 text-[#D4A853] hover:bg-[#D4A853]/5 uppercase text-xs rounded cursor-pointer"
                >
                  {"Copy All"}
                </button>
              </div>

              <div className="space-y-4">
                {LINKEDIN_TEMPLATES.map((tmpl, i) => (
                  <div key={i} className="border border-[#D4A853]/8 rounded p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-white font-bold text-xs">{tmpl.target}</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(tmpl.text); alert(`✓ "${tmpl.target}" template copied!`); }}
                        className="px-2 py-0.5 border border-[#D4A853]/20 text-[#D4A853] text-xs rounded hover:bg-[#D4A853]/5 cursor-pointer"
                      >{"Copy"}</button>
                    </div>
                    <p className="text-[#B0A89E] text-xs leading-relaxed italic border-l border-[#D4A853]/15 pl-3">{tmpl.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Loom Script */}
            <div className="border border-[#D4A853]/8 bg-[#121110]/20 p-6 rounded space-y-4 font-mono">
              <div className="flex justify-between items-center border-b border-[#D4A853]/8 pb-3">
                <span className="text-[#D4A853] font-bold uppercase text-xs tracking-wider">{"10-Minute Loom Walkthrough Script"}</span>
                <button
                  onClick={() => {
                    const script = `0:00–1:30 | The CRO Crisis\n"If you run a growth agency, you know the problem: you deliver suggestions, results are murky, clients churn. The agencies charging $5–10K per diagnostic have a methodology with a name. The S&F Certified™ program is how you get one."\n\n1:30–4:00 | The S&F Protocol\n"We isolate the single friction point killing conversion in 72 hours. PostHog telemetry, strict isolation gates, results-based guarantee. If we don't hit the target, the client doesn't pay. That's the standard. The certification teaches you to operate at that standard."\n\n4:00–7:00 | The Curriculum (6 Modules)\n"42 hours over 12 weeks. The exam is a real 72-hour client brief — not multiple-choice. You produce three documents. We grade them against a 100-point rubric. Score 75+, you're certified."\n\n7:00–9:00 | The Business Layer\n"Module 5 covers how to run the practice: Wyoming LLC, Mercury banking, DWY/DFY pricing, LinkedIn outbound, AI-proofing. This isn't a skill course. It's a business architecture."\n\n9:00–10:00 | The CTA\n"$4,500/year. Annual or monthly. Your first diagnostic using the method typically covers the license cost. Apply at signal-and-friction.com/certified."`;
                    navigator.clipboard.writeText(script);
                    alert("✓ Loom script copied!");
                  }}
                  className="px-2.5 py-1 border border-[#D4A853]/30 text-[#D4A853] hover:bg-[#D4A853]/5 uppercase text-xs rounded cursor-pointer"
                >
                  {"Copy Script"}
                </button>
              </div>
              <div className="space-y-3 text-xs text-[#B0A89E] leading-relaxed">
                {[
                  { ts: "0:00–1:30", label: "The CRO Crisis", body: `"The agencies charging $5–10K per diagnostic have a methodology with a name. The S&F Certified™ program is how you get one."` },
                  { ts: "1:30–4:00", label: "The S&F Protocol", body: `"72-hour diagnostic. PostHog telemetry. Results-based guarantee. The certification teaches you to operate at that standard."` },
                  { ts: "4:00–7:00", label: "The Curriculum", body: `"42 hours, 12 weeks. The exam is a real client brief. You produce 3 documents. 100-point rubric. Score 75+: certified."` },
                  { ts: "7:00–9:00", label: "The Business Layer", body: `"Wyoming LLC, Mercury banking, DWY/DFY pricing, LinkedIn outbound, AI-proofing. Not a skill course — a business architecture."` },
                  { ts: "9:00–10:00", label: "The CTA", body: `"$4,500/year. Annual or monthly. First diagnostic typically covers the license. Apply: signal-and-friction.com/certified."` },
                ].map((seg, i) => (
                  <div key={i} className="border-l border-[#D4A853]/15 pl-3">
                    <span className="text-[#D4A853] font-bold">{seg.ts} | {seg.label}</span>
                    <p className="mt-0.5 italic">{seg.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
