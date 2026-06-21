"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAuthHeaders } from "@/lib/supabase";
import { AdminStatCard, RevenueProgressBar } from "@/components/admin/AdminComponents";

interface DashboardMetrics {
  totalLeads: number;
  outreachSent: number;
  diagnosticsDelivered: number;
  dealsClosed: number;
  conversionRate: number;
  highTicketCount?: number;
  microdosingCount?: number;
  certifiedCount?: number;
  activeGuaranteesCount?: number;
  avgCognitiveFatigue?: number;
  frictionCounts: {
    cognitive_load: number;
    trust_deficit: number;
    value_deficit: number;
    sequence_order: number;
  };
  pipeline: Array<{
    id: string;
    company_name: string;
    contact_name: string;
    contact_email: string;
    status: string;
    payment_status: string;
    segment?: string;
    is_certified?: boolean;
    cognitive_fatigue_score?: number;
    private_notes?: string;
    guarantee_active?: boolean;
    expansion_score?: number;
    projectId?: string;
    created_at?: string;
    delivered_at?: string;
    guarantee?: {
      id: string;
      target_improvement_pct: number;
      timeframe_days: number;
      traffic_gate_met: boolean;
      sla_gate_met: boolean;
      isolation_gate_met: boolean;
      telemetry_gate_met: boolean;
      baseline_conversion_rate: number;
      current_conversion_rate: number;
      guarantee_status: 'active' | 'met' | 'failed_refunded' | 'voided';
    } | null;
  }>;
}

interface ClientWithDetails {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  industry: string;
  segment?: 'high_ticket' | 'microdosing';
  is_certified?: boolean;
  cognitive_fatigue_score?: number;
  private_notes?: string;
  beta_projects?: Array<{
    id: string;
    status: string;
    payment_status: string;
    guarantee_active?: boolean;
    expansion_score?: number;
    performance_guarantees?: Array<{
      id: string;
      project_id: string;
      target_improvement_pct: number;
      timeframe_days: number;
      traffic_gate_met: boolean;
      sla_gate_met: boolean;
      isolation_gate_met: boolean;
      telemetry_gate_met: boolean;
      baseline_conversion_rate: number;
      current_conversion_rate: number;
      guarantee_status: 'active' | 'met' | 'failed_refunded' | 'voided';
      started_at: string;
      expires_at: string;
    }>;
  }>;
  interactions?: Array<{
    dominant_friction_mechanism?: string;
  }>;
}

interface AIIncident {
  id: string;
  incident_type: 'ai_hallucination' | 'process_error' | 'client_friction' | 'automation_failure' | 'data_quality_issue' | 'prompt_improvement' | 'tool_misuse' | 'unexpected_outcome';
  severity: 'low' | 'medium' | 'high' | 'critical';
  phase: 'prospecting' | 'outreach' | 'follow_up' | 'diagnostic' | 'delivery' | 'testimonial' | 'portfolio' | 'backend' | 'dashboard' | 'mcp_server';
  description: string;
  root_cause?: string;
  hallucination_snippet?: string;
  affected_client_id?: string;
  affected_project_id?: string;
  resolution?: string;
  lesson_learned?: string;
  applied_improvement?: string;
  improvement_type?: string;
  iteration_version?: string;
  created_at: string;
  resolved_at?: string;
}

interface PromptVersion {
  id: string;
  phase: string;
  prompt_text: string;
  iteration_version: string;
  created_at: string;
}

interface LeadRecord {
  id: string;
  email: string;
  company: string | null;
  website: string | null;
  segment: 'DFY' | 'DWY';
  answers: Record<string, unknown>;
  source: string;
  created_at: string;
}

const springConfig = { type: "spring" as const, stiffness: 100, damping: 18 };

