"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Lead {
  id: string;
  companyName: string;
  contact: string;
  industry: string;
  status: 'intake' | 'sniper' | 'paid' | 'advisory' | 'archive';
  intakeData: {
    problemStatement: string;
    funnelMetrics: {
      signupToPricing: string;
      pricingToCheckout: string;
      checkoutToPaid: string;
    };
    currentHypothesis: string;
    monthlyRevenue: string;
  };
  submittedAt: string;
  notes?: string;
  responded?: boolean;
  platform?: string;
}

interface Deliverable {
  clientName: string;
  date: string;
  loomUrl: string;
  diagnosis: {
    signal: string;
    friction: {
      mechanism: string;
      rootCause: string;
    };
    decisions: Array<{
      type: string;
      label: string;
      action: string;
      reasoning: string;
      tradeoff: string;
    }>;
  };
}

const spring = { type: "spring" as const, stiffness: 100, damping: 20 };

export default function AdminDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dashboard Tabs: 'details' or 'editor'
  const [activeTab, setActiveTab] = useState<'details' | 'editor'>('details');

  // CRM Notes state
  const [notesText, setNotesText] = useState("");
  
  // Outbound Sniper state
  const [selectedMechanism, setSelectedMechanism] = useState<string>("Cognitive Load");
  const [sniperCopied, setSniperCopied] = useState<string | null>(null);

  // Deliverable Editor state
  const [delLoading, setDelLoading] = useState(false);
  const [delSaving, setDelSaving] = useState(false);
  const [delClientLink, setDelClientLink] = useState("");
  const [deliverable, setDeliverable] = useState<Deliverable>({
    clientName: "",
    date: "",
    loomUrl: "",
    diagnosis: {
      signal: "",
      friction: { mechanism: "Cognitive Load", rootCause: "" },
      decisions: [
        { type: "A — Conservative", label: "", action: "", reasoning: "", tradeoff: "" },
        { type: "B — Aggressive", label: "", action: "", reasoning: "", tradeoff: "" },
        { type: "C — Lateral", label: "", action: "", reasoning: "", tradeoff: "" }
      ]
    }
  });

  // Load leads from API
  async function fetchLeads() {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:3001/api/leads");
      const data = await res.json();
      if (data.success) {
        setLeads(data.leads);
        if (data.leads.length > 0 && !selectedLead) {
          setSelectedLead(data.leads[0]);
          setNotesText(data.leads[0].notes || "");
        }
      }
    } catch (error) {
      console.error("Error loading leads", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;
    
    // Asynchronously fetch on mount to prevent synchronous cascading renders
    const loadLeadsOnMount = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/leads");
        const data = await res.json();
        if (data.success && isMounted) {
          setLeads(data.leads);
          if (data.leads.length > 0) {
            setSelectedLead(prev => {
              if (!prev) {
                setNotesText(data.leads[0].notes || "");
                return data.leads[0];
              }
              return prev;
            });
          }
        }
      } catch (error) {
        console.error("Error loading leads on mount", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadLeadsOnMount();

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync selected lead changes
  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setNotesText(lead.notes || "");
    setActiveTab('details'); // Reset tab on lead change
    setDelClientLink("");
  };

  // Fetch deliverable for selected client when editor tab is clicked
  useEffect(() => {
    async function fetchDeliverable() {
      if (!selectedLead || activeTab !== 'editor') return;
      
      const clientKey = selectedLead.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      try {
        setDelLoading(true);
        const res = await fetch(`http://localhost:3001/api/deliverables/${clientKey}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setDeliverable(data.deliverable);
            setDelClientLink(`http://localhost:3000/deliverable?client=${clientKey}`);
            return;
          }
        }
        
        // Fallback/Initialize empty deliverable with lead details
        setDeliverable({
          clientName: selectedLead.companyName,
          date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          loomUrl: "",
          diagnosis: {
            signal: "",
            friction: { mechanism: "Cognitive Load", rootCause: "" },
            decisions: [
              { type: "A — Conservative", label: "", action: "", reasoning: "", tradeoff: "" },
              { type: "B — Aggressive", label: "", action: "", reasoning: "", tradeoff: "" },
              { type: "C — Lateral", label: "", action: "", reasoning: "", tradeoff: "" }
            ]
          }
        });
        setDelClientLink("");
      } catch (e) {
        console.error("Error loading deliverable", e);
      } finally {
        setDelLoading(false);
      }
    }
    
    fetchDeliverable();
  }, [selectedLead, activeTab]);

  // Update Lead Status
  const handleUpdateStatus = async (leadId: string, status: Lead["status"]) => {
    if (!selectedLead) return;
    try {
      const res = await fetch(`http://localhost:3001/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        setLeads(leads.map(l => l.id === leadId ? data.lead : l));
        setSelectedLead(data.lead);
      }
    } catch (error) {
      console.error("Error updating status", error);
    }
  };

  // Save CRM Notes
  const handleSaveNotes = async () => {
    if (!selectedLead) return;
    try {
      setSaving(true);
      const res = await fetch(`http://localhost:3001/api/leads/${selectedLead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesText })
      });
      const data = await res.json();
      if (data.success) {
        setLeads(leads.map(l => l.id === selectedLead.id ? data.lead : l));
        setSelectedLead(data.lead);
      }
    } catch (error) {
      console.error("Error saving notes", error);
    } finally {
      setSaving(false);
    }
  };

  // Save/Publish Deliverable
  const handlePublishDeliverable = async () => {
    if (!selectedLead) return;
    const clientKey = selectedLead.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    try {
      setDelSaving(true);
      const res = await fetch(`http://localhost:3001/api/deliverables/${clientKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deliverable)
      });
      const data = await res.json();
      if (data.success) {
        setDelClientLink(`http://localhost:3000/deliverable?client=${clientKey}`);
        
        // Auto-progress lead status to "paid" if it was intake/sniper
        if (selectedLead.status === 'intake' || selectedLead.status === 'sniper') {
          await handleUpdateStatus(selectedLead.id, 'paid');
        }
        
        alert("Revenue diagnostic published successfully!");
      }
    } catch (e) {
      console.error("Error publishing deliverable", e);
      alert("Error publishing deliverable.");
    } finally {
      setDelSaving(false);
    }
  };

  // Automated sniper template generator (US style, high impact)
  const generateSniperPitches = (lead: Lead, mechanism: string) => {
    const company = lead.companyName;
    const contactName = lead.contact.split(",")[0] || "there";
    
    let observedBottleneck = "your primary signup loop";
    if (lead.intakeData.problemStatement.toLowerCase().includes("pricing")) {
      observedBottleneck = "your pricing page drop-off";
    } else if (lead.intakeData.problemStatement.toLowerCase().includes("activation") || lead.intakeData.problemStatement.toLowerCase().includes("onboarding")) {
      observedBottleneck = "your user onboarding sequence";
    }

    const pitches = {
      observation: `Hey ${contactName}, saw you are scaling the product team at ${company}. Audited your signups — there is a clear ${mechanism} bottleneck on ${observedBottleneck}. You are asking for configurations before they see the dashboard, which creates friction. I put together a quick, 2-line visual correction for this. No pitch, no call. Want me to send the mockup over in a DM?`,
      valueFirst: `Hey ${contactName}, I run async revenue diagnostics at Signal & Friction. I mapped ${company}'s primary activation funnel and isolated a critical ${mechanism} leak on ${observedBottleneck}. Users are dropping off because they encounter choice complexity. Restructuring those inputs into progressive micro-steps resolves the block. I compiled a high-fidelity visual mockup of this exact fix. Let me know if you want me to drop the image in your chat, no strings.`,
      followUp: `One quick detail on ${company}'s flow, ${contactName} — the pricing page defaults to annual pricing without displaying a clear ROI comparison, triggering Commitment Anxiety. We can resolve this programmatically. Check out our async protocol when you have a moment: signal-and-friction.com`
    };

    return pitches;
  };

  const activeLeads = leads.filter(l => l.status !== "archive");
  const pipelineValue = activeLeads.length * 1500 + leads.filter(l => l.status === "advisory").length * 3000 * 12;

  const getStatusBadgeColor = (status: Lead["status"]) => {
    switch (status) {
      case "intake": return "bg-accent/10 border-accent/20 text-accent";
      case "sniper": return "bg-blue-500/10 border-blue-500/20 text-blue-400";
      case "paid": return "bg-[#5C9A6B]/10 border-[#5C9A6B]/20 text-[#5C9A6B]";
      case "advisory": return "bg-purple-500/10 border-purple-500/20 text-purple-400";
      default: return "bg-text-faint/10 border-text-faint/20 text-text-muted";
    }
  };

  return (
    <main className="min-h-screen bg-[#0A0908] text-[#B8B0A8] flex flex-col font-sans overflow-hidden">
      {/* Top Tablet Navigation */}
      <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-[#121110]/60 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="font-serif text-[#F5F0EB] text-lg font-medium flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 100 100" fill="none">
              <path d="M15 85c15-5 25-25 35-40 5-8 15-15 25-20" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
              <path d="m60 35 15-10-5 17" stroke="#B85C38" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Signal &amp; Friction <span className="font-mono text-xs uppercase tracking-widest text-[#B0A89E] border border-[#222019] px-2 py-0.5 rounded-full ml-2">Revenue OS</span>
          </div>
        </div>
        
        {/* KPI Panel */}
        <div className="flex items-center gap-6 text-right">
          <div>
            <div className="font-mono text-[0.55rem] uppercase tracking-wider text-[#B0A89E]">Active Pipeline</div>
            <div className="text-sm font-medium text-[#F5F0EB] font-serif">${pipelineValue.toLocaleString()} USD</div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <div className="font-mono text-[0.55rem] uppercase tracking-wider text-[#B0A89E]">Active Leads</div>
            <div className="text-sm font-medium text-accent">{activeLeads.length}</div>
          </div>
        </div>
      </header>

      {/* Main 3-Pane Tablet Interface */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* PANE 1: LEADS LIST (Left Column) */}
        <aside className="w-80 border-r border-border flex flex-col bg-[#0E0D0C]/40 shrink-0">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-mono text-xs uppercase tracking-wider text-[#F5F0EB]">Inbound Pipeline</h2>
            <button onClick={fetchLeads} className="text-[#B0A89E] hover:text-[#F5F0EB] transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.253 8H18.2" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
            {loading ? (
              <div className="p-8 text-center text-xs text-[#B0A89E] animate-pulse">Loading leads...</div>
            ) : leads.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#B0A89E]">No intakes received yet.</div>
            ) : (
              leads.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => handleSelectLead(lead)}
                  className={`w-full text-left p-4 rounded border transition-all duration-300 flex flex-col gap-2 ${
                    selectedLead?.id === lead.id
                      ? "bg-[#1A1816] border-[#B85C38]/30 shadow-md"
                      : "bg-transparent border-transparent hover:bg-[#121110]/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-serif text-sm text-[#F5F0EB] truncate font-medium">{lead.companyName}</span>
                    <span className={`text-[0.55rem] font-mono uppercase px-2 py-0.5 border rounded-full shrink-0 ${getStatusBadgeColor(lead.status)}`}>
                      {lead.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[0.65rem] text-[#B0A89E] font-mono">
                    <span>{lead.industry.split("(")[0]}</span>
                    <span>{new Date(lead.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* PANE 2: DETAILED CRM VIEW & WORKSPACE (Center Pane) */}
        <section className="flex-1 flex flex-col overflow-y-auto p-8 scroll-smooth">
          <AnimatePresence mode="wait">
            {selectedLead ? (
              <motion.div
                key={selectedLead.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={spring}
                className="space-y-8 max-w-4xl mx-auto w-full pb-16"
              >
                {/* Header Information */}
                <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h1 className="text-3xl font-serif text-[#F5F0EB] leading-tight mb-2">{selectedLead.companyName}</h1>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#B0A89E]">
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-[#B85C38]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        {selectedLead.contact}
                      </span>
                      <span>·</span>
                      <span>{selectedLead.industry}</span>
                      <span>·</span>
                      <span>{selectedLead.intakeData.monthlyRevenue || "ARR undisclosed"}</span>
                    </div>
                  </div>

                  {/* Operational Controls */}
                  <div className="flex items-center gap-2 border border-border bg-[#121110] p-1 rounded-full shrink-0">
                    {[
                      { key: "intake", label: "Intake" },
                      { key: "sniper", label: "Sniper" },
                      { key: "paid", label: "Paid" },
                      { key: "advisory", label: "Advisory" },
                      { key: "archive", label: "Archive" }
                    ].map((btn) => (
                      <button
                        key={btn.key}
                        onClick={() => handleUpdateStatus(selectedLead.id, btn.key as Lead["status"])}
                        className={`text-[0.65rem] font-mono uppercase px-3 py-1.5 rounded-full transition-all duration-300 ${
                          selectedLead.status === btn.key
                            ? "bg-[#B85C38] text-white font-medium"
                            : "text-[#B0A89E] hover:text-[#F5F0EB]"
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sub-Tabs for CRM vs deliverable Builder */}
                <div className="flex border-b border-border">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`px-6 py-3 font-mono text-xs uppercase tracking-wider border-b-2 transition-all duration-300 ${
                      activeTab === 'details'
                        ? "border-[#B85C38] text-[#F5F0EB]"
                        : "border-transparent text-[#B0A89E] hover:text-[#B8B0A8]"
                    }`}
                  >
                    Lead Evaluation &amp; Outbound
                  </button>
                  <button
                    onClick={() => setActiveTab('editor')}
                    className={`px-6 py-3 font-mono text-xs uppercase tracking-wider border-b-2 transition-all duration-300 ${
                      activeTab === 'editor'
                        ? "border-[#B85C38] text-[#F5F0EB]"
                        : "border-transparent text-[#B0A89E] hover:text-[#B8B0A8]"
                    }`}
                  >
                    Diagnostic Brief Builder
                  </button>
                </div>

                {/* TAB 1: LEAD DETAILS & OUTBOUND SNIPER */}
                {activeTab === 'details' && (
                  <div className="space-y-8">
                    {/* Submissions Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Problem & Hypothesis */}
                      <div className="space-y-6">
                        <div className="border border-border bg-[#121110]/40 p-6 rounded">
                          <h3 className="font-mono text-[0.65rem] uppercase tracking-wider text-[#B0A89E] mb-3">Intake Statement</h3>
                          <p className="text-sm leading-[1.7] text-[#F5F0EB] whitespace-pre-wrap">{selectedLead.intakeData.problemStatement}</p>
                        </div>
                        
                        <div className="border border-border bg-[#121110]/40 p-6 rounded">
                          <h3 className="font-mono text-[0.65rem] uppercase tracking-wider text-[#B0A89E] mb-3">Current Hypothesis</h3>
                          <p className="text-sm leading-[1.7] italic">{selectedLead.intakeData.currentHypothesis || "None submitted."}</p>
                        </div>
                      </div>

                      {/* Funnel Metrics */}
                      <div className="border border-border bg-[#121110]/40 p-6 rounded flex flex-col justify-between">
                        <div>
                          <h3 className="font-mono text-[0.65rem] uppercase tracking-wider text-[#B0A89E] mb-6">Funnel Metrics (SaaS Drop-offs)</h3>
                          <div className="space-y-4">
                            {[
                              { label: "Signup → Pricing Page", val: selectedLead.intakeData.funnelMetrics.signupToPricing },
                              { label: "Pricing Page → Checkout", val: selectedLead.intakeData.funnelMetrics.pricingToCheckout },
                              { label: "Checkout → Paid Upgrade", val: selectedLead.intakeData.funnelMetrics.checkoutToPaid }
                            ].map((metric, i) => (
                              <div key={i} className="flex justify-between items-center border-b border-border pb-3 last:border-0 last:pb-0">
                                <span className="text-xs text-[#B0A89E] font-mono">{metric.label}</span>
                                <span className="text-sm font-semibold text-[#F5F0EB]">{metric.val || "Unavailable"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="mt-6 pt-6 border-t border-border flex items-center justify-between text-[0.65rem] text-text-faint font-mono">
                          <span>Submitted</span>
                          <span>{new Date(selectedLead.submittedAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* CRM Execution Notes Panel */}
                    <div className="border border-border bg-[#121110]/30 p-6 rounded space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-mono text-[0.65rem] uppercase tracking-wider text-[#B0A89E] flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                          Internal CRM Execution Notes
                        </h3>
                        <button
                          onClick={handleSaveNotes}
                          disabled={saving}
                          className="text-[0.65rem] font-mono uppercase bg-[#1A1816] text-[#F5F0EB] px-4 py-2 border border-border-hi rounded hover:bg-[#222019] transition-colors duration-300 disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save Notes"}
                        </button>
                      </div>
                      <textarea
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                        placeholder="Enter private strategic evaluations, diagnostic status, delivery timelines, or follow-up notes here..."
                        className="w-full h-24 bg-[#0A0908] border border-border rounded p-4 text-sm text-[#F5F0EB] focus:outline-none focus:border-accent/40 leading-relaxed font-mono"
                      />
                    </div>

                    {/* ADVANCED MODULE: Outbound Sniper Pitch Console */}
                    <div className="border border-[#B85C38]/20 bg-[#121110]/20 p-6 rounded space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
                        <div>
                          <h3 className="font-serif text-lg text-[#F5F0EB]">Outbound Sniper Console</h3>
                          <p className="text-xs text-[#B0A89E] font-mono mt-1">Generate high-converting American outbound copy with Reforge &amp; Stanford behavioral triggers.</p>
                        </div>
                        
                        {/* Mechanism Selector */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[0.65rem] font-mono text-[#B0A89E] uppercase">Friction Pivot:</span>
                          <select
                            value={selectedMechanism}
                            onChange={(e) => setSelectedMechanism(e.target.value)}
                            className="bg-[#121110] border border-border text-xs rounded px-3 py-1.5 focus:outline-none font-mono text-[#F5F0EB]"
                          >
                            {["Cognitive Load", "Trust Deficit", "Commitment Anxiety", "Ordering Error", "Identity Friction", "Value Uncertainty"].map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Generated Pitch Variations */}
                      <div className="space-y-4">
                        {(() => {
                          const pitches = generateSniperPitches(selectedLead, selectedMechanism);
                          return (
                            <>
                              {[
                                { key: "obs", title: "Version A · Direct Observation (Low Friction)", text: pitches.observation },
                                { key: "val", title: "Version B · High Value Lead-In (High Return)", text: pitches.valueFirst },
                                { key: "flw", title: "Version C · Diagnostic Follow-Up (Staggered)", text: pitches.followUp }
                              ].map((pitch) => (
                                <div key={pitch.key} className="bg-[#0A0908] border border-border p-5 rounded space-y-3 relative group">
                                  <div className="flex justify-between items-center">
                                    <span className="font-mono text-xs text-[#B0A89E] uppercase tracking-wider">{pitch.title}</span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(pitch.text);
                                        setSniperCopied(pitch.key);
                                        setTimeout(() => setSniperCopied(null), 2000);
                                      }}
                                      className="text-xs font-mono uppercase bg-[#121110] text-[#B8B0A8] px-3 py-1 rounded-md border border-border group-hover:border-accent/40 group-hover:text-accent-light transition-all duration-300"
                                    >
                                      {sniperCopied === pitch.key ? "Copied!" : "Copy Pitch"}
                                    </button>
                                  </div>
                                  <p className="text-xs leading-[1.7] text-[#F5F0EB] select-all pr-12 font-mono whitespace-pre-wrap">{pitch.text}</p>
                                </div>
                              ))}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: DYNAMIC DIAGNOSTIC BRIEF BUILDER */}
                {activeTab === 'editor' && (
                  <div className="space-y-8">
                    {delLoading ? (
                      <div className="p-12 text-center text-xs text-[#B0A89E] animate-pulse">Loading secure client brief...</div>
                    ) : (
                      <div className="space-y-8">
                        {/* Status bar */}
                        {delClientLink && (
                          <div className="bg-[#5C9A6B]/10 border border-[#5C9A6B]/25 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="text-xs text-[#5C9A6B] font-mono">
                              ✓ Brief is live at: <span className="text-[#F5F0EB] underline select-all">{delClientLink}</span>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(delClientLink);
                                alert("Live Client Portal Link copied!");
                              }}
                              className="text-xs font-mono uppercase bg-[#5C9A6B]/20 hover:bg-[#5C9A6B]/30 text-[#5C9A6B] border border-[#5C9A6B]/30 px-3 py-1.5 rounded-md transition-all shrink-0"
                            >
                              Copy Live Portal URL
                            </button>
                          </div>
                        )}

                        {/* Brief Builder Form */}
                        <div className="border border-border bg-[#121110]/40 p-6 rounded space-y-6">
                          <div className="flex items-center justify-between border-b border-border pb-4">
                            <h3 className="font-serif text-lg text-[#F5F0EB]">Revenue Diagnostic Brief Editor</h3>
                            <button
                              onClick={handlePublishDeliverable}
                              disabled={delSaving}
                              className="text-xs font-mono uppercase bg-[#B85C38] hover:bg-[#D4764E] text-white px-5 py-2.5 rounded transition-all duration-300 disabled:opacity-50 shadow-lg shadow-accent/15"
                            >
                              {delSaving ? "Publishing..." : "Publish & Make Live"}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Input: Loom URL */}
                            <div className="space-y-2">
                              <label className="text-[0.65rem] font-mono uppercase tracking-wider text-[#B0A89E]">Loom Video Walkthrough URL</label>
                              <input
                                type="text"
                                value={deliverable.loomUrl}
                                onChange={(e) => setDeliverable({ ...deliverable, loomUrl: e.target.value })}
                                placeholder="https://www.loom.com/share/placeholder-id"
                                className="w-full bg-[#0A0908] border border-border rounded p-3 text-xs text-[#F5F0EB] focus:outline-none focus:border-accent/40 font-mono"
                              />
                            </div>
                            {/* Selector: Mechanism */}
                            <div className="space-y-2">
                              <label className="text-[0.65rem] font-mono uppercase tracking-wider text-[#B0A89E]">Primary Friction Mechanism</label>
                              <select
                                value={deliverable.diagnosis.friction.mechanism}
                                onChange={(e) => setDeliverable({
                                  ...deliverable,
                                  diagnosis: {
                                    ...deliverable.diagnosis,
                                    friction: { ...deliverable.diagnosis.friction, mechanism: e.target.value }
                                  }
                                })}
                                className="w-full bg-[#0A0908] border border-border rounded p-3 text-xs text-[#F5F0EB] focus:outline-none focus:border-accent/40 font-mono"
                              >
                                {["Cognitive Load", "Trust Deficit", "Commitment Anxiety", "Ordering Error", "Identity Friction", "Value Uncertainty"].map((m) => (
                                  <option key={m} value={m}>{m}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Input: The Signal */}
                          <div className="space-y-2">
                            <label className="text-[0.65rem] font-mono uppercase tracking-wider text-[#B0A89E]">01 — The Funnel Signal (Observable Drops)</label>
                            <textarea
                              value={deliverable.diagnosis.signal}
                              onChange={(e) => setDeliverable({
                                ...deliverable,
                                diagnosis: { ...deliverable.diagnosis, signal: e.target.value }
                              })}
                              placeholder="e.g. 80% of users land on the pricing page. Only 15% proceed to checkout..."
                              className="w-full h-24 bg-[#0A0908] border border-border rounded p-4 text-xs text-[#F5F0EB] focus:outline-none focus:border-accent/40 leading-relaxed font-mono"
                            />
                          </div>

                          {/* Input: Root Cause */}
                          <div className="space-y-2">
                            <label className="text-[0.65rem] font-mono uppercase tracking-wider text-[#B0A89E]">02 — Root Cause Analysis (Behavioral Science perspective)</label>
                            <textarea
                              value={deliverable.diagnosis.friction.rootCause}
                              onChange={(e) => setDeliverable({
                                ...deliverable,
                                diagnosis: {
                                  ...deliverable.diagnosis,
                                  friction: { ...deliverable.diagnosis.friction, rootCause: e.target.value }
                                }
                              })}
                              placeholder="e.g. The pricing page forces complex choice calculations paralyzing user focus..."
                              className="w-full h-24 bg-[#0A0908] border border-border rounded p-4 text-xs text-[#F5F0EB] focus:outline-none focus:border-accent/40 leading-relaxed font-mono"
                            />
                          </div>
                        </div>

                        {/* 3 Decisions Builder */}
                        <div className="border border-border bg-[#121110]/40 p-6 rounded space-y-6">
                          <h3 className="font-serif text-lg text-[#F5F0EB] border-b border-border pb-3">03 — Three Strategic Growth Decisions</h3>

                          <div className="space-y-8">
                            {deliverable.diagnosis.decisions.map((decision, i) => (
                              <div key={i} className="border border-border p-5 rounded space-y-4 bg-[#0A0908]/40">
                                <div className="text-[0.65rem] font-mono text-accent uppercase tracking-wider border-b border-border pb-2">
                                  Option {decision.type}
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                  {/* Label */}
                                  <div className="space-y-1">
                                    <label className="text-[0.55rem] font-mono uppercase tracking-widest text-[#B0A89E]">Decision Title/Label</label>
                                    <input
                                      type="text"
                                      value={decision.label}
                                      onChange={(e) => {
                                        const newDecisions = [...deliverable.diagnosis.decisions];
                                        newDecisions[i].label = e.target.value;
                                        setDeliverable({
                                          ...deliverable,
                                          diagnosis: { ...deliverable.diagnosis, decisions: newDecisions }
                                        });
                                      }}
                                      placeholder="e.g. Collapse pricing tiers from 4 to 2 visible cards"
                                      className="w-full bg-[#0A0908] border border-border rounded p-3 text-xs text-[#F5F0EB] focus:outline-none focus:border-accent/40 font-mono"
                                    />
                                  </div>

                                  {/* Action */}
                                  <div className="space-y-1">
                                    <label className="text-[0.55rem] font-mono uppercase tracking-widest text-[#B0A89E]">Action Details</label>
                                    <textarea
                                      value={decision.action}
                                      onChange={(e) => {
                                        const newDecisions = [...deliverable.diagnosis.decisions];
                                        newDecisions[i].action = e.target.value;
                                        setDeliverable({
                                          ...deliverable,
                                          diagnosis: { ...deliverable.diagnosis, decisions: newDecisions }
                                        });
                                      }}
                                      placeholder="What specific product changes are implemented?"
                                      className="w-full h-16 bg-[#0A0908] border border-border rounded p-3 text-xs text-[#F5F0EB] focus:outline-none focus:border-accent/40 font-mono"
                                    />
                                  </div>

                                  {/* Reasoning */}
                                  <div className="space-y-1">
                                    <label className="text-[0.55rem] font-mono uppercase tracking-widest text-[#B0A89E]">Behavioral Reasoning</label>
                                    <textarea
                                      value={decision.reasoning}
                                      onChange={(e) => {
                                        const newDecisions = [...deliverable.diagnosis.decisions];
                                        newDecisions[i].reasoning = e.target.value;
                                        setDeliverable({
                                          ...deliverable,
                                          diagnosis: { ...deliverable.diagnosis, decisions: newDecisions }
                                        });
                                      }}
                                      placeholder="Why does this fix work psychologically (Hick's Law, Fogg Model)?"
                                      className="w-full h-16 bg-[#0A0908] border border-border rounded p-3 text-xs text-[#F5F0EB] focus:outline-none focus:border-accent/40 font-mono"
                                    />
                                  </div>

                                  {/* Trade-off */}
                                  <div className="space-y-1">
                                    <label className="text-[0.55rem] font-mono uppercase tracking-widest text-[#B0A89E]">Risk &amp; Trade-off</label>
                                    <textarea
                                      value={decision.tradeoff}
                                      onChange={(e) => {
                                        const newDecisions = [...deliverable.diagnosis.decisions];
                                        newDecisions[i].tradeoff = e.target.value;
                                        setDeliverable({
                                          ...deliverable,
                                          diagnosis: { ...deliverable.diagnosis, decisions: newDecisions }
                                        });
                                      }}
                                      placeholder="What is the downside risk and how is it mitigated?"
                                      className="w-full h-16 bg-[#0A0908] border border-border rounded p-3 text-xs text-[#F5F0EB] focus:outline-none focus:border-accent/40 font-mono"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex justify-end pt-4">
                            <button
                              onClick={handlePublishDeliverable}
                              disabled={delSaving}
                              className="text-xs font-mono uppercase bg-[#B85C38] hover:bg-[#D4764E] text-white px-8 py-3 rounded transition-all duration-300 disabled:opacity-50 shadow-lg shadow-accent/15"
                            >
                              {delSaving ? "Publishing..." : "Publish & Make Live"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-[#B0A89E]">
                Select a B2B SaaS lead from the pipeline directory to activate the workspace.
              </div>
            )}
          </AnimatePresence>
        </section>

        {/* PANE 3: STRIPE SHORTCUTS & DAILY ZEN CHECKLIST (Right Sidebar) */}
        <aside className="w-80 border-l border-border bg-[#0E0D0C]/40 shrink-0 p-6 space-y-8 overflow-y-auto">
          
          {/* Section: Stripe Payments Quick Links */}
          <div className="space-y-4">
            <h2 className="font-mono text-xs uppercase tracking-wider text-[#F5F0EB] border-b border-border pb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Payment Terminals
            </h2>
            
            <div className="space-y-3">
              {[
                { label: "Revenue Diagnostic ($1,500)", copyVal: "https://buy.stripe.com/mock-diagnostic-usd-1500" },
                { label: "Advisory Retainer ($3,000/mo)", copyVal: "https://buy.stripe.com/mock-advisory-usd-3000" }
              ].map((link, idx) => (
                <div key={idx} className="bg-[#121110] border border-border p-4 rounded flex flex-col gap-3 group hover:border-[#B85C38]/20 transition-all duration-300">
                  <div className="font-serif text-xs text-[#F5F0EB] font-medium">{link.label}</div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(link.copyVal);
                      alert(`${link.label} Stripe Link copied!`);
                    }}
                    className="w-full text-center text-[0.65rem] font-mono uppercase bg-[#0A0908] border border-border rounded py-2 text-[#B0A89E] group-hover:text-accent-light group-hover:border-accent/30 transition-all duration-300"
                  >
                    Copy Stripe Link
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Zen Daily Operational Checklist */}
          <div className="space-y-4">
            <h2 className="font-mono text-xs uppercase tracking-wider text-[#F5F0EB] border-b border-border pb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-[#5C9A6B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              Daily Zen Protocol
            </h2>
            
            <div className="space-y-3 font-mono text-[0.65rem]">
              {[
                { task: "Check inbox & Tally intakes", detail: "Review new PLG pipelines." },
                { task: "Run 3 sniper outbound pitches", detail: "Apply behavioral design levers." },
                { task: "Monitor active diagnostics", detail: "Maintain 72-hour async SLA." },
                { task: "Deliver diagnostics (Loom/PDF)", detail: "Strict async, zero-call delivery." },
                { task: "Verify Stripe subscription pipelines", detail: "Ongoing advisory MRR health." }
              ].map((item, idx) => (
                <label key={idx} className="flex items-start gap-3 p-3 bg-[#121110]/40 rounded border border-border cursor-pointer select-none hover:bg-[#121110] transition-colors">
                  <input type="checkbox" className="mt-1 h-3.5 w-3.5 accent-[#B85C38] rounded border-border bg-[#0A0908]" />
                  <div className="space-y-1">
                    <div className="text-[#F5F0EB] font-medium leading-tight">{item.task}</div>
                    <div className="text-text-faint text-[0.55rem]">{item.detail}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          
        </aside>

      </div>
    </main>
  );
}
