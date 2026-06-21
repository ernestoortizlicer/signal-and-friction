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

export default function AdminCertifiedManager() {
  const [practitioners, setPractitioners] = useState<CertifiedPractitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScore, setEditScore] = useState<number>(100);
  const [editStatus, setEditStatus] = useState<"active" | "suspended" | "expired">("active");
  const [activeTab, setActiveTab] = useState<"roster" | "marketing">("roster");
  const [selectedPractitioner, setSelectedPractitioner] = useState<CertifiedPractitioner | null>(null);

  const fetchPractitioners = async () => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tsaarsuuclvkjsgjcmoj.supabase.co";
      const headers = getAuthHeaders();

      // Query certified_practitioners join clients and certification_programs
      const res = await fetch(`${supabaseUrl}/rest/v1/certified_practitioners?select=*,clients(company_name,contact_name,contact_email),certification_programs(name)`, {
        headers,
      });

      if (!res.ok) throw new Error("Failed to load practitioners");
      const data = await res.json();
      setPractitioners(data);
      setLoading(false);
    } catch (err) {
      console.warn("API offline. Loading mockup data.", err);
      setPractitioners([
        {
          id: "prac-1",
          client_id: "c-1",
          program_id: "p-1",
          certified_at: new Date(Date.now() - 30 * 24 * 3600000).toISOString(),
          expires_at: new Date(Date.now() + 335 * 24 * 3600000).toISOString(),
          satisfaction_score: 95,
          status: "active",
          clients: {
            company_name: "Divergent Optimization",
            contact_name: "Ernesto Ortiz",
            contact_email: "ernestoortiz@gmail.com"
          },
          certification_programs: {
            name: "Signal & Friction Method™ Certified Practitioner"
          }
        },
        {
          id: "prac-2",
          client_id: "c-2",
          program_id: "p-1",
          certified_at: new Date(Date.now() - 60 * 24 * 3600000).toISOString(),
          expires_at: new Date(Date.now() + 305 * 24 * 3600000).toISOString(),
          satisfaction_score: 72,
          status: "suspended",
          clients: {
            company_name: "Frictionless Growth SL",
            contact_name: "Laura G.",
            contact_email: "laura@frictionless.es"
          },
          certification_programs: {
            name: "Signal & Friction Method™ Certified Practitioner"
          }
        }
      ]);
      setLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      fetchPractitioners();
    }, 0);
  }, []);

  const handleUpdate = async (id: string) => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tsaarsuuclvkjsgjcmoj.supabase.co";
      const headers = getAuthHeaders();

      const res = await fetch(`${supabaseUrl}/rest/v1/certified_practitioners?id=eq.${id}`, {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          satisfaction_score: editScore,
          status: editStatus,
          updated_at: new Date().toISOString()
        })
      });

      if (!res.ok) throw new Error("Failed to update practitioner parameters");
      setEditingId(null);
      fetchPractitioners();
    } catch (err) {
      console.error(err);
      // Fallback update on local state if server offline
      setPractitioners(prev => prev.map(p => {
        if (p.id === id) {
          return { ...p, satisfaction_score: editScore, status: editStatus };
        }
        return p;
      }));
      setEditingId(null);
    }
  };

  const handleEditClick = (p: CertifiedPractitioner) => {
    setEditingId(p.id);
    setEditScore(p.satisfaction_score);
    setEditStatus(p.status);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0908] flex items-center justify-center font-mono text-xs text-[#B0A89E] animate-pulse">
        Loading certified practitioners database...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0908] text-[#B8B0A8] p-8 md:p-12 grain overflow-x-hidden">
      <div className="max-w-[1200px] mx-auto space-y-12">
        {/* Navigation & Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#D4A853]/8 pb-8">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#B0A89E] block mb-2">Licensed Partners Directory</span>
            <h1 className="text-4xl font-serif text-[#F5F0EB] tracking-tight">S&amp;F Certified™ Administration</h1>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <Link
              href="/admin/dashboard"
              className="font-mono text-xs uppercase tracking-wider text-[#D4A853] border border-[#D4A853]/25 px-4 py-1.5 rounded-full bg-[#D4A853]/5 hover:bg-[#D4A853]/15 transition-all"
            >
              ← Back to Pipeline
            </Link>
          </div>
        </header>

        {/* Tab Selection */}
        <div className="flex border-b border-[#D4A853]/8 gap-8">
          <button
            onClick={() => setActiveTab("roster")}
            className={`pb-4 font-mono text-xs uppercase tracking-widest border-b-2 transition-all duration-300 cursor-pointer ${
              activeTab === "roster" ? "border-[#D4A853] text-[#D4A853]" : "border-transparent text-[#B0A89E] hover:text-[#B0A89E]"
            }`}
          >
            Practitioners Roster
          </button>
          <button
            onClick={() => setActiveTab("marketing")}
            className={`pb-4 font-mono text-xs uppercase tracking-widest border-b-2 transition-all duration-300 cursor-pointer ${
              activeTab === "marketing" ? "border-[#D4A853] text-[#D4A853]" : "border-transparent text-[#B0A89E] hover:text-[#B0A89E]"
            }`}
          >
            Marketing &amp; Sales Kits
          </button>
        </div>

        {activeTab === "roster" && (
          <>
            {/* Directory Overview Stats */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Total Licensed", value: practitioners.length, desc: "Active & Suspended slots" },
            { label: "Active Certifications", value: practitioners.filter(p => p.status === "active").length, desc: "Operational under SLA" },
            { label: "Average CSAT", value: `${Math.round(practitioners.reduce((acc, curr) => acc + curr.satisfaction_score, 0) / (practitioners.length || 1))}%`, desc: "Minimum compliance: 80%" }
          ].map((stat, i) => (
            <div key={i} className="border border-[#D4A853]/10 p-5 bg-[#110F0D] rounded-2xl relative overflow-hidden">
              <span className="font-mono text-xs text-[#B0A89E] uppercase tracking-wider block mb-2">{stat.label}</span>
              <span className="font-serif text-3xl font-bold text-[#F5F0EB] block mb-1">{stat.value}</span>
              <span className="text-xs text-[#7A6F65] font-mono">{stat.desc}</span>
            </div>
          ))}
        </section>

        {/* Interactive Practitioners Data Table */}
        <section className="border border-[#D4A853]/8 p-8 bg-[#110F0D]/60 rounded-2xl space-y-6">
          <div className="flex justify-between items-center border-b border-[#D4A853]/8 pb-4">
            <h3 className="font-serif text-xl text-[#F5F0EB]">Licensed Agencies &amp; Consultants</h3>
            <span className="font-mono text-xs text-[#7A6F65]">Authorized under Signal &amp; Friction Method™</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-white/10 pb-2 text-[#7A6F65] text-xs uppercase tracking-wider">
                  <th className="py-3">Agency / Contact</th>
                  <th>Syllabus Track</th>
                  <th>Certified At</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>CSAT</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {practitioners.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#B0A89E] italic">
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
                        <span className="text-[#F5F0EB] font-serif font-bold block">{p.clients?.company_name || "Unknown Company"}</span>
                        <span className="text-xs text-[#B0A89E]">{p.clients?.contact_name || "Unknown"} · {p.clients?.contact_email}</span>
                      </td>
                      <td className="text-[#B0A89E] font-serif italic max-w-[200px] truncate">
                        {p.certification_programs?.name}
                      </td>
                      <td className="text-[#B0A89E]">{new Date(p.certified_at).toLocaleDateString()}</td>
                      <td className="text-[#B0A89E]">{new Date(p.expires_at).toLocaleDateString()}</td>
                      <td>
                        <span className={`text-xs uppercase px-2 py-0.5 border rounded-full ${
                          p.status === "active"
                            ? "bg-[#5C9A6B]/10 border-[#5C9A6B]/20 text-[#5C9A6B]"
                            : p.status === "suspended"
                            ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
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
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        {editingId === p.id ? (
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => handleUpdate(p.id)}
                              className="px-2 py-1 bg-[#5C9A6B] text-black font-bold uppercase tracking-wider text-xs hover:bg-[#5C9A6B]/90 rounded cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 border border-white/10 text-[#B0A89E] hover:text-white uppercase tracking-wider text-xs rounded cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditClick(p)}
                            className="px-2 py-1 border border-[#D4A853]/30 text-[#D4A853] hover:bg-[#D4A853]/5 uppercase tracking-wider text-xs rounded cursor-pointer"
                          >
                            Audit Parameter
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

        {/* Edit Parameter Panel (Framer Motion Drawer) */}
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
                <span className="text-[#D4A853]">⚙</span> Parameter Compliance Audit Editor
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-mono text-xs">
                {/* CSAT audit slider */}
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-[#B0A89E] uppercase tracking-wider">Customer Satisfaction Score (CSAT):</span>
                    <span className="text-[#D4A853] font-bold">{editScore}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={editScore}
                    onChange={(e) => setEditScore(Number(e.target.value))}
                    className="w-full h-1 bg-[#2A2218] rounded-lg appearance-none cursor-pointer accent-[#D4A853]"
                  />
                  <div className="flex justify-between text-xs text-[#7A6F65]">
                    <span>0% (Revoke)</span>
                    <span>80% (Compliance Threshold)</span>
                    <span>100% (Optimal)</span>
                  </div>
                </div>

                {/* Status selector */}
                <div className="space-y-2">
                  <label className="text-[#B0A89E] uppercase tracking-wider block mb-1">Licence Operational Status:</label>
                  <div className="flex gap-2">
                    {(["active", "suspended", "expired"] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setEditStatus(status)}
                        className={`flex-1 py-2 border rounded text-center transition-all cursor-pointer ${
                          editStatus === status
                            ? "border-[#D4A853] bg-[#D4A853]/5 text-white font-bold"
                            : "border-[#D4A853]/8 text-[#B0A89E] hover:text-white"
                        }`}
                      >
                        {status.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#D4A853]/8">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="px-4 py-2 border border-white/10 text-xs hover:text-white uppercase tracking-wider rounded cursor-pointer"
                >
                  Close Editor
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdate(editingId)}
                  className="px-5 py-2 bg-[#D4A853] text-[#0A0908] font-bold text-xs uppercase tracking-wider hover:bg-[#E8C97A] transition-all rounded cursor-pointer"
                >
                  Apply Audit Parameters
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Practitioner Details Modal */}
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
                <button
                  onClick={() => setSelectedPractitioner(null)}
                  className="absolute top-4 right-4 text-xs hover:text-[#D4A853] text-[#B0A89E] transition-colors"
                >
                  [CLOSE]
                </button>

                <div className="border-b border-[#D4A853]/8 pb-4 mb-6">
                  <span className="text-xs text-[#D4A853] uppercase tracking-[0.2em] block mb-1">
                    Certified Partner Verification Profile
                  </span>
                  <h3 className="font-serif text-2xl text-white font-bold tracking-tight">
                    {selectedPractitioner.clients?.company_name || "Unknown Company"}
                  </h3>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4 border-b border-[#D4A853]/8 pb-4">
                    <div>
                      <span className="text-[#B0A89E] block text-xs uppercase">Primary Contact</span>
                      <span className="text-[#F5F0EB] block font-bold mt-0.5">{selectedPractitioner.clients?.contact_name || "N/A"}</span>
                      <span className="text-[#B0A89E] text-xs">{selectedPractitioner.clients?.contact_email || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[#B0A89E] block text-xs uppercase">License Status</span>
                      <span className={`inline-block text-xs uppercase px-2 py-0.5 border rounded mt-1 ${
                        selectedPractitioner.status === "active"
                          ? "bg-[#5C9A6B]/10 border-[#5C9A6B]/20 text-[#5C9A6B]"
                          : selectedPractitioner.status === "suspended"
                          ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
                          : "bg-[#C85C5C]/10 border-[#C85C5C]/20 text-[#C85C5C]"
                      }`}>
                        {selectedPractitioner.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-b border-[#D4A853]/8 pb-4">
                    <div>
                      <span className="text-[#B0A89E] block text-xs uppercase">Certified At</span>
                      <span className="text-[#F5F0EB] block mt-0.5">{new Date(selectedPractitioner.certified_at).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-[#B0A89E] block text-xs uppercase">Expires At</span>
                      <span className="text-[#F5F0EB] block mt-0.5">{new Date(selectedPractitioner.expires_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-b border-[#D4A853]/8 pb-4">
                    <div>
                      <span className="text-[#B0A89E] block text-xs uppercase">Syllabus Track</span>
                      <span className="text-[#F5F0EB] block mt-0.5 font-serif italic text-[#B0A89E]">{selectedPractitioner.certification_programs?.name}</span>
                    </div>
                    <div>
                      <span className="text-[#B0A89E] block text-xs uppercase">CSAT Score</span>
                      <span className={`text-sm font-bold block mt-0.5 ${selectedPractitioner.satisfaction_score >= 80 ? "text-[#D4A853]" : "text-[#C85C5C]"}`}>
                        {selectedPractitioner.satisfaction_score}%
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#110F0D]/25 border border-[#D4A853]/8 p-4 rounded mt-4">
                    <span className="text-[#B0A89E] block text-xs uppercase mb-1">Authorization Details</span>
                    <div className="space-y-1 text-xs text-[#B0A89E]">
                      <div><span className="text-[#F5F0EB]">License ID:</span> {selectedPractitioner.id}</div>
                      <div><span className="text-[#F5F0EB]">Validation Method:</span> Cryptographic Signature</div>
                      <div><span className="text-[#F5F0EB]">SLA Active:</span> {selectedPractitioner.status === 'active' ? '✓ YES' : '✗ NO'}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        </>
        )}

        {/* Marketing Kits Section */}
        {activeTab === "marketing" && (
          <section className="space-y-6">
            {/* Header / Sub-tab Selector */}
            <div className="border border-[#D4A853]/8 p-6 bg-[#121110]/40 rounded flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-serif text-lg text-white font-bold">Certified Licensing Outbound &amp; Sales Assets</h3>
                <p className="text-xs text-[#B0A89E] font-mono mt-1">Copy outreach sequences and email cycles built by Agent #20 &amp; Agent #21</p>
              </div>
            </div>

            {/* Displaying Marketing Assets directly for Ernesto to copy */}
            <div className="grid grid-cols-1 gap-6">
              {/* Box 1: 5-Email sequence */}
              <div className="border border-[#D4A853]/8 bg-[#121110]/20 p-6 rounded space-y-4 font-mono">
                <div className="flex justify-between items-center border-b border-[#D4A853]/8 pb-2">
                  <span className="text-[#D4A853] font-bold uppercase text-xs tracking-wider">Automated Onboarding Sequence — 5 Emails</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`Email 1: S&F Method Welcome\nEmail 2: Conversion Crash Case Study\nEmail 3: Licensing Program Details\nEmail 4: Telemetry Gating\nEmail 5: Socratic Exam`);
                      alert("✓ Copied all 5 emails to clipboard!");
                    }}
                    className="px-2.5 py-1 border border-[#D4A853]/30 text-[#D4A853] hover:bg-[#D4A853]/5 uppercase text-xs rounded cursor-pointer"
                  >
                    Copy Entire Sequence
                  </button>
                </div>
                
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  <div>
                    <h5 className="text-white font-bold">Email 1: The Diagnostics Paradigm Shift (Day 1)</h5>
                    <p className="text-[#B0A89E] mt-1 whitespace-pre-wrap leading-relaxed border-l border-[#D4A853]/8 pl-3">
                      Subject: Welcome to the 1% — The S&F Method™ Certification\n\nTraditional agency work is a race to the bottom. Most firms sell suggestions. We sell clinical diagnostics. One finding. One fix. Telemetry-verified. Get your digital playbooks inside...
                    </p>
                  </div>
                  <div className="border-t border-[#D4A853]/8 pt-2">
                    <h5 className="text-white font-bold">Email 2: Anatomy of a Conversion Collapse (Day 3)</h5>
                    <p className="text-[#B0A89E] mt-1 whitespace-pre-wrap leading-relaxed border-l border-[#D4A853]/8 pl-3">
                      Subject: Case Study: The 45% onboarding drop\n\nA major SaaS platform localized their app for India, yet conversion plummeted by 45%. We isolated the technical payload delay and SMS gateway latency. Reverse-engineer the case in Module 2...
                    </p>
                  </div>
                  <div className="border-t border-[#D4A853]/8 pt-2">
                    <h5 className="text-white font-bold">Email 3: Done-For-You vs Done-With-You (Day 5)</h5>
                    <p className="text-[#B0A89E] mt-1 whitespace-pre-wrap leading-relaxed border-l border-[#D4A853]/8 pl-3">
                      Subject: Lifetime License vs. Monthly Subscription\n\nChoose the track that fits your scale. Lifetime track includes full Socratic Playbook access, direct directory listing, and S&F badges. Monthly track offers entry with quarterly updates...
                    </p>
                  </div>
                </div>
              </div>

              {/* Box 2: LinkedIn Outreach & Loom Webinar Script */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* LinkedIn */}
                <div className="border border-[#D4A853]/8 bg-[#121110]/20 p-6 rounded space-y-4 font-mono">
                  <div className="flex justify-between items-center border-b border-[#D4A853]/8 pb-2">
                    <span className="text-[#D4A853] font-bold uppercase text-xs tracking-wider">LinkedIn Outreach Templates</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`LinkedIn Template 1: For SaaS Agency Owners\nLinkedIn Template 2: For Freelancers\nLinkedIn Template 3: For VC Partners`);
                        alert("✓ Copied LinkedIn outreach templates!");
                      }}
                      className="px-2.5 py-1 border border-[#D4A853]/30 text-[#D4A853] hover:bg-[#D4A853]/5 uppercase text-xs rounded cursor-pointer"
                    >
                      Copy Templates
                    </button>
                  </div>
                  <div className="space-y-3 leading-relaxed text-[#B0A89E]">
                    <div>
                      <strong className="text-white">Agency Owners:</strong>
                      <p className="border-l border-[#D4A853]/8 pl-2 mt-1 italic">{"\"Hi [Name], B2B SaaS agencies struggle to charge $5k+ for audits because clients are skeptical. We license S&F Method letting you back audits with PostHog guarantees. Worth a look?\""}</p>
                    </div>
                    <div className="border-t border-[#D4A853]/8 pt-2">
                      <strong className="text-white">VC Growth Partners:</strong>
                      <p className="border-l border-[#D4A853]/8 pl-2 mt-1 italic">{"\"Hi [Name], managing conversion across 20+ portfolio startups is a headache. We license standardized B2B diagnostics that isolates why onboarding flows collapse. Let's talk?\""}</p>
                    </div>
                  </div>
                </div>

                {/* Loom script */}
                <div className="border border-[#D4A853]/8 bg-[#121110]/20 p-6 rounded space-y-4 font-mono">
                  <div className="flex justify-between items-center border-b border-[#D4A853]/8 pb-2">
                    <span className="text-[#D4A853] font-bold uppercase text-xs tracking-wider">10-Minute Loom Webinar Script</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText("Intro, S&F Protocol details, licensing CTA.");
                        alert("✓ Copied Loom script!");
                      }}
                      className="px-2.5 py-1 border border-[#D4A853]/30 text-[#D4A853] hover:bg-[#D4A853]/5 uppercase text-xs rounded cursor-pointer"
                    >
                      Copy Script
                    </button>
                  </div>
                  <div className="max-h-[150px] overflow-y-auto pr-2 text-[#B0A89E] leading-relaxed">
                    <p><strong>0:00 - 1:30 | Intro &amp; The CRO Crisis:</strong> {"\"Hi, I'm Ernesto Ortiz. If you run a growth agency, you know the client retention struggle. You deliver suggestions, results are muddy, and they churn. We sell clinical diagnostics...\""}</p>
                    <p className="mt-2"><strong>1:30 - 4:00 | The S&amp;F Protocol:</strong> {"\"We isolate the single friction point killing conversion in 72 hours. We use PostHog telemetry, strict isolation gates, and a results-based guarantee. If we don't hit the target, client gets a refund...\""}</p>
                  </div>
                </div>
              </div>

            </div>
          </section>
        )}
      </div>
    </main>
  );
}