export default function AdminDashboard() {
  const [activeView, setActiveView] = useState<'pipeline' | 'learning'>('pipeline');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [incidents, setIncidents] = useState<AIIncident[]>([]);
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [revenueSparkline, setRevenueSparkline] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [arrTotal, setArrTotal] = useState<number>(0);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  const [showLeadDrawer, setShowLeadDrawer] = useState(false);
  const [stripeSparklines, setStripeSparklines] = useState<number[]>([]);

  // Kanban Filter & Logs/Interactions states
  const [kanbanFilter, setKanbanFilter] = useState<string | null>(null);
  const [selectedClientLogs, setSelectedClientLogs] = useState<any[]>([]);
  const [selectedClientInteractions, setSelectedClientInteractions] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDiagnosticForm, setShowDiagnosticForm] = useState(false);
  const [loomUrl, setLoomUrl] = useState("");
  const [figmaUrl, setFigmaUrl] = useState("");
  const [diagSignal, setDiagSignal] = useState("");
  const [diagMechanism, setDiagMechanism] = useState("Cognitive Load");
  const [diagRootCause, setDiagRootCause] = useState("");
  const [diagnosticError, setDiagnosticError] = useState("");
  const [mcpToast, setMcpToast] = useState("");

  // Parameter modal states
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalPrivateNotes, setModalPrivateNotes] = useState("");
  const [modalIsCertified, setModalIsCertified] = useState(false);
  const [modalSegment, setModalSegment] = useState<"high_ticket" | "microdosing">("high_ticket");
  const [modalCognitiveFatigue, setModalCognitiveFatigue] = useState(50);
  const [modalGuaranteeActive, setModalGuaranteeActive] = useState(false);
  const [modalTrafficGate, setModalTrafficGate] = useState(false);
  const [modalSlaGate, setModalSlaGate] = useState(false);
  const [modalIsolationGate, setModalIsolationGate] = useState(false);
  const [modalTelemetryGate, setModalTelemetryGate] = useState(false);
  const [modalTargetImprovement, setModalTargetImprovement] = useState(20);
  const [modalTimeframeDays, setModalTimeframeDays] = useState(30);
  const [modalBaselineRate, setModalBaselineRate] = useState(0);
  const [modalCurrentRate, setModalCurrentRate] = useState(0);
  const [modalGuaranteeStatus, setModalGuaranteeStatus] = useState<'active' | 'met' | 'failed_refunded' | 'voided'>('active');

  const openClientModal = async (client: any) => {
    setSelectedClient(client);
    setModalPrivateNotes(client.private_notes || "");
    setModalIsCertified(!!client.is_certified);
    setModalSegment(client.segment || "high_ticket");
    setModalCognitiveFatigue(client.cognitive_fatigue_score || 50);
    setModalGuaranteeActive(!!client.guarantee_active);
    setLoomUrl("");
    setFigmaUrl("");
    setShowDiagnosticForm(false);
    setDiagnosticError("");
    setSelectedClientLogs([]);
    setSelectedClientInteractions([]);
    
    if (client.guarantee) {
      setModalTrafficGate(!!client.guarantee.traffic_gate_met);
      // Auto-compute SLA gate: delivered within 72h of lead created_at
      const autoSla = client.created_at && client.delivered_at
        ? (new Date(client.delivered_at).getTime() - new Date(client.created_at).getTime()) / 3600000 <= 72
        : !!client.guarantee.sla_gate_met;
      setModalSlaGate(autoSla);
      setModalIsolationGate(!!client.guarantee.isolation_gate_met);
      setModalTelemetryGate(!!client.guarantee.telemetry_gate_met);
      setModalTargetImprovement(client.guarantee.target_improvement_pct || 20);
      setModalTimeframeDays(client.guarantee.timeframe_days || 30);
      setModalBaselineRate(client.guarantee.baseline_conversion_rate || 0);
      setModalCurrentRate(client.guarantee.current_conversion_rate || 0);
      setModalGuaranteeStatus(client.guarantee.guarantee_status || 'active');
    } else {
      setModalTrafficGate(false);
      setModalSlaGate(false);
      setModalIsolationGate(false);
      setModalTelemetryGate(false);
      setModalTargetImprovement(20);
      setModalTimeframeDays(30);
      setModalBaselineRate(0);
      setModalCurrentRate(0);
      setModalGuaranteeStatus('active');
    }
    setShowModal(true);

    // Fetch client activity log and interactions
    setLoadingLogs(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tsaarsuuclvkjsgjcmoj.supabase.co";
      const headers = getAuthHeaders();
      const resLogs = await fetch(`${supabaseUrl}/rest/v1/activity_log?client_id=eq.${client.id}&order=created_at.desc`, { headers });
      if (resLogs.ok) {
        const logsData = await resLogs.json();
        setSelectedClientLogs(logsData);
      }
      const resInteractions = await fetch(`${supabaseUrl}/rest/v1/interactions?client_id=eq.${client.id}&order=created_at.desc`, { headers });
      if (resInteractions.ok) {
        const interactionsData = await resInteractions.json();
        setSelectedClientInteractions(interactionsData);
      }
    } catch (e) {
      console.warn("Could not load client details:", e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handlePipelineAction = async (newStatus: string, mcpCommand?: string) => {
    if (!selectedClient || !selectedClient.projectId) return;
    setActionLoading(newStatus);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tsaarsuuclvkjsgjcmoj.supabase.co";
      const headers = getAuthHeaders();

      if (mcpCommand) {
        try {
          await navigator.clipboard.writeText(mcpCommand);
          setMcpToast(`Copied MCP: ${mcpCommand}`);
          setTimeout(() => setMcpToast(""), 4000);
        } catch {}
      }

      // 1. PATCH project status
      const res = await fetch(`${supabaseUrl}/rest/v1/beta_projects?id=eq.${selectedClient.projectId}`, {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
      });
      if (!res.ok) throw new Error("Failed to transition project status");

      // 2. Log activity
      await fetch(`${supabaseUrl}/rest/v1/activity_log`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          client_id: selectedClient.id,
          message: mcpCommand ? `Triggered MCP: ${mcpCommand}` : `Project status transitioned to ${newStatus}`,
          created_at: new Date().toISOString()
        })
      });

      // Update local client copy
      setSelectedClient((prev: any) => prev ? { ...prev, status: newStatus } : null);
      
      // Refresh log
      const resLogs = await fetch(`${supabaseUrl}/rest/v1/activity_log?client_id=eq.${selectedClient.id}&order=created_at.desc`, { headers });
      if (resLogs.ok) {
        setSelectedClientLogs(await resLogs.json());
      }
      
      await fetchAllData();
    } catch (e: any) {
      alert(`Action failed: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendFollowup = async () => {
    if (!selectedClient || !selectedClient.projectId) return;
    setActionLoading("followup");
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tsaarsuuclvkjsgjcmoj.supabase.co";
      const headers = getAuthHeaders();

      // Update project followup sent timestamp
      await fetch(`${supabaseUrl}/rest/v1/beta_projects?id=eq.${selectedClient.projectId}`, {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          followup_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      });

      // Log activity
      await fetch(`${supabaseUrl}/rest/v1/activity_log`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          client_id: selectedClient.id,
          message: "Follow-up outreach sent to client",
          created_at: new Date().toISOString()
        })
      });

      // Refresh timeline
      const resLogs = await fetch(`${supabaseUrl}/rest/v1/activity_log?client_id=eq.${selectedClient.id}&order=created_at.desc`, { headers });
      if (resLogs.ok) {
        setSelectedClientLogs(await resLogs.json());
      }
      
      await fetchAllData();
    } catch (e: any) {
      alert(`Action failed: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!selectedClient || !selectedClient.projectId) return;
    if (!loomUrl || !loomUrl.includes("loom.com/")) {
      setDiagnosticError("A valid Loom URL is required (e.g. loom.com/share/...)");
      return;
    }
    setDiagnosticError("");
    setActionLoading("delivered");
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tsaarsuuclvkjsgjcmoj.supabase.co";
      const headers = getAuthHeaders();

      // 1. Insert interaction
      const resInter = await fetch(`${supabaseUrl}/rest/v1/interactions`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          client_id: selectedClient.id,
          diagnostic_loom_url: loomUrl,
          figma_annotated_url: figmaUrl || null,
          funnel_signal: "diagnostic_delivered",
          dominant_friction_mechanism: selectedClientInteractions[0]?.dominant_friction_mechanism || "cognitive_load",
          root_cause_description: "Friction diagnostic analysis delivered with video walkthrough.",
          created_at: new Date().toISOString()
        })
      });
      if (!resInter.ok) throw new Error("Failed to insert diagnostic deliverables");

      // 2. PATCH status to delivered
      await fetch(`${supabaseUrl}/rest/v1/beta_projects?id=eq.${selectedClient.projectId}`, {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: "delivered",
          delivered_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      });

      // 3. Log activity
      await fetch(`${supabaseUrl}/rest/v1/activity_log`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          client_id: selectedClient.id,
          message: `Diagnostic delivered successfully. Loom: ${loomUrl}`,
          created_at: new Date().toISOString()
        })
      });

      // 4. Write deliverable to Supabase — page goes live immediately, no rebuild needed
      const clientKey = (selectedClient.company || selectedClient.name || "client")
        .toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const deliverableData = {
        clientKey,
        clientName: selectedClient.company || selectedClient.name || "Client",
        date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        consultant: "Signal & Friction",
        loomUrl,
        figmaUrl: figmaUrl || null,
        segment: (selectedClient.segment === "DFY" || selectedClient.segment === "high_ticket") ? "high_ticket" : "microdosing",
        founderFocusScore: 85,
        daysRemaining: 30,
        guaranteeStatus: "20% Growth Guarantee Active",
        telemetryStatus: "✓ Traffic & Baseline Confirmed",
        diagnosis: {
          signal: diagSignal || "Custom diagnostic analysis delivered via Loom walkthrough. See video for complete funnel signal breakdown.",
          friction: {
            mechanism: diagMechanism || "Cognitive Load",
            rootCause: diagRootCause || "See Loom video for complete root cause analysis and recommended intervention stack.",
          },
          decisions: [],
        },
      };
      await fetch(`${supabaseUrl}/rest/v1/deliverables`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates",
        },
        body: JSON.stringify({ client_key: clientKey, data: deliverableData, updated_at: new Date().toISOString() }),
      });

      // 5. Fire delivery notification email — non-fatal, idempotent
      fetch(`/api/notify-delivery/${clientKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientEmail: selectedClient.contact_email,
          clientName: selectedClient.company_name || selectedClient.company || "",
          clientId: selectedClient.id,
        }),
      }).catch(() => {});

      setSelectedClient((prev: any) => prev ? { ...prev, status: "delivered" } : null);
      setShowDiagnosticForm(false);
      setLoomUrl("");
      setFigmaUrl("");
      setDiagSignal("");
      setDiagMechanism("Cognitive Load");
      setDiagRootCause("");
      
      // Refresh interactions & logs
      const resLogs = await fetch(`${supabaseUrl}/rest/v1/activity_log?client_id=eq.${selectedClient.id}&order=created_at.desc`, { headers });
      if (resLogs.ok) {
        setSelectedClientLogs(await resLogs.json());
      }
      const resInteractions = await fetch(`${supabaseUrl}/rest/v1/interactions?client_id=eq.${selectedClient.id}&order=created_at.desc`, { headers });
      if (resInteractions.ok) {
        setSelectedClientInteractions(await resInteractions.json());
      }

      await fetchAllData();
    } catch (e: any) {
      setDiagnosticError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveClientDetails = async () => {
    if (!selectedClient) return;
    setLoading(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tsaarsuuclvkjsgjcmoj.supabase.co";
      const headers = getAuthHeaders();

      // 1. Update client
      const resClient = await fetch(`${supabaseUrl}/rest/v1/clients?id=eq.${selectedClient.id}`, {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          private_notes: modalPrivateNotes,
          is_certified: modalIsCertified,
          segment: modalSegment,
          cognitive_fatigue_score: modalCognitiveFatigue,
          updated_at: new Date().toISOString()
        })
      });

      if (!resClient.ok) throw new Error("Failed to update client");

      // 2. Update beta_project guarantee_active status
      if (selectedClient.projectId) {
        const resProj = await fetch(`${supabaseUrl}/rest/v1/beta_projects?id=eq.${selectedClient.projectId}`, {
          method: "PATCH",
          headers: {
            ...headers,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            guarantee_active: modalGuaranteeActive,
            symbolic_price_charged: modalSegment === "microdosing" ? 350.00 : 2000.00,
            updated_at: new Date().toISOString()
          })
        });
        if (!resProj.ok) throw new Error("Failed to update project");

        // 3. Upsert performance guarantee
        if (modalGuaranteeActive) {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + modalTimeframeDays);

          const resGuar = await fetch(`${supabaseUrl}/rest/v1/performance_guarantees`, {
            method: "POST",
            headers: {
              ...headers,
              "Content-Type": "application/json",
              "Prefer": "resolution=merge-duplicates"
            },
            body: JSON.stringify({
              project_id: selectedClient.projectId,
              target_improvement_pct: modalTargetImprovement,
              timeframe_days: modalTimeframeDays,
              traffic_gate_met: modalTrafficGate,
              sla_gate_met: modalSlaGate,
              isolation_gate_met: modalIsolationGate,
              telemetry_gate_met: modalTelemetryGate,
              baseline_conversion_rate: modalBaselineRate,
              current_conversion_rate: modalCurrentRate,
              guarantee_status: modalGuaranteeStatus,
              expires_at: expiresAt.toISOString(),
              updated_at: new Date().toISOString()
            })
          });
          if (!resGuar.ok) throw new Error("Failed to upsert guarantee");
        } else {
          // If deactivated, delete or set to voided
          await fetch(`${supabaseUrl}/rest/v1/performance_guarantees?project_id=eq.${selectedClient.projectId}`, {
            method: "DELETE",
            headers
          });
        }
      }

      setShowModal(false);
      fetchAllData();
    } catch (err) {
      console.warn("Failed to save via API, applying local updates:", err);
      // Fallback state update for offline demo
      setMetrics(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          pipeline: prev.pipeline.map(p => {
            if (p.id === selectedClient.id) {
              return {
                ...p,
                private_notes: modalPrivateNotes,
                is_certified: modalIsCertified,
                segment: modalSegment,
                cognitive_fatigue_score: modalCognitiveFatigue,
                guarantee_active: modalGuaranteeActive,
                guarantee: modalGuaranteeActive ? {
                  id: p.guarantee?.id || "guar-new",
                  target_improvement_pct: modalTargetImprovement,
                  timeframe_days: modalTimeframeDays,
                  traffic_gate_met: modalTrafficGate,
                  sla_gate_met: modalSlaGate,
                  isolation_gate_met: modalIsolationGate,
                  telemetry_gate_met: modalTelemetryGate,
                  baseline_conversion_rate: modalBaselineRate,
                  current_conversion_rate: modalCurrentRate,
                  guarantee_status: modalGuaranteeStatus,
                } : null
              };
            }
            return p;
          })
        };
      });
      setShowModal(false);
      setLoading(false);
    }
  };

  async function fetchAllData() {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tsaarsuuclvkjsgjcmoj.supabase.co";
      const headers = getAuthHeaders();

      // 1. Fetch clients with projects, nested guarantees, and interactions
      const resClients = await fetch(`${supabaseUrl}/rest/v1/clients?select=*,beta_projects(*,performance_guarantees(*)),interactions(*)`, {
        headers,
      });

      if (!resClients.ok) throw new Error("Failed to connect to Supabase API.");
      const data: ClientWithDetails[] = await resClients.json();

      // 2. Fetch AI incidents
      const resInc = await fetch(`${supabaseUrl}/rest/v1/ai_incidents?select=*&order=created_at.desc`, {
        headers,
      });
      const dataInc = resInc.ok ? await resInc.json() : [];
      setIncidents(dataInc);

      // 3. Fetch prompt versions
      const resPrompts = await fetch(`${supabaseUrl}/rest/v1/prompt_versions?select=*&order=created_at.desc`, {
        headers,
      });
      const dataPrompts = resPrompts.ok ? await resPrompts.json() : [];
      setPromptVersions(dataPrompts);

      // 4. Fetch revenue sparkline from protocol_executions (up to 7 payments, ascending)
      const resSparkline = await fetch(
        `${supabaseUrl}/rest/v1/protocol_executions?select=amount_total,executed_at&execution_stage=eq.minute_1_email&order=executed_at.asc&limit=7`,
        { headers }
      );
      if (resSparkline.ok) {
        const sparkData: Array<{ amount_total: number }> = await resSparkline.json();
        setRevenueSparkline(sparkData.map(e => Math.round(e.amount_total / 100)));
      }

      // 5. ARR: sum of all payments
      const resPayments = await fetch(
        `${supabaseUrl}/rest/v1/payments?select=amount_total`,
        { headers }
      );
      if (resPayments.ok) {
        const paymentsData: Array<{ amount_total: number }> = await resPayments.json();
        setArrTotal(paymentsData.reduce((sum, p) => sum + (p.amount_total || 0), 0));
      }

      // 6. Leads for Conversion Queue
      const resLeads = await fetch(
        `${supabaseUrl}/rest/v1/leads?select=*&order=created_at.desc&limit=20`,
        { headers }
      );
      if (resLeads.ok) {
        const leadsData = await resLeads.json();
        setLeads(Array.isArray(leadsData) ? leadsData : []);
      }

      // 7. Stripe sparklines (non-fatal if Pages Function not deployed)
      try {
        const resSpark = await fetch('/api/stripe/sparklines');
        if (resSpark.ok) {
          const sparkData = await resSpark.json();
          if (Array.isArray(sparkData.sparkline)) setStripeSparklines(sparkData.sparkline);
        }
      } catch { /* non-fatal */ }

      // Compute metrics
      const total = data.length;
      let outreach = 0;
      let delivered = 0;
      let closed = 0;
      let highTicketCount = 0;
      let microdosingCount = 0;
      let certifiedCount = 0;
      let activeGuaranteesCount = 0;
      let cognitiveFatigueSum = 0;
      let cognitiveFatigueCount = 0;
      
      const frictionCounts = {
        cognitive_load: 0,
        trust_deficit: 0,
        value_deficit: 0,
        sequence_order: 0,
      };

      const pipeline: DashboardMetrics["pipeline"] = [];

      data.forEach((client) => {
        const project = client.beta_projects?.[0];
        const interaction = client.interactions?.[0];
        const guarantee = project?.performance_guarantees?.[0];

        if (client.segment === "microdosing") {
          microdosingCount++;
        } else {
          highTicketCount++;
        }

        if (client.is_certified) {
          certifiedCount++;
        }

        if (client.cognitive_fatigue_score !== undefined && client.cognitive_fatigue_score !== null) {
          cognitiveFatigueSum += client.cognitive_fatigue_score;
          cognitiveFatigueCount++;
        }
        
        if (project) {
          if (project.status === "outreach_sent") outreach++;
          if (project.status === "delivered" || project.status === "awaiting_testimonial") delivered++;
          if (project.status === "closed_completed") {
            delivered++;
            closed++;
          }
          if (project.guarantee_active) {
            activeGuaranteesCount++;
          }
          pipeline.push({
            id: client.id,
            company_name: client.company_name,
            contact_name: client.contact_name,
            contact_email: client.contact_email || "",
            status: project.status,
            payment_status: project.payment_status,
            segment: client.segment || "high_ticket",
            is_certified: client.is_certified,
            cognitive_fatigue_score: client.cognitive_fatigue_score,
            private_notes: client.private_notes || "",
            guarantee_active: project.guarantee_active,
            expansion_score: project.expansion_score,
            projectId: project.id,
            guarantee: guarantee ? {
              id: guarantee.id,
              target_improvement_pct: Number(guarantee.target_improvement_pct),
              timeframe_days: Number(guarantee.timeframe_days),
              traffic_gate_met: !!guarantee.traffic_gate_met,
              sla_gate_met: !!guarantee.sla_gate_met,
              isolation_gate_met: !!guarantee.isolation_gate_met,
              telemetry_gate_met: !!guarantee.telemetry_gate_met,
              baseline_conversion_rate: Number(guarantee.baseline_conversion_rate),
              current_conversion_rate: Number(guarantee.current_conversion_rate),
              guarantee_status: guarantee.guarantee_status as any
            } : null
          });
        }

        if (interaction?.dominant_friction_mechanism) {
          const mech = interaction.dominant_friction_mechanism as keyof typeof frictionCounts;
          if (mech in frictionCounts) {
            frictionCounts[mech]++;
          }
        }
      });

      const avgCognitiveFatigue = cognitiveFatigueCount > 0 ? cognitiveFatigueSum / cognitiveFatigueCount : 0;

      // Sort pipeline by priority: Paid > High-Ticket > Certified
      pipeline.sort((a, b) => {
        if (a.payment_status === "paid" && b.payment_status !== "paid") return -1;
        if (a.payment_status !== "paid" && b.payment_status === "paid") return 1;
        if (a.segment === "high_ticket" && b.segment !== "high_ticket") return -1;
        if (a.segment !== "high_ticket" && b.segment === "high_ticket") return 1;
        if (a.is_certified && !b.is_certified) return -1;
        if (!a.is_certified && b.is_certified) return 1;
        return 0;
      });

      setMetrics({
        totalLeads: total,
        outreachSent: outreach,
        diagnosticsDelivered: delivered,
        dealsClosed: closed,
        conversionRate: total > 0 ? (closed / total) * 100 : 0,
        highTicketCount,
        microdosingCount,
        certifiedCount,
        activeGuaranteesCount,
        avgCognitiveFatigue,
        frictionCounts,
        pipeline,
      });
      setLoading(false);
    } catch (err) {
      console.error("Supabase API offline. Loading fallback data.", err);
      // Fallback for visual demonstration when offline
      setMetrics({
        totalLeads: 12,
        outreachSent: 5,
        diagnosticsDelivered: 3,
        dealsClosed: 2,
        conversionRate: 16.7,
        highTicketCount: 8,
        microdosingCount: 4,
        certifiedCount: 3,
        activeGuaranteesCount: 2,
        avgCognitiveFatigue: 42,
        frictionCounts: {
          cognitive_load: 4,
          trust_deficit: 3,
          value_deficit: 2,
          sequence_order: 3,
        },
        pipeline: [
          { id: "1", company_name: "Formbricks", contact_name: "Johannes Dancker", contact_email: "johannes@formbricks.com", status: "diagnostic_in_progress", payment_status: "uninvoiced", segment: "high_ticket", is_certified: false, cognitive_fatigue_score: 35, guarantee_active: true, expansion_score: 82, projectId: "p-1", private_notes: "High pressure context, pending Series A round", guarantee: { id: "g-1", target_improvement_pct: 20, timeframe_days: 30, traffic_gate_met: true, sla_gate_met: true, isolation_gate_met: true, telemetry_gate_met: true, baseline_conversion_rate: 1.5, current_conversion_rate: 1.8, guarantee_status: "active" } },
          { id: "2", company_name: "Documenso", contact_name: "Timur Ercan", contact_email: "timur@documenso.com", status: "delivered", payment_status: "invoiced_unpaid", segment: "microdosing", is_certified: true, cognitive_fatigue_score: 55, guarantee_active: false, expansion_score: 64, projectId: "p-2", private_notes: "Wants full autonomy route", guarantee: null },
          { id: "3", company_name: "Featurebase", contact_name: "Bruno Hiis", contact_email: "bruno@featurebase.app", status: "outreach_sent", payment_status: "uninvoiced", segment: "high_ticket", is_certified: false, cognitive_fatigue_score: 20, guarantee_active: false, expansion_score: 45, projectId: "p-3", private_notes: "Interested in onboarding metrics boost", guarantee: null },
          { id: "4", company_name: "Documenso Agency", contact_name: "Timur Ercan", contact_email: "timur@documenso.com", status: "closed_completed", payment_status: "paid", segment: "microdosing", is_certified: true, cognitive_fatigue_score: 15, guarantee_active: true, expansion_score: 90, projectId: "p-4", private_notes: "Strong compliance advocate", guarantee: { id: "g-2", target_improvement_pct: 25, timeframe_days: 30, traffic_gate_met: true, sla_gate_met: true, isolation_gate_met: true, telemetry_gate_met: true, baseline_conversion_rate: 2.1, current_conversion_rate: 2.8, guarantee_status: "met" } },
          { id: "5", company_name: "Cal.com Agency", contact_name: "Peer Richelsen", contact_email: "peer@cal.com", status: "delivered", payment_status: "paid", segment: "high_ticket", is_certified: true, cognitive_fatigue_score: 48, guarantee_active: false, expansion_score: 75, projectId: "p-5", private_notes: "Scaling fast, scheduling latency issues", guarantee: null },
        ],
      });
      setIncidents([
        {
          id: "inc-1",
          incident_type: "process_error",
          severity: "high",
          phase: "backend",
          description: "SQL migration failed silently when executed via Supabase Web SQL Editor. The UI returned 'Success' but no tables were created, causing the script to fail later with PGRST205.",
          root_cause: "Supabase Web SQL Editor silently truncates or fails on large multi-statement SQL scripts. The CLI method (supabase db push) is the reliable alternative.",
          resolution: "Switched to Supabase CLI for all future migrations. Added validation step (query information_schema.tables) after every migration.",
          lesson_learned: "Never trust the Supabase Web SQL Editor for production migrations. Always use CLI and verify.",
          applied_improvement: "Updated walkthrough.md and agent instructions to mandate CLI-based migrations with post-execution verification.",
          improvement_type: "validation_added",
          iteration_version: "v1.0.1",
          created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
          resolved_at: new Date(Date.now() - 1 * 3600000).toISOString()
        },
        {
          id: "inc-2",
          incident_type: "ai_hallucination",
          severity: "critical",
          phase: "outreach",
          description: "Claude generated outreach containing custom feature lists instead of focusing exclusively on the 2-line visual correction hook, lowering engagement.",
          root_cause: "System prompt allowed broad scope description of consulting solutions, triggering prompt drift toward traditional agency pitches.",
          created_at: new Date(Date.now() - 6 * 3600000).toISOString()
        }
      ]);
      setPromptVersions([
        { id: "pv-1", phase: "outreach", prompt_text: "Hey [Name], saw you scaling... only ask for a 2-line visual hook.", iteration_version: "v1.0.1", created_at: new Date(Date.now() - 1 * 3600000).toISOString() },
        { id: "pv-2", phase: "outreach", prompt_text: "Hey, reviewed [Company] signup. Here is a custom pitch.", iteration_version: "v1.0.0", created_at: new Date(Date.now() - 24 * 3600000).toISOString() },
        { id: "pv-3", phase: "diagnostic", prompt_text: "Provide B2B SaaS diagnostics with McKinsey-level precision...", iteration_version: "v1.0.0", created_at: new Date(Date.now() - 24 * 3600000).toISOString() }
      ]);
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAllData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0908] flex items-center justify-center font-mono text-xs text-[#D4A853] animate-pulse">
        Loading pipeline analytics...
      </div>
    );
  }

  const m = metrics!;

  // Learning OS computed values
  const unresolvedIncidents = incidents.filter(i => !i.resolved_at);
  const criticalAlerts = unresolvedIncidents.filter(i => i.severity === 'critical' || i.severity === 'high');
  const resolvedIncidents = incidents.filter(i => i.resolved_at);
  const currentVersion = promptVersions.length > 0 ? promptVersions[0].iteration_version : "v1.0.0";

  // Calculate top error patterns
  const typeCounts = incidents.reduce((acc, curr) => {
    acc[curr.incident_type] = (acc[curr.incident_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedPatterns = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const getSeverityBadgeColor = (severity: AIIncident["severity"]) => {
    switch (severity) {
      case "critical": return "bg-[#C85C5C]/10 border-[#C85C5C]/20 text-[#C85C5C]";
      case "high": return "bg-orange-500/10 border-orange-500/20 text-orange-400";
      case "medium": return "bg-amber-500/10 border-amber-500/20 text-amber-400";
      default: return "bg-white/5 border-white/10 text-[#B0A89E]";
    }
  };

  return (
    <main className="min-h-screen bg-[#0A0908] text-[#F5F0EB] p-8 md:p-12 relative overflow-x-hidden font-sans">
      {/* Subtle diagnostic grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(212,168,83,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,83,0.02) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      <div className="max-w-[1200px] mx-auto space-y-12 relative z-10">
        
        {/* Navigation & Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#D4A853]/10 pb-8">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#D4A853]/70 block mb-2">OS Interno</span>
            <h1 className="text-4xl font-serif text-white tracking-tight">Flujo de Ventas · Signal &amp; Friction</h1>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <span className="font-mono text-xs uppercase tracking-wider text-[#D4A853] border border-[#D4A853]/25 px-3 py-1 rounded bg-[#D4A853]/5">
              Área Admin Autenticada
            </span>
          </div>
        </header>

        {/* Pestañas de navegación */}
        <div className="flex border-b border-[#D4A853]/8 gap-8">
          <button
            onClick={() => setActiveView('pipeline')}
            className={`pb-4 font-mono text-xs uppercase tracking-widest border-b-2 transition-all duration-300 cursor-pointer ${
              activeView === 'pipeline' ? "border-[#D4A853] text-[#D4A853]" : "border-transparent text-[#7A6F65] hover:text-[#B0A89E]"
            }`}
          >
            Pipeline y Conversiones
          </button>
          <button
            onClick={() => setActiveView('learning')}
            className={`pb-4 font-mono text-xs uppercase tracking-widest border-b-2 transition-all duration-300 cursor-pointer relative ${
              activeView === 'learning' ? "border-[#D4A853] text-[#D4A853]" : "border-transparent text-[#7A6F65] hover:text-[#B0A89E]"
            }`}
          >
            OS de Aprendizaje Continuo
            {criticalAlerts.length > 0 && (
              <span className="absolute top-0 right-[-14px] w-2 h-2 bg-[#C85C5C] rounded-full animate-pulse" />
            )}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeView === 'pipeline' ? (
            <motion.div
              key="pipeline"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={springConfig}
              className="space-y-12"
            >
              {/* Dynamic ARR Trajectory Tracker — Feature 1 */}
              {(() => {
                const ARR_TARGET = 1_000_000;
                const arrUsd = Math.round(arrTotal / 100);
                const pct = Math.min((arrUsd / ARR_TARGET) * 100, 100);
                const remaining = ARR_TARGET - arrUsd;
                return (
                  <div className="border border-[#D4A853]/20 bg-[#110F0D] p-6 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#D4A853]/70 block mb-1">Trayectoria ARR</span>
                        <div className="flex items-baseline gap-3">
                          <span className="font-serif text-3xl font-bold text-white">${arrUsd.toLocaleString()}</span>
                          <span className="font-mono text-xs text-[#7A6F65]">/ objetivo $1.000.000</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-2xl font-bold text-[#D4A853]">{pct.toFixed(2)}%</span>
                        <span className="font-mono text-xs text-[#7A6F65] block mt-0.5">${remaining.toLocaleString()} restantes</span>
                      </div>
                    </div>
                    <div className="relative h-3 bg-black/60 border border-[#D4A853]/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background: "linear-gradient(90deg, #7A5C1E 0%, #D4A853 60%, #F0CF7A 100%)",
                          filter: "drop-shadow(0 0 6px rgba(212,168,83,0.5))",
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(pct, 0.5)}%` }}
                        transition={{ type: "spring", stiffness: 60, damping: 20 }}
                      />
                    </div>
                    {stripeSparklines.length > 0 && (
                      <div className="flex items-end gap-1 h-8 pt-1">
                        <span className="font-mono text-[9px] text-[#7A6F65] mr-1 self-end">7d</span>
                        {stripeSparklines.map((v, i) => {
                          const max = Math.max(...stripeSparklines, 1);
                          const h = Math.max((v / max) * 100, 4);
                          return (
                            <div key={i} className="flex-1 rounded-sm bg-[#D4A853]/30 transition-all" style={{ height: `${h}%` }} title={`$${v}`} />
                          );
                        })}
                        <span className="font-mono text-[9px] text-[#D4A853]/70 ml-1 self-end">today</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 30-Day Sprint Tracker */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs text-[#D4A853]/70 tracking-[0.3em] uppercase">Sprint 30 Días</span>
                  <span className="font-mono text-xs text-[#7A6F65] border border-[#D4A853]/10 px-2 py-0.5 rounded-full">Fase 2 · Ruta $1M</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {(() => {
                    const clients = m.dealsClosed || 0;
                    const htMrr = (m.highTicketCount || 0) * 2000;
                    const dwyMrr = (m.microdosingCount || 0) * 350;
                    const mrr = htMrr + dwyMrr || clients * 350;
                    const pctToMillion = +((mrr * 12) / 10000).toFixed(1);
                    return [
                      { label: "Clientes", display: String(clients), accent: "text-[#5C9A6B]" },
                      { label: "MRR", display: `$${mrr.toLocaleString()}`, accent: "text-[#D4A853]" },
                      { label: "Liquidez", display: `$${mrr.toLocaleString()}`, accent: "text-[#D4A853]" },
                      { label: "% ARR $1M", display: `${pctToMillion}%`, accent: "text-[#F5F0EB]" },
                    ].map((card) => (
                      <div key={card.label} className="border border-[#D4A853]/15 bg-[#110F0D] p-4">
                        <div className="font-mono text-xs text-[#7A6F65] tracking-widest uppercase mb-2">{card.label}</div>
                        <div className={`font-mono text-2xl font-bold ${card.accent}`}>{card.display}</div>
                      </div>
                    ));
                  })()}
                </div>
              </section>

              {/* Analytics Scorecard Row */}
              <section className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                {[
                  { label: "Leads Totales", value: m.totalLeads, detail: "Todos los perfiles", color: "text-[#F5F0EB]" },
                  { label: "High-Ticket", value: m.highTicketCount || 0, detail: "Vía Concierge", color: "text-[#D4A853]" },
                  { label: "Microdosing", value: m.microdosingCount || 0, detail: "Vía Autonomía", color: "text-[#B0A89E]" },
                  { label: "Outreach Enviado", value: m.outreachSent, detail: "DMs Beta activos", color: "text-[#D4A853]" },
                  { label: "Diagnósticos", value: m.diagnosticsDelivered, detail: "Briefs Loom entregados", color: "text-[#D4A853]" },
                  { label: "Deals Cerrados", value: m.dealsClosed, detail: "Testimonio y pago", color: "text-[#5C9A6B]" },
                ].map((item, idx) => (
                  <AdminStatCard
                    key={idx}
                    label={item.label}
                    value={item.value}
                    detail={item.detail}
                    accentColor={item.color}
                    sparklineData={item.label === "Deals Closed" && revenueSparkline.length > 0 ? revenueSparkline : undefined}
                  />
                ))}
              </section>

              {/* Funnel & Friction Split View */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Conversion Funnel */}
                <div className="lg:col-span-7 border border-[#D4A853]/15 p-8 bg-[#0A0908]/60 rounded space-y-6">
                  <h3 className="font-serif text-lg text-white border-b border-[#D4A853]/10 pb-3">Embudo de Captación</h3>
                  <div className="space-y-4">
                    {[
                      { step: "Leads Identificados", count: m.totalLeads, pct: 100 },
                      { step: "Ciclos de Outreach", count: m.outreachSent + m.diagnosticsDelivered, pct: m.totalLeads > 0 ? ((m.outreachSent + m.diagnosticsDelivered) / m.totalLeads) * 100 : 0 },
                      { step: "Diagnósticos Entregados", count: m.diagnosticsDelivered, pct: m.totalLeads > 0 ? (m.diagnosticsDelivered / m.totalLeads) * 100 : 0 },
                      { step: "Cierre Beta Exitoso", count: m.dealsClosed, pct: m.totalLeads > 0 ? (m.dealsClosed / m.totalLeads) * 100 : 0 },
                    ].map((item, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-[#B0A89E]">{item.step}</span>
                          <span className="text-white">{item.count} ({item.pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2 bg-black border border-[#D4A853]/8 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-[#D4A853]" 
                            initial={{ width: 0 }}
                            animate={{ width: `${item.pct}%` }}
                            transition={springConfig}
                            style={{ filter: "drop-shadow(0 0 2px rgba(212, 168, 83, 0.4))" }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cognitive Friction Breakdown */}
                <div className="lg:col-span-5 border border-[#D4A853]/15 p-8 bg-[#0A0908]/60 rounded space-y-6">
                  <h3 className="font-serif text-lg text-white border-b border-[#D4A853]/10 pb-3">Mecanismos de Fricción</h3>
                  <div className="space-y-3">
                    {[
                      { key: "Carga Cognitiva", count: m.frictionCounts.cognitive_load, color: "bg-[#D4A853]" },
                      { key: "Déficit de Confianza", count: m.frictionCounts.trust_deficit, color: "bg-[#22C55E]" },
                      { key: "Déficit de Valor", count: m.frictionCounts.value_deficit, color: "bg-[#3B82F6]" },
                      { key: "Orden de Secuencia", count: m.frictionCounts.sequence_order, color: "bg-[#A855F7]" },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                          <span className="text-[#B0A89E]">{item.key}</span>
                        </div>
                        <span className="text-[#F5F0EB] font-semibold">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Strategic Elevations Dashboard: Certification & Guarantees */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Guarantee Monitor Panel */}
                <div className="lg:col-span-6 border border-[#D4A853]/15 p-6 bg-[#110F0D] rounded-2xl space-y-5">
                  <div className="flex justify-between items-center border-b border-[#D4A853]/10 pb-4">
                    <h3 className="font-serif text-lg text-white flex items-center gap-2">
                      <span className="text-[#D4A853]">⚡</span> Garantías de Resultados
                    </h3>
                    <span className="font-mono text-xs uppercase bg-[#D4A853]/10 text-[#D4A853] px-3 py-1 rounded-full border border-[#D4A853]/20">
                      {m.activeGuaranteesCount || 0} Activas
                    </span>
                  </div>

                  <p className="text-sm text-[#B0A89E] font-mono leading-relaxed">
                    Clientes Concierge bajo el protocolo de garantía por resultados. +20% conversión en 30 días o factura anulada.
                  </p>

                  <div className="space-y-4">
                    {m.pipeline.filter(p => p.guarantee_active).length === 0 ? (
                      <div className="text-sm text-[#B0A89E] font-mono text-center py-6">Sin campañas garantizadas activas.</div>
                    ) : (
                      m.pipeline.filter(p => p.guarantee_active).map((item) => (
                        <div key={item.id} className="border border-[#D4A853]/8 bg-black/30 p-4 rounded-xl space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-serif font-bold text-white">{item.company_name}</span>
                            <span className="font-mono text-xs text-[#5C9A6B] bg-[#5C9A6B]/8 px-2 py-0.5 border border-[#5C9A6B]/20 rounded-full">
                              {item.guarantee?.guarantee_status.toUpperCase() || "ACTIVE"}
                            </span>
                          </div>

                          {/* Gate requirements tracker */}
                          <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[#B0A89E]">
                            <div className="flex items-center gap-1.5">
                              <span className={item.guarantee?.traffic_gate_met ? "text-[#5C9A6B]" : "text-[#C85C5C]"}>
                                {item.guarantee?.traffic_gate_met ? "✓" : "✗"}
                              </span> Traffic &gt;15k/mo
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={item.guarantee?.sla_gate_met ? "text-[#5C9A6B]" : "text-[#C85C5C]"}>
                                {item.guarantee?.sla_gate_met ? "✓" : "✗"}
                              </span> SLA 72h Deploy
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={item.guarantee?.isolation_gate_met ? "text-[#5C9A6B]" : "text-[#C85C5C]"}>
                                {item.guarantee?.isolation_gate_met ? "✓" : "✗"}
                              </span> Isolation Lock
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={item.guarantee?.telemetry_gate_met ? "text-[#5C9A6B]" : "text-[#C85C5C]"}>
                                {item.guarantee?.telemetry_gate_met ? "✓" : "✗"}
                              </span> Telemetry Active
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-[#7A6F65]">30-Day Window</span>
                              <span className="text-[#D4A853]">Target: +{item.guarantee?.target_improvement_pct || 20}%</span>
                            </div>
                            <div className="h-1.5 bg-black border border-[#D4A853]/8 rounded-full overflow-hidden">
                              <div className="h-full bg-[#D4A853]" style={{ width: '40%' }} />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* S&F Certified Partner Directory Panel */}
                <div className="lg:col-span-6 border border-[#D4A853]/15 p-6 bg-[#110F0D] rounded-2xl space-y-5">
                  <div className="flex justify-between items-center border-b border-[#D4A853]/10 pb-4">
                    <h3 className="font-serif text-lg text-white flex items-center gap-2">
                      <span className="text-[#D4A853]">🏆</span> Partners Certificados™
                    </h3>
                    <span className="font-mono text-xs uppercase bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full border border-amber-500/20">
                      {m.certifiedCount || 0} Licenciados
                    </span>
                  </div>

                  <p className="text-sm text-[#B0A89E] font-mono leading-relaxed">
                    Metodología licenciada a agencias externas ($1.500/año). Auditoría anual con mínimo 80% de satisfacción.
                  </p>

                  <div className="space-y-3">
                    {m.pipeline.filter(p => p.is_certified).length === 0 ? (
                      <div className="text-sm text-[#B0A89E] font-mono text-center py-6">Sin partners certificados registrados.</div>
                    ) : (
                      m.pipeline.filter(p => p.is_certified).map((partner) => (
                        <div key={partner.id} className="flex justify-between items-center p-4 border border-[#D4A853]/15 bg-black/20 rounded-xl hover:border-[#D4A853]/35 transition-all duration-300">
                          <div>
                            <span className="text-sm font-serif text-white block font-medium">{partner.company_name}</span>
                            <span className="text-xs text-[#B0A89E] font-mono mt-0.5 block">{partner.contact_name}</span>
                          </div>
                          <div className="text-right space-y-1">
                            <span className="font-mono text-xs bg-[#5C9A6B]/10 text-[#5C9A6B] px-2 py-0.5 rounded-full border border-[#5C9A6B]/20 block">
                              SLA: {partner.expansion_score ? partner.expansion_score : 85}%
                            </span>
                            <span className="text-xs text-[#7A6F65] font-mono block">
                              Próx. Auditoría: Dic 2026
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>

              {/* Strategic Conversion Queue — Feature 3 */}
              <section className="border border-[#D4A853]/15 p-6 bg-[#110F0D] rounded-2xl space-y-5">
                <div className="flex items-center justify-between border-b border-[#D4A853]/10 pb-4">
                  <h3 className="font-serif text-lg text-white">Cola de Conversión</h3>
                  <span className="font-mono text-xs uppercase text-[#7A6F65] border border-[#D4A853]/15 px-3 py-1 rounded-full">
                    {leads.length} leads entrantes
                  </span>
                </div>
                {leads.length === 0 ? (
                  <p className="font-mono text-xs text-[#7A6F65] text-center py-8">Sin leads en cola. Conecta el formulario Tally para empezar.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {leads.map((lead) => {
                      const hoursAgo = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 3600000);
                      const isDFY = lead.segment === 'DFY';
                      const estimatedValue = isDFY ? 2000 : 350;
                      const urgency = hoursAgo < 2 ? 'hot' : hoursAgo < 24 ? 'warm' : 'cold';
                      return (
                        <button
                          key={lead.id}
                          onClick={() => { setSelectedLead(lead); setShowLeadDrawer(true); }}
                          className="text-left border border-[#D4A853]/10 bg-[#0A0908] p-4 rounded-xl hover:border-[#D4A853]/35 transition-all duration-300 cursor-pointer space-y-3 group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-serif text-sm text-white font-bold leading-tight truncate max-w-[160px]">
                                {lead.company || lead.email.split('@')[1]}
                              </p>
                              <p className="font-mono text-[10px] text-[#7A6F65] mt-0.5 truncate max-w-[180px]">{lead.email}</p>
                            </div>
                            <span className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                              isDFY
                                ? 'text-[#D4A853] border-[#D4A853]/30 bg-[#D4A853]/8'
                                : 'text-[#B0A89E] border-white/10 bg-white/[0.03]'
                            }`}>
                              {lead.segment}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-black/40 rounded p-1.5">
                              <span className="font-mono text-[9px] text-[#7A6F65] uppercase block">Valor Est.</span>
                              <span className="font-mono text-xs font-bold text-[#D4A853]">${estimatedValue.toLocaleString()}</span>
                            </div>
                            <div className="bg-black/40 rounded p-1.5">
                              <span className="font-mono text-[9px] text-[#7A6F65] uppercase block">Latencia</span>
                              <span className={`font-mono text-xs font-bold ${urgency === 'hot' ? 'text-[#C85C5C]' : urgency === 'warm' ? 'text-amber-400' : 'text-[#B0A89E]'}`}>
                                {hoursAgo}h
                              </span>
                            </div>
                            <div className="bg-black/40 rounded p-1.5">
                              <span className="font-mono text-[9px] text-[#7A6F65] uppercase block">Fuente</span>
                              <span className="font-mono text-xs text-[#B0A89E]">{lead.source}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-[#D4A853]/8">
                            <span className={`font-mono text-[9px] uppercase ${urgency === 'hot' ? 'text-[#C85C5C]' : urgency === 'warm' ? 'text-amber-400' : 'text-[#7A6F65]'}`}>
                              {urgency === 'hot' ? '🔴 Responde ya' : urgency === 'warm' ? '🟡 Responde hoy' : '⚪ En cola'}
                            </span>
                            <span className="font-mono text-[9px] text-[#D4A853]/70 group-hover:text-[#D4A853] transition-colors">Ver →</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Pipeline Kanban View */}
              <section className="border border-[#D4A853]/10 p-8 bg-[#110F0D]/60 rounded-2xl space-y-6">
                <div className="flex justify-between items-center border-b border-[#D4A853]/10 pb-4">
                  <h3 className="font-serif text-xl text-white">Tablero Activo</h3>
                  <span className="text-xs font-mono text-[#7A6F65] uppercase tracking-wider">
                    Haz clic en una tarjeta para editar
                  </span>
                </div>

                {/* Next Actions summary bar */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-5 border border-[#D4A853]/15 bg-black/40 rounded-xl">
                  {[
                    { status: "prospecting", title: "Outreach Pendiente", count: m.pipeline.filter(p => p.status === "prospecting").length, color: "text-[#D4A853]", action: "Enviar pitch de outreach" },
                    { status: "outreach_sent", title: "Seguimiento Necesario", count: m.pipeline.filter(p => p.status === "outreach_sent").length, color: "text-amber-400", action: "Seguimiento o avanzar" },
                    { status: "diagnostic_in_progress", title: "Diagnóstico Pendiente", count: m.pipeline.filter(p => p.status === "diagnostic_in_progress").length, color: "text-purple-400", action: "Subir Loom y Figma" },
                    { status: "delivered", title: "Pendiente de Cierre", count: m.pipeline.filter(p => p.status === "delivered" || p.status === "awaiting_testimonial").length, color: "text-[#5C9A6B]", action: "Solicitar testimonio" },
                  ].map(card => (
                    <button
                      key={card.status}
                      onClick={() => setKanbanFilter(kanbanFilter === card.status ? null : card.status)}
                      className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-300 ${
                        kanbanFilter === card.status ? "bg-[#D4A853]/10 border-[#D4A853]" : "bg-black/30 border-[#D4A853]/8 hover:border-[#D4A853]/25"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-mono text-xs uppercase tracking-wider text-[#B0A89E]">{card.title}</span>
                        <span className={`font-mono text-xl font-bold ${card.color}`}>{card.count}</span>
                      </div>
                      <p className="text-sm text-[#B0A89E] font-sans italic">{card.action}</p>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {["prospecting", "outreach_sent", "diagnostic_in_progress", "delivered"].map((col) => {
                    let items = m.pipeline.filter(p => p.status === col || (col === "delivered" && p.status === "awaiting_testimonial") || (col === "delivered" && p.status === "closed_completed"));

                    if (kanbanFilter) {
                      items = items.filter(p => p.status === kanbanFilter || (kanbanFilter === "delivered" && (p.status === "awaiting_testimonial" || p.status === "closed_completed")));
                    }

                    return (
                      <div key={col} className="bg-black/40 border border-[#D4A853]/8 rounded-xl p-4 flex flex-col gap-3 min-h-[300px]">
                        <span className="font-mono text-xs uppercase tracking-wider text-[#D4A853] border-b border-[#D4A853]/15 pb-3">
                          {({ prospecting: "Prospección", outreach_sent: "Outreach Enviado", diagnostic_in_progress: "Diagnóstico en Curso", delivered: "Entregado" } as Record<string, string>)[col] || col.replace(/_/g, " ")} ({items.length})
                        </span>
                        <div className="flex flex-col gap-3 grow">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => openClientModal(item)}
                              className="border border-[#D4A853]/8 bg-[#0A0908] p-4 rounded-xl hover:border-[#D4A853]/40 transition-all duration-300 cursor-pointer hover:scale-[1.01] relative"
                            >
                              <div className="flex justify-between items-start gap-1 mb-2">
                                <h4 className="font-serif text-base text-white font-bold leading-tight">{item.company_name}</h4>
                                <div className="flex gap-1 flex-shrink-0 mt-0.5">
                                  {item.is_certified && (
                                    <span className="text-xs" title="Certified Partner">🏆</span>
                                  )}
                                  {item.guarantee_active && (
                                    <span className="text-xs text-[#D4A853]" title="Performance Guarantee Active">⚡</span>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-[#B0A89E]">{item.contact_name}</p>

                              {/* SLA 72h Page URL — copyable chip when diagnostic is in progress */}
                              {item.status === "diagnostic_in_progress" && (() => {
                                const clientKey = (item.company_name || "client")
                                  .toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
                                const slaUrl = `https://signal-and-friction.com/sla/${clientKey}`;
                                return (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(slaUrl).catch(() => {});
                                    }}
                                    title="Copiar enlace SLA del cliente"
                                    className="mt-1.5 flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border text-[#D4A853] border-[#D4A853]/30 bg-[#D4A853]/5 hover:bg-[#D4A853]/12 transition-colors cursor-pointer w-full truncate"
                                  >
                                    <span className="shrink-0">⧉</span>
                                    <span className="truncate">/sla/{clientKey}</span>
                                  </button>
                                );
                              })()}

                              {/* SLA 72h Protocol Timer */}
                              {item.created_at && item.status !== "delivered" && item.status !== "closed_completed" && (() => {
                                const hoursElapsed = (Date.now() - new Date(item.created_at).getTime()) / 3600000;
                                const hoursLeft = 72 - hoursElapsed;
                                const color = hoursLeft < 0 ? "text-[#C85C5C] border-[#C85C5C]/30 bg-[#C85C5C]/5"
                                  : hoursLeft < 12 ? "text-amber-400 border-amber-400/30 bg-amber-400/5"
                                  : "text-[#5C9A6B] border-[#5C9A6B]/20 bg-[#5C9A6B]/5";
                                const label = hoursLeft < 0
                                  ? `⚠ SLA excedido ${Math.abs(Math.round(hoursLeft))}h`
                                  : `⏱ ${Math.round(hoursLeft)}h restantes`;
                                return (
                                  <span className={`mt-1.5 inline-block font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${color}`}>
                                    {label}
                                  </span>
                                );
                              })()}
                              {item.status === "delivered" && (
                                <span className="mt-1.5 inline-block font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border text-[#5C9A6B] border-[#5C9A6B]/20 bg-[#5C9A6B]/5">
                                  ✓ SLA cumplido
                                </span>
                              )}

                              {/* Cognitive Fatigue Indicator */}
                              {item.cognitive_fatigue_score !== undefined && (
                                <div className="flex items-center gap-2 mt-2.5">
                                  <span className="text-xs font-mono text-[#7A6F65]">CF:</span>
                                  <span className={`text-xs font-mono font-semibold ${
                                    item.cognitive_fatigue_score > 70 ? "text-[#C85C5C]" : item.cognitive_fatigue_score > 40 ? "text-amber-400" : "text-[#D4A853]"
                                  }`}>
                                    {item.cognitive_fatigue_score}
                                  </span>
                                </div>
                              )}

                              {item.private_notes && (
                                <p className="text-sm font-mono text-[#B0A89E] mt-2 italic line-clamp-1 border-t border-[#D4A853]/8 pt-2">
                                  {item.private_notes}
                                </p>
                              )}

                              <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#D4A853]/8 text-xs font-mono">
                                <span className={item.payment_status === "paid" ? "text-[#5C9A6B] font-medium" : "text-[#7A6F65]"}>
                                  {({ paid: "Pagado", uninvoiced: "Sin Facturar", invoiced_unpaid: "Facturado" } as Record<string, string>)[item.payment_status] || item.payment_status}
                                </span>
                                <span className="text-[#7A6F65]">#{item.id.slice(0, 4)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </motion.div>
          ) : (
            <motion.div
              key="learning"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={springConfig}
              className="space-y-8"
            >
              {/* Critical Alerts Banner */}
              {criticalAlerts.length > 0 && (
                <div className="border border-[#C85C5C]/20 bg-[#C85C5C]/5 p-6 rounded-2xl flex items-start gap-4 animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#C85C5C] mt-2 shrink-0 animate-ping" />
                  <div className="space-y-1.5">
                    <h4 className="font-mono text-xs uppercase tracking-widest text-[#C85C5C] font-bold">ALERTA CRÍTICA DEL SISTEMA</h4>
                    <p className="text-xs text-white leading-relaxed">
                      Se encontraron {criticalAlerts.length} incidencia(s) de severidad alta o crítica sin resolver. Los límites de seguridad de ejecución del sistema están degradados. Ejecuta el comando MCP <code className="font-mono text-amber-500 bg-black/40 px-2 py-0.5 rounded border border-[#D4A853]/8 select-all">/beta:iterate-from-incidents</code> de inmediato para inyectar las correcciones.
                    </p>
                    <div className="flex flex-col gap-2 mt-3">
                      {criticalAlerts.map(inc => (
                        <div key={inc.id} className="text-xs font-mono text-[#C85C5C]/80 bg-[#C85C5C]/10 border border-[#C85C5C]/20 px-3 py-1.5 rounded-md">
                          [{inc.severity.toUpperCase()}] {inc.incident_type} in phase {inc.phase}: &quot;{inc.description}&quot;
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Continuous Learning Scorecard Row */}
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Versión Activa", value: currentVersion, detail: "Iteración global del prompt" },
                  { label: "Sin Resolver", value: unresolvedIncidents.length, detail: "Análisis pendiente" },
                  { label: "Mitigadas", value: resolvedIncidents.length, detail: "Lecciones aprendidas" },
                  { label: "Resolución Media", value: resolvedIncidents.length > 0 ? "1,0 h" : "N/A", detail: "Velocidad de mitigación" },
                ].map((item, idx) => (
                  <div key={idx} className="border border-[#D4A853]/15 p-5 bg-[#110F0D] rounded-2xl relative overflow-hidden">
                    <span className="font-mono text-xs text-[#D4A853]/70 uppercase tracking-wider block mb-2">{item.label}</span>
                    <span className="font-serif text-3xl font-bold text-white block mb-1">{item.value}</span>
                    <span className="text-xs text-[#7A6F65]">{item.detail}</span>
                  </div>
                ))}
              </section>

              {/* Detailed Breakdown Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Timeline Panel */}
                <div className="lg:col-span-7 border border-[#D4A853]/15 p-8 bg-[#0A0908]/60 rounded space-y-6">
                  <h3 className="font-serif text-lg text-white border-b border-[#D4A853]/10 pb-3">Cronología de Incidencias</h3>
                  <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                    {incidents.length === 0 ? (
                      <div className="text-sm text-[#B0A89E] font-mono py-12 text-center">Sin incidencias de IA o proceso registradas.</div>
                    ) : (
                      incidents.map(inc => (
                        <div key={inc.id} className={`border border-[#D4A853]/8 bg-black/40 rounded p-5 space-y-4 relative ${inc.resolved_at ? 'opacity-70' : ''}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-mono uppercase px-2 py-0.5 border rounded ${getSeverityBadgeColor(inc.severity)}`}>
                                {inc.severity}
                              </span>
                              <span className="font-serif text-xs text-white font-bold">
                                {inc.incident_type.replace(/_/g, " ")}
                              </span>
                            </div>
                            <span className="font-mono text-xs text-[#B0A89E]">
                              {new Date(inc.created_at).toLocaleString()}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <span className="font-mono text-xs text-[#B0A89E] uppercase block">
                              Fase: <strong className="text-[#D4A853]">{inc.phase}</strong>
                            </span>
                            <p className="text-sm text-[#B0A89E] leading-relaxed font-mono">
                              {inc.description}
                            </p>
                          </div>

                          {!inc.resolved_at && inc.root_cause && (
                            <div className="border-t border-[#D4A853]/8 pt-3">
                              <span className="font-mono text-xs text-[#D4A853] uppercase block mb-1">Análisis de Causa Raíz</span>
                              <p className="text-sm text-[#B0A89E] leading-relaxed font-mono">
                                {inc.root_cause}
                              </p>
                            </div>
                          )}

                          {inc.resolved_at && (
                            <div className="border-t border-[#5C9A6B]/10 bg-[#5C9A6B]/[0.03] p-3 rounded-xl space-y-2">
                              <div className="flex justify-between items-center text-xs font-mono">
                                <span className="text-[#5C9A6B] uppercase">✓ Resuelta y Mitigada</span>
                                <span className="text-[#B0A89E]">{inc.iteration_version}</span>
                              </div>
                              <p className="text-sm text-[#B0A89E] leading-relaxed font-mono">
                                <strong className="text-[#B0A89E]">Resolución: </strong>{inc.resolution}
                              </p>
                              {inc.lesson_learned && (
                                <p className="text-sm text-[#B0A89E] leading-relaxed font-mono italic">
                                  <strong className="text-[#B0A89E]">Lección: </strong>&quot;{inc.lesson_learned}&quot;
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Patterns & AI Advancement tracker */}
                <div className="lg:col-span-5 space-y-8">
                  {/* AI Advancement Tracker */}
                  <div className="border border-[#D4A853]/15 p-8 bg-[#0A0908]/60 rounded space-y-6">
                    <h3 className="font-serif text-lg text-white border-b border-[#D4A853]/10 pb-3">Radar de Avance IA Semanal</h3>
                    <div className="space-y-4">
                      {[
                        { title: "OpenAI GPT-4o fine-tuning updates", desc: "Fine-tuning models on UX heuristics reduces conversion copywriting errors by 18%.", date: "June 19, 2026", type: "OpenAI" },
                        { title: "Anthropic Claude 3.5 Sonnet limits expanded", desc: "High conceptual thinking benchmarks suggest 3-draft Socratic generation speed scales by 3x.", date: "June 15, 2026", type: "Anthropic" },
                        { title: "Google DeepMind Gemini 1.5 Pro visual context", desc: "1M token context allows ingestion of entire Figma wireframes for layout validation.", date: "June 10, 2026", type: "Google" }
                      ].map((item, idx) => (
                        <div key={idx} className="border border-[#D4A853]/8 bg-[#0A0908]/40 p-4 rounded space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-[#D4A853]">{item.type}</span>
                            <span className="text-[#B0A89E]">{item.date}</span>
                          </div>
                          <h4 className="text-xs font-bold text-white font-serif">{item.title}</h4>
                          <p className="text-sm text-[#B0A89E] leading-relaxed font-mono">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Error Patterns */}
                  <div className="border border-[#D4A853]/15 p-8 bg-[#0A0908]/60 rounded space-y-6">
                    <h3 className="font-serif text-lg text-white border-b border-[#D4A853]/10 pb-3">Patrones de Error Detectados</h3>
                    <div className="space-y-4">
                      {sortedPatterns.length === 0 ? (
                        <div className="text-xs text-[#B0A89E] font-mono text-center py-6">Sin patrones registrados.</div>
                      ) : (
                        sortedPatterns.map(([type, count]) => {
                          const percentage = incidents.length > 0 ? (count / incidents.length) * 100 : 0;
                          return (
                            <div key={type} className="space-y-1.5">
                              <div className="flex justify-between text-xs font-mono">
                                <span className="text-[#B0A89E] text-xs">{type.replace(/_/g, " ")}</span>
                                <span className="text-white text-xs">{count} ({percentage.toFixed(0)}%)</span>
                              </div>
                              <div className="h-1 bg-black border border-[#D4A853]/8 rounded-full overflow-hidden">
                                <div className="h-full bg-[#D4A853]" style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Lead Contextual Drawer — Feature 4 */}
      <AnimatePresence>
        {showLeadDrawer && selectedLead && (
          <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowLeadDrawer(false)}>
            <motion.aside
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 120, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              className="relative h-full w-full max-w-[420px] bg-[#0D0B09] border-l border-[#D4A853]/20 shadow-2xl flex flex-col overflow-y-auto"
            >
              <div className="p-6 border-b border-[#D4A853]/10 flex items-start justify-between">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#D4A853]/70 block mb-1">Lead Entrante</span>
                  <h3 className="font-serif text-xl text-white">{selectedLead.company || selectedLead.email.split('@')[1]}</h3>
                  <p className="font-mono text-xs text-[#7A6F65] mt-0.5">{selectedLead.email}</p>
                </div>
                <button
                  onClick={() => setShowLeadDrawer(false)}
                  className="text-[#B0A89E] hover:text-white font-mono text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                >×</button>
              </div>

              <div className="p-6 space-y-6 flex-1">
                {/* Lead meta */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Segmento', value: selectedLead.segment, accent: selectedLead.segment === 'DFY' ? 'text-[#D4A853]' : 'text-[#B0A89E]' },
                    { label: 'Valor Est.', value: selectedLead.segment === 'DFY' ? '$2.000' : '$350', accent: 'text-[#5C9A6B]' },
                    { label: 'Fuente', value: selectedLead.source, accent: 'text-[#B0A89E]' },
                    { label: 'Recibido', value: `Hace ${Math.floor((Date.now() - new Date(selectedLead.created_at).getTime()) / 3600000)}h`, accent: 'text-[#B0A89E]' },
                  ].map(item => (
                    <div key={item.label} className="bg-black/40 border border-[#D4A853]/8 p-3 rounded-xl">
                      <span className="font-mono text-[9px] text-[#7A6F65] uppercase block mb-1">{item.label}</span>
                      <span className={`font-mono text-xs font-bold ${item.accent}`}>{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* Answers from form */}
                {Object.keys(selectedLead.answers || {}).length > 0 && (
                  <div className="space-y-3">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#D4A853]/70 block">Respuestas del Formulario</span>
                    <div className="space-y-2">
                      {Object.entries(selectedLead.answers).map(([k, v]) => (
                        <div key={k} className="bg-black/30 border border-[#D4A853]/8 p-3 rounded-xl">
                          <span className="font-mono text-[9px] text-[#7A6F65] uppercase block mb-1">{k.replace(/_/g, ' ')}</span>
                          <p className="font-mono text-xs text-[#F5F0EB] leading-relaxed">{String(v)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pre-drafted next action */}
                <div className="border border-[#D4A853]/20 bg-[#D4A853]/[0.03] p-4 rounded-2xl space-y-3">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#D4A853] block">Próxima Acción — Piloto Automático</span>
                  <p className="font-mono text-xs text-[#B0A89E] leading-relaxed">
                    {selectedLead.segment === 'DFY'
                      ? `Lead High-Ticket DFY vía ${selectedLead.source}. Prioridad: enviar diagnóstico de señal personalizado en menos de 2 horas. Adjuntar plantilla de auditoría de fricción. Asunto: "Detecté una brecha de conversión en tu funnel."`
                      : `Lead DWY vía ${selectedLead.source}. Prioridad: enviar intro de la vía de autonomía + enlace Tally en menos de 24h. Asunto: "Tu configuración de señal — 3 cosas que revisar primero."`}
                  </p>
                  <button
                    onClick={() => {
                      const action = selectedLead.segment === 'DFY'
                        ? `Enviar diagnóstico de señal a ${selectedLead.email} — outreach DFY high-ticket`
                        : `Enviar intro vía autonomía a ${selectedLead.email} — outreach DWY`;
                      navigator.clipboard.writeText(action).catch(() => {});
                    }}
                    className="w-full font-mono text-xs uppercase border border-[#D4A853]/30 text-[#D4A853] hover:bg-[#D4A853]/8 py-2 rounded-lg transition-all cursor-pointer"
                  >
                    Copiar Borrador de Acción
                  </button>
                </div>

                {selectedLead.website && (
                  <a
                    href={selectedLead.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 font-mono text-xs text-[#D4A853] hover:underline"
                  >
                    🌐 {selectedLead.website}
                  </a>
                )}
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Client Parameters Modal */}
      <AnimatePresence>
        {showModal && selectedClient && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#110F0D] border border-[#D4A853]/20 w-full max-w-[860px] p-6 rounded-2xl shadow-2xl relative space-y-6 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-start border-b border-[#D4A853]/10 pb-4">
                <div>
                  <span className="font-mono text-xs text-[#D4A853]/70 uppercase tracking-wider">Panel de Control del Cliente</span>
                  <h3 className="text-xl font-serif font-bold text-white mt-1">{selectedClient.company_name}</h3>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-[#B0A89E] hover:text-white font-mono text-xl cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Form & Actions (col-span-7) */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Main parameters inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                    <div className="space-y-1.5">
                      <label className="text-[#B0A89E] uppercase">Nombre de Contacto</label>
                      <p className="p-3 bg-black/40 border border-[#D4A853]/8 rounded text-white">{selectedClient.contact_name}</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[#B0A89E] uppercase">Email</label>
                      <p className="p-3 bg-black/40 border border-[#D4A853]/8 rounded text-white">{selectedClient.contact_email}</p>
                    </div>
                  </div>

                  {/* Founder psychology notes */}
                  <div className="space-y-1.5 font-mono text-xs">
                    <label className="text-[#B0A89E] uppercase tracking-wider block">Psicología del Fundador / Notas Privadas</label>
                    <textarea
                      value={modalPrivateNotes}
                      onChange={e => setModalPrivateNotes(e.target.value)}
                      placeholder="Registra restricciones cognitivas, cuellos de botella de runway y alineación con la psicología del fundador..."
                      className="w-full bg-black/40 border border-[#D4A853]/8 focus:border-[#D4A853] focus:outline-none p-3 rounded text-white h-16 font-sans text-xs"
                    />
                  </div>

                  {/* Toggles section */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                    {/* Certified toggle */}
                    <div className="border border-[#D4A853]/8 p-3 rounded space-y-1 bg-black/20">
                      <span className="text-[#B0A89E] uppercase block">Licencia Certificada</span>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-white font-serif">{modalIsCertified ? "S&F Licenciado" : "Sin Licencia"}</span>
                        <button
                          type="button"
                          onClick={() => setModalIsCertified(!modalIsCertified)}
                          className={`px-3 py-1 rounded border text-xs font-mono cursor-pointer uppercase ${
                            modalIsCertified ? "border-[#D4A853] bg-[#D4A853]/10 text-[#D4A853]" : "border-white/10 text-[#7A6F65]"
                          }`}
                        >
                          {modalIsCertified ? "ON" : "OFF"}
                        </button>
                      </div>
                    </div>

                    {/* Segment selector */}
                    <div className="border border-[#D4A853]/8 p-3 rounded space-y-1 bg-black/20">
                      <span className="text-[#B0A89E] uppercase block">Segmento Asignado</span>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-white font-serif">{modalSegment === "high_ticket" ? "High-Ticket" : "Microdosing"}</span>
                        <button
                          type="button"
                          onClick={() => setModalSegment(modalSegment === "high_ticket" ? "microdosing" : "high_ticket")}
                          className="px-3 py-1 border border-[#D4A853]/30 text-[#D4A853] rounded text-xs font-mono cursor-pointer uppercase hover:bg-[#D4A853]/5"
                        >
                          Toggle
                        </button>
                      </div>
                    </div>

                    {/* Cognitive fatigue slider */}
                    <div className="border border-[#D4A853]/8 p-3 rounded space-y-1 bg-black/20 flex flex-col justify-between">
                      <div className="flex justify-between">
                        <span className="text-[#B0A89E] uppercase">Fatiga Cognitiva</span>
                        <span className="text-[#D4A853] font-bold">{modalCognitiveFatigue}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={modalCognitiveFatigue}
                        onChange={e => setModalCognitiveFatigue(Number(e.target.value))}
                        className="w-full h-1 bg-[#2A2218] rounded-lg appearance-none cursor-pointer accent-[#D4A853] mt-2"
                      />
                    </div>
                  </div>

                  {/* Pipeline Action Protocol */}
                  <div className="border border-[#D4A853]/15 p-4 rounded bg-black/30 space-y-4">
                    <span className="font-mono text-xs text-[#D4A853] uppercase tracking-wider block border-b border-[#D4A853]/8 pb-2">
                      Protocolo de Acción Pipeline
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedClient.status === "prospecting" && (
                        <button
                          type="button"
                          disabled={actionLoading !== null}
                          onClick={() => handlePipelineAction("outreach_sent", `/beta:send-outreach --client=${selectedClient.id}`)}
                          className="px-3 py-1.5 bg-[#D4A853]/10 border border-[#D4A853]/30 text-[#D4A853] rounded-md text-xs font-mono hover:bg-[#D4A853]/25 cursor-pointer uppercase disabled:opacity-50"
                        >
                          {actionLoading === "outreach_sent" ? "Enviando..." : "⚡ Enviar Outreach (MCP)"}
                        </button>
                      )}
                      
                      {selectedClient.status === "outreach_sent" && (
                        <>
                          <button
                            type="button"
                            disabled={actionLoading !== null}
                            onClick={() => handlePipelineAction("diagnostic_in_progress")}
                            className="px-3 py-1.5 bg-[#D4A853]/10 border border-[#D4A853]/30 text-[#D4A853] rounded-md text-xs font-mono hover:bg-[#D4A853]/25 cursor-pointer uppercase disabled:opacity-50"
                          >
                            {actionLoading === "diagnostic_in_progress" ? "Procesando..." : "✓ Respondió"}
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading !== null}
                            onClick={() => handleSendFollowup()}
                            className="px-3 py-1.5 bg-white/5 border border-white/10 text-white rounded text-xs font-mono hover:bg-white/10 cursor-pointer uppercase disabled:opacity-50"
                          >
                            {actionLoading === "followup" ? "Registrando..." : "📋 Enviar Seguimiento"}
                          </button>
                        </>
                      )}

                      {selectedClient.status === "diagnostic_in_progress" && (
                        <button
                          type="button"
                          disabled={actionLoading !== null}
                          onClick={() => setShowDiagnosticForm(true)}
                          className="px-3 py-1.5 bg-[#D4A853]/10 border border-[#D4A853]/30 text-[#D4A853] rounded-md text-xs font-mono hover:bg-[#D4A853]/25 cursor-pointer uppercase disabled:opacity-50"
                        >
                          📬 Entregar Diagnóstico
                        </button>
                      )}

                      {(selectedClient.status === "delivered" || selectedClient.status === "awaiting_testimonial" || selectedClient.status === "closed_completed") && (
                        <button
                          type="button"
                          disabled={actionLoading !== null}
                          onClick={() => handlePipelineAction("closed_completed", `/beta:request-testimonial --client=${selectedClient.id}`)}
                          className="px-3 py-1.5 bg-[#D4A853]/10 border border-[#D4A853]/30 text-[#D4A853] rounded-md text-xs font-mono hover:bg-[#D4A853]/25 cursor-pointer uppercase disabled:opacity-50"
                        >
                          {actionLoading === "closed_completed" ? "Completando..." : "🏆 Solicitar Testimonio (MCP)"}
                        </button>
                      )}
                    </div>
                    {mcpToast && (
                      <div className="mt-3 p-2 bg-[#5C9A6B]/10 border border-[#5C9A6B]/30 text-[#5C9A6B] text-xs font-mono rounded-md animate-pulse">
                        {mcpToast}
                      </div>
                    )}

                    {/* Diagnostic Form */}
                    {showDiagnosticForm && (
                      <div className="border border-[#D4A853]/20 p-4 rounded bg-black/40 space-y-3 mt-3">
                        <span className="font-mono text-xs text-[#D4A853] uppercase block">Formulario de Entregables del Diagnóstico</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                          <div className="space-y-1">
                            <label className="text-[#B0A89E] uppercase">URL de Loom (Requerido)</label>
                            <input
                              type="text"
                              value={loomUrl}
                              onChange={(e) => setLoomUrl(e.target.value)}
                              placeholder="https://loom.com/share/..."
                              className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[#B0A89E] uppercase">URL de Figma (Opcional)</label>
                            <input
                              type="text"
                              value={figmaUrl}
                              onChange={(e) => setFigmaUrl(e.target.value)}
                              placeholder="https://figma.com/file/..."
                              className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[#B0A89E] uppercase">Signal del Funnel</label>
                            <textarea
                              value={diagSignal}
                              onChange={(e) => setDiagSignal(e.target.value)}
                              rows={2}
                              placeholder="Ej: 85% de trials de alto intento llegan al pricing selector. Solo el 12% procede al checkout..."
                              className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none resize-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[#B0A89E] uppercase">Mecanismo de Fricción</label>
                            <select
                              value={diagMechanism}
                              onChange={(e) => setDiagMechanism(e.target.value)}
                              className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none"
                            >
                              {["Cognitive Load", "Trust Deficit", "Technical Friction", "Ordering Error", "Value Ambiguity", "Motivation Gap"].map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[#B0A89E] uppercase">Causa Raíz</label>
                            <textarea
                              value={diagRootCause}
                              onChange={(e) => setDiagRootCause(e.target.value)}
                              rows={2}
                              placeholder="Describe la causa raíz identificada..."
                              className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none resize-none"
                            />
                          </div>
                        </div>
                        {(() => {
                          const ck = (selectedClient?.company_name || selectedClient?.company || "client")
                            .toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
                          return (
                            <div className="space-y-1.5 text-[10px] font-mono">
                              <div className="text-[#5C9A6B] bg-[#5C9A6B]/5 border border-[#5C9A6B]/15 px-3 py-1.5 rounded flex items-center justify-between gap-2">
                                <span>✓ Entregable activo inmediatamente — sin rebuild</span>
                                <button
                                  type="button"
                                  onClick={() => navigator.clipboard.writeText(`https://signal-and-friction.com/deliverable/${ck}`).catch(() => {})}
                                  className="shrink-0 text-[#5C9A6B] hover:text-white border border-[#5C9A6B]/30 px-2 py-0.5 rounded cursor-pointer"
                                >
                                  ⧉ /deliverable/{ck}
                                </button>
                              </div>
                              <div className="text-[#D4A853] bg-[#D4A853]/5 border border-[#D4A853]/15 px-3 py-1.5 rounded flex items-center justify-between gap-2">
                                <span>⏱ SLA activo — comparte con el cliente ahora</span>
                                <button
                                  type="button"
                                  onClick={() => navigator.clipboard.writeText(`https://signal-and-friction.com/sla/${ck}`).catch(() => {})}
                                  className="shrink-0 text-[#D4A853] hover:text-white border border-[#D4A853]/30 px-2 py-0.5 rounded cursor-pointer"
                                >
                                  ⧉ /sla/{ck}
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                        {diagnosticError && <p className="text-[#C85C5C] text-xs font-mono">{diagnosticError}</p>}
                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowDiagnosticForm(false);
                              setDiagnosticError("");
                            }}
                            className="px-3 py-1 bg-white/5 text-white border border-white/10 hover:bg-white/10 rounded font-mono text-xs"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleConfirmDelivery}
                            className="px-3 py-1 bg-[#D4A853] text-[#0A0908] hover:bg-[#E8C97A] rounded font-mono font-bold text-xs"
                          >
                            Confirmar Entrega
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Performance Guarantee protocol block */}
                  <div className="border border-[#D4A853]/15 p-4 rounded bg-black/30 space-y-4">
                    <div className="flex justify-between items-center border-b border-[#D4A853]/8 pb-2">
                      <span className="font-mono text-xs text-white uppercase tracking-wider block">
                        Garantía de Rendimiento (Protocolo Moat)
                      </span>
                      <button
                        type="button"
                        onClick={() => setModalGuaranteeActive(!modalGuaranteeActive)}
                        className={`px-3 py-1 rounded border text-xs font-mono cursor-pointer uppercase ${
                          modalGuaranteeActive ? "border-[#D4A853] bg-[#D4A853]/10 text-[#D4A853]" : "border-white/10 text-[#7A6F65]"
                        }`}
                      >
                        {modalGuaranteeActive ? "ACTIVA" : "DESACTIVADA"}
                      </button>
                    </div>

                    {modalGuaranteeActive && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[0.62rem]">
                        {/* Gate checklist */}
                        <div className="space-y-2 border-r border-[#D4A853]/8 pr-4">
                          <span className="text-[#B0A89E] uppercase block mb-1">Checklist de Gates:</span>
                          <div className="space-y-1.5">
                            <label className="flex items-center gap-2 cursor-pointer text-white">
                              <input
                                type="checkbox"
                                checked={modalTrafficGate}
                                onChange={e => setModalTrafficGate(e.target.checked)}
                                className="accent-[#D4A853]"
                              />
                              Gate de Tráfico (&gt;15k visitas/mes)
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-white">
                              <input
                                type="checkbox"
                                checked={modalSlaGate}
                                onChange={e => setModalSlaGate(e.target.checked)}
                                className="accent-[#D4A853]"
                              />
                              Gate SLA 72h
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-white">
                              <input
                                type="checkbox"
                                checked={modalIsolationGate}
                                onChange={e => setModalIsolationGate(e.target.checked)}
                                className="accent-[#D4A853]"
                              />
                              Gate de Aislamiento A/B
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-white">
                              <input
                                type="checkbox"
                                checked={modalTelemetryGate}
                                onChange={e => setModalTelemetryGate(e.target.checked)}
                                className="accent-[#D4A853]"
                              />
                              Gate de Telemetría PostHog
                            </label>
                          </div>
                        </div>

                        {/* Numeric parameters and status */}
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[#B0A89E] uppercase">Mejora Objetivo %</label>
                              <input
                                type="number"
                                value={modalTargetImprovement}
                                onChange={e => setModalTargetImprovement(Number(e.target.value))}
                                className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[#B0A89E] uppercase">Ventana (Días)</label>
                              <input
                                type="number"
                                value={modalTimeframeDays}
                                onChange={e => setModalTimeframeDays(Number(e.target.value))}
                                className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[#B0A89E] uppercase">Conv% Base</label>
                              <input
                                type="number"
                                step="0.01"
                                value={modalBaselineRate}
                                onChange={e => setModalBaselineRate(Number(e.target.value))}
                                className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[#B0A89E] uppercase">Conv% Actual</label>
                              <input
                                type="number"
                                step="0.01"
                                value={modalCurrentRate}
                                onChange={e => setModalCurrentRate(Number(e.target.value))}
                                className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[#B0A89E] uppercase">Estado de Garantía</label>
                            <select
                              value={modalGuaranteeStatus}
                              onChange={e => setModalGuaranteeStatus(e.target.value as any)}
                              className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white"
                            >
                              <option value="active">Monitoreo Activo</option>
                              <option value="met">Objetivo Alcanzado</option>
                              <option value="failed_refunded">Fallida (Reembolso Stripe)</option>
                              <option value="voided">Anulada (Gate Incumplido)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Timeline & Friction Diagnostics (col-span-5) */}
                <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-white/10 pt-6 lg:pt-0 lg:pl-6 space-y-6 flex flex-col max-h-[60vh] overflow-y-auto">
                  <div className="space-y-3">
                    <span className="font-mono text-xs text-[#B0A89E] uppercase tracking-wider block border-b border-[#D4A853]/8 pb-1">
                      Diagnósticos de Fricción
                    </span>
                    {selectedClientInteractions.length === 0 ? (
                      <p className="text-xs text-[#B0A89E] font-mono italic">Sin diagnósticos registrados.</p>
                    ) : (
                      selectedClientInteractions.map((inter, i) => (
                        <div key={inter.id || i} className="bg-black/30 p-3 border border-[#D4A853]/8 rounded space-y-1.5">
                          <div className="flex justify-between text-[0.58rem] font-mono">
                            <span className="text-[#D4A853]">{inter.dominant_friction_mechanism?.replace(/_/g, " ").toUpperCase()}</span>
                            <span className="text-[#B0A89E]">{new Date(inter.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-[#F5F0EB] font-sans leading-relaxed">{inter.root_cause_description}</p>
                          {inter.diagnostic_loom_url && (
                            <a
                              href={inter.diagnostic_loom_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-[#D4A853] hover:underline block font-mono"
                            >
                              🎬 Ver Vídeo Loom
                            </a>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-3 grow flex flex-col min-h-0">
                    <span className="font-mono text-xs text-[#B0A89E] uppercase tracking-wider block border-b border-[#D4A853]/8 pb-1">
                      Historial de Actividad
                    </span>
                    <div className="overflow-y-auto space-y-2 grow pr-1 scrollbar-thin max-h-[300px]">
                      {loadingLogs ? (
                        <p className="text-xs text-[#B0A89E] font-mono animate-pulse">Cargando historial...</p>
                      ) : selectedClientLogs.length === 0 ? (
                        <p className="text-xs text-[#B0A89E] font-mono italic">Sin eventos registrados.</p>
                      ) : (
                        selectedClientLogs.map((log) => (
                          <div key={log.id} className="text-xs font-mono border-b border-[#D4A853]/8 pb-2 last:border-b-0">
                            <div className="text-[#B0A89E] flex justify-between mb-0.5">
                              <span>{new Date(log.created_at).toLocaleDateString()}</span>
                              <span>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-[#F5F0EB] leading-snug">{log.message || log.action}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t border-[#D4A853]/8 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-white/10 hover:text-white uppercase tracking-wider rounded cursor-pointer text-xs font-mono"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveClientDetails}
                  className="px-5 py-2 bg-[#D4A853] text-[#0A0908] font-bold uppercase tracking-wider hover:bg-[#E8C97A] transition-all rounded cursor-pointer text-xs font-mono"
                >
                  Guardar Parámetros
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
