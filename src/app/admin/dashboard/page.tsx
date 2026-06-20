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

const springConfig = { type: "spring" as const, stiffness: 100, damping: 18 };

export default function AdminDashboard() {
  const [activeView, setActiveView] = useState<'pipeline' | 'learning'>('pipeline');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [incidents, setIncidents] = useState<AIIncident[]>([]);
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [loading, setLoading] = useState(true);

  // Kanban Filter & Logs/Interactions states
  const [kanbanFilter, setKanbanFilter] = useState<string | null>(null);
  const [selectedClientLogs, setSelectedClientLogs] = useState<any[]>([]);
  const [selectedClientInteractions, setSelectedClientInteractions] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDiagnosticForm, setShowDiagnosticForm] = useState(false);
  const [loomUrl, setLoomUrl] = useState("");
  const [figmaUrl, setFigmaUrl] = useState("");
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
      setModalSlaGate(!!client.guarantee.sla_gate_met);
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

      setSelectedClient((prev: any) => prev ? { ...prev, status: "delivered" } : null);
      setShowDiagnosticForm(false);
      setLoomUrl("");
      setFigmaUrl("");
      
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
      default: return "bg-white/5 border-white/10 text-[#9A8F82]";
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
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#D4A853]/60 block mb-2">Internal OS</span>
            <h1 className="text-4xl font-serif text-white tracking-tight">Signal &amp; Friction Pipeline</h1>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <span className="font-mono text-xs uppercase tracking-wider text-[#D4A853] border border-[#D4A853]/25 px-3 py-1 rounded bg-[#D4A853]/5">
              Authenticated Admin Workspace
            </span>
          </div>
        </header>

        {/* Dual View Tabs Navigation */}
        <div className="flex border-b border-[#D4A853]/8 gap-8">
          <button
            onClick={() => setActiveView('pipeline')}
            className={`pb-4 font-mono text-xs uppercase tracking-widest border-b-2 transition-all duration-300 cursor-pointer ${
              activeView === 'pipeline' ? "border-[#D4A853] text-[#D4A853]" : "border-transparent text-[#7A6F65] hover:text-[#9A8F82]"
            }`}
          >
            Pipeline &amp; Conversions
          </button>
          <button
            onClick={() => setActiveView('learning')}
            className={`pb-4 font-mono text-xs uppercase tracking-widest border-b-2 transition-all duration-300 cursor-pointer relative ${
              activeView === 'learning' ? "border-[#D4A853] text-[#D4A853]" : "border-transparent text-[#7A6F65] hover:text-[#9A8F82]"
            }`}
          >
            Continuous Learning OS
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
              {/* $1M Revenue Mission Progress */}
              <RevenueProgressBar current={(m.dealsClosed || 0) * 350} target={1000000} />

              {/* 30-Day Sprint Tracker */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs text-[#D4A853]/60 tracking-[0.3em] uppercase">30-Day Sprint Tracker</span>
                  <span className="font-mono text-xs text-[#7A6F65] border border-[#D4A853]/10 px-2 py-0.5 rounded-full">Phase 2 · $1M Path</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {(() => {
                    const clients = m.dealsClosed || 0;
                    const htMrr = (m.highTicketCount || 0) * 2000;
                    const dwyMrr = (m.microdosingCount || 0) * 350;
                    const mrr = htMrr + dwyMrr || clients * 350;
                    const pctToMillion = +((mrr * 12) / 10000).toFixed(1);
                    return [
                      { label: "Clients Acquired", display: String(clients), accent: "text-[#5C9A6B]" },
                      { label: "MRR", display: `$${mrr.toLocaleString()}`, accent: "text-[#D4A853]" },
                      { label: "Cash Collected", display: `$${mrr.toLocaleString()}`, accent: "text-[#D4A853]" },
                      { label: "% to $1M ARR", display: `${pctToMillion}%`, accent: "text-[#F5F0EB]" },
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
                  { label: "Total Leads", value: m.totalLeads, detail: "All profiles", color: "text-[#F5F0EB]" },
                  { label: "High-Ticket", value: m.highTicketCount || 0, detail: "Concierge track", color: "text-[#D4A853]" },
                  { label: "Microdosing", value: m.microdosingCount || 0, detail: "Autonomy track", color: "text-[#9A8F82]" },
                  { label: "Outreach Sent", value: m.outreachSent, detail: "Beta DMs active", color: "text-[#D4A853]" },
                  { label: "Diagnostics", value: m.diagnosticsDelivered, detail: "Loom briefs sent", color: "text-[#D4A853]" },
                  { label: "Deals Closed", value: m.dealsClosed, detail: "Testimonial & paid", color: "text-[#5C9A6B]" },
                ].map((item, idx) => (
                  <AdminStatCard
                    key={idx}
                    label={item.label}
                    value={item.value}
                    detail={item.detail}
                    accentColor={item.color}
                  />
                ))}
              </section>

              {/* Funnel & Friction Split View */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Conversion Funnel */}
                <div className="lg:col-span-7 border border-[#D4A853]/15 p-8 bg-[#0A0908]/60 rounded space-y-6">
                  <h3 className="font-serif text-lg text-white border-b border-[#D4A853]/10 pb-3">Campaign Funnel</h3>
                  <div className="space-y-4">
                    {[
                      { step: "Identified Leads", count: m.totalLeads, pct: 100 },
                      { step: "Outreach Cycles", count: m.outreachSent + m.diagnosticsDelivered, pct: m.totalLeads > 0 ? ((m.outreachSent + m.diagnosticsDelivered) / m.totalLeads) * 100 : 0 },
                      { step: "Diagnostics Delivered", count: m.diagnosticsDelivered, pct: m.totalLeads > 0 ? (m.diagnosticsDelivered / m.totalLeads) * 100 : 0 },
                      { step: "Closed Beta Success", count: m.dealsClosed, pct: m.totalLeads > 0 ? (m.dealsClosed / m.totalLeads) * 100 : 0 },
                    ].map((item, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-[#9A8F82]">{item.step}</span>
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
                  <h3 className="font-serif text-lg text-white border-b border-[#D4A853]/10 pb-3">Friction Mechanisms Detected</h3>
                  <div className="space-y-3">
                    {[
                      { key: "Cognitive Load", count: m.frictionCounts.cognitive_load, color: "bg-[#D4A853]" },
                      { key: "Trust Deficit", count: m.frictionCounts.trust_deficit, color: "bg-[#22C55E]" },
                      { key: "Value Deficit", count: m.frictionCounts.value_deficit, color: "bg-[#3B82F6]" },
                      { key: "Sequence Order", count: m.frictionCounts.sequence_order, color: "bg-[#A855F7]" },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                          <span className="text-[#9A8F82]">{item.key}</span>
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
                      <span className="text-[#D4A853]">⚡</span> Outcomes Guarantees
                    </h3>
                    <span className="font-mono text-xs uppercase bg-[#D4A853]/10 text-[#D4A853] px-3 py-1 rounded-full border border-[#D4A853]/20">
                      {m.activeGuaranteesCount || 0} Active
                    </span>
                  </div>

                  <p className="text-sm text-[#9A8F82] font-mono leading-relaxed">
                    Concierge clients on the results-based guarantee protocol. +20% conversion in 30 days or invoice voided.
                  </p>

                  <div className="space-y-4">
                    {m.pipeline.filter(p => p.guarantee_active).length === 0 ? (
                      <div className="text-sm text-[#9A8F82] font-mono text-center py-6">No active guaranteed campaigns.</div>
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
                          <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[#9A8F82]">
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
                      <span className="text-[#D4A853]">🏆</span> Certified™ Partners
                    </h3>
                    <span className="font-mono text-xs uppercase bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full border border-amber-500/20">
                      {m.certifiedCount || 0} Licensed
                    </span>
                  </div>

                  <p className="text-sm text-[#9A8F82] font-mono leading-relaxed">
                    Methodology licensed to external agencies ($1,500/yr). Audited annually for min 80% satisfaction score.
                  </p>

                  <div className="space-y-3">
                    {m.pipeline.filter(p => p.is_certified).length === 0 ? (
                      <div className="text-sm text-[#9A8F82] font-mono text-center py-6">No certified partners found.</div>
                    ) : (
                      m.pipeline.filter(p => p.is_certified).map((partner) => (
                        <div key={partner.id} className="flex justify-between items-center p-4 border border-[#D4A853]/15 bg-black/20 rounded-xl hover:border-[#D4A853]/35 transition-all duration-300">
                          <div>
                            <span className="text-sm font-serif text-white block font-medium">{partner.company_name}</span>
                            <span className="text-xs text-[#9A8F82] font-mono mt-0.5 block">{partner.contact_name}</span>
                          </div>
                          <div className="text-right space-y-1">
                            <span className="font-mono text-xs bg-[#5C9A6B]/10 text-[#5C9A6B] px-2 py-0.5 rounded-full border border-[#5C9A6B]/20 block">
                              SLA: {partner.expansion_score ? partner.expansion_score : 85}%
                            </span>
                            <span className="text-xs text-[#7A6F65] font-mono block">
                              Next Audit: Dec 2026
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>

              {/* Pipeline Kanban View */}
              <section className="border border-[#D4A853]/10 p-8 bg-[#110F0D]/60 rounded-2xl space-y-6">
                <div className="flex justify-between items-center border-b border-[#D4A853]/10 pb-4">
                  <h3 className="font-serif text-xl text-white">Active Board</h3>
                  <span className="text-xs font-mono text-[#7A6F65] uppercase tracking-wider">
                    Click a card to edit parameters
                  </span>
                </div>

                {/* Next Actions summary bar */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-5 border border-[#D4A853]/15 bg-black/40 rounded-xl">
                  {[
                    { status: "prospecting", title: "Needs Outreach", count: m.pipeline.filter(p => p.status === "prospecting").length, color: "text-[#D4A853]", action: "Send outreach pitch" },
                    { status: "outreach_sent", title: "Follow-up Needed", count: m.pipeline.filter(p => p.status === "outreach_sent").length, color: "text-amber-400", action: "Follow-up or progress" },
                    { status: "diagnostic_in_progress", title: "Needs Diagnostic", count: m.pipeline.filter(p => p.status === "diagnostic_in_progress").length, color: "text-purple-400", action: "Upload Loom & Figma" },
                    { status: "delivered", title: "Needs Close", count: m.pipeline.filter(p => p.status === "delivered" || p.status === "awaiting_testimonial").length, color: "text-[#5C9A6B]", action: "Request testimonial" },
                  ].map(card => (
                    <button
                      key={card.status}
                      onClick={() => setKanbanFilter(kanbanFilter === card.status ? null : card.status)}
                      className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-300 ${
                        kanbanFilter === card.status ? "bg-[#D4A853]/10 border-[#D4A853]" : "bg-black/30 border-[#D4A853]/8 hover:border-[#D4A853]/25"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-mono text-xs uppercase tracking-wider text-[#9A8F82]">{card.title}</span>
                        <span className={`font-mono text-xl font-bold ${card.color}`}>{card.count}</span>
                      </div>
                      <p className="text-sm text-[#9A8F82] font-sans italic">{card.action}</p>
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
                          {col.replace(/_/g, " ")} ({items.length})
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
                              <p className="text-xs text-[#9A8F82]">{item.contact_name}</p>

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
                                <p className="text-sm font-mono text-[#9A8F82] mt-2 italic line-clamp-1 border-t border-[#D4A853]/8 pt-2">
                                  {item.private_notes}
                                </p>
                              )}

                              <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#D4A853]/8 text-xs font-mono">
                                <span className={item.payment_status === "paid" ? "text-[#5C9A6B] font-medium" : "text-[#7A6F65]"}>
                                  {item.payment_status}
                                </span>
                                <span className="text-[#5C5550]">#{item.id.slice(0, 4)}</span>
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
                    <h4 className="font-mono text-xs uppercase tracking-widest text-[#C85C5C] font-bold">CRITICAL SYSTEM ALERT</h4>
                    <p className="text-xs text-white leading-relaxed">
                      Found {criticalAlerts.length} unresolved high or critical severity incident(s). System execution safety boundaries are degraded. Run the MCP command <code className="font-mono text-amber-500 bg-black/40 px-2 py-0.5 rounded border border-[#D4A853]/8 select-all">/beta:iterate-from-incidents</code> immediately to inject repairs.
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
                  { label: "Active Version", value: currentVersion, detail: "Global prompt iteration" },
                  { label: "Unresolved", value: unresolvedIncidents.length, detail: "Pending analysis" },
                  { label: "Mitigated", value: resolvedIncidents.length, detail: "Lessons learned" },
                  { label: "Avg Resolution", value: resolvedIncidents.length > 0 ? "1.0 hr" : "N/A", detail: "Mitigation speed" },
                ].map((item, idx) => (
                  <div key={idx} className="border border-[#D4A853]/15 p-5 bg-[#110F0D] rounded-2xl relative overflow-hidden">
                    <span className="font-mono text-xs text-[#D4A853]/60 uppercase tracking-wider block mb-2">{item.label}</span>
                    <span className="font-serif text-3xl font-bold text-white block mb-1">{item.value}</span>
                    <span className="text-xs text-[#7A6F65]">{item.detail}</span>
                  </div>
                ))}
              </section>

              {/* Detailed Breakdown Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Timeline Panel */}
                <div className="lg:col-span-7 border border-[#D4A853]/15 p-8 bg-[#0A0908]/60 rounded space-y-6">
                  <h3 className="font-serif text-lg text-white border-b border-[#D4A853]/10 pb-3">Incident Timeline</h3>
                  <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                    {incidents.length === 0 ? (
                      <div className="text-sm text-[#9A8F82] font-mono py-12 text-center">No AI or process incidents recorded.</div>
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
                            <span className="font-mono text-xs text-[#9A8F82]">
                              {new Date(inc.created_at).toLocaleString()}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <span className="font-mono text-xs text-[#9A8F82] uppercase block">
                              Phase: <strong className="text-[#D4A853]">{inc.phase}</strong>
                            </span>
                            <p className="text-sm text-[#9A8F82] leading-relaxed font-mono">
                              {inc.description}
                            </p>
                          </div>

                          {!inc.resolved_at && inc.root_cause && (
                            <div className="border-t border-[#D4A853]/8 pt-3">
                              <span className="font-mono text-xs text-[#D4A853] uppercase block mb-1">Root Cause Analysis</span>
                              <p className="text-sm text-[#9A8F82] leading-relaxed font-mono">
                                {inc.root_cause}
                              </p>
                            </div>
                          )}

                          {inc.resolved_at && (
                            <div className="border-t border-[#5C9A6B]/10 bg-[#5C9A6B]/[0.03] p-3 rounded-xl space-y-2">
                              <div className="flex justify-between items-center text-xs font-mono">
                                <span className="text-[#5C9A6B] uppercase">✓ Resolved &amp; Mitigated</span>
                                <span className="text-[#9A8F82]">{inc.iteration_version}</span>
                              </div>
                              <p className="text-sm text-[#9A8F82] leading-relaxed font-mono">
                                <strong className="text-[#9A8F82]">Resolution: </strong>{inc.resolution}
                              </p>
                              {inc.lesson_learned && (
                                <p className="text-sm text-[#9A8F82] leading-relaxed font-mono italic">
                                  <strong className="text-[#9A8F82]">Lesson: </strong>&quot;{inc.lesson_learned}&quot;
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
                    <h3 className="font-serif text-lg text-white border-b border-[#D4A853]/10 pb-3">Weekly AI Advancement Tracker</h3>
                    <div className="space-y-4">
                      {[
                        { title: "OpenAI GPT-4o fine-tuning updates", desc: "Fine-tuning models on UX heuristics reduces conversion copywriting errors by 18%.", date: "June 19, 2026", type: "OpenAI" },
                        { title: "Anthropic Claude 3.5 Sonnet limits expanded", desc: "High conceptual thinking benchmarks suggest 3-draft Socratic generation speed scales by 3x.", date: "June 15, 2026", type: "Anthropic" },
                        { title: "Google DeepMind Gemini 1.5 Pro visual context", desc: "1M token context allows ingestion of entire Figma wireframes for layout validation.", date: "June 10, 2026", type: "Google" }
                      ].map((item, idx) => (
                        <div key={idx} className="border border-[#D4A853]/8 bg-[#0A0908]/40 p-4 rounded space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-[#D4A853]">{item.type}</span>
                            <span className="text-[#9A8F82]">{item.date}</span>
                          </div>
                          <h4 className="text-xs font-bold text-white font-serif">{item.title}</h4>
                          <p className="text-sm text-[#9A8F82] leading-relaxed font-mono">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Error Patterns */}
                  <div className="border border-[#D4A853]/15 p-8 bg-[#0A0908]/60 rounded space-y-6">
                    <h3 className="font-serif text-lg text-white border-b border-[#D4A853]/10 pb-3">Error Patterns Detected</h3>
                    <div className="space-y-4">
                      {sortedPatterns.length === 0 ? (
                        <div className="text-xs text-[#9A8F82] font-mono text-center py-6">No patterns recorded.</div>
                      ) : (
                        sortedPatterns.map(([type, count]) => {
                          const percentage = incidents.length > 0 ? (count / incidents.length) * 100 : 0;
                          return (
                            <div key={type} className="space-y-1.5">
                              <div className="flex justify-between text-xs font-mono">
                                <span className="text-[#9A8F82] text-xs">{type.replace(/_/g, " ")}</span>
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
                  <span className="font-mono text-xs text-[#D4A853]/70 uppercase tracking-wider">Client Control Panel</span>
                  <h3 className="text-xl font-serif font-bold text-white mt-1">{selectedClient.company_name}</h3>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-[#9A8F82] hover:text-white font-mono text-xl cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
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
                      <label className="text-[#9A8F82] uppercase">Contact Name</label>
                      <p className="p-3 bg-black/40 border border-[#D4A853]/8 rounded text-white">{selectedClient.contact_name}</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[#9A8F82] uppercase">Email</label>
                      <p className="p-3 bg-black/40 border border-[#D4A853]/8 rounded text-white">{selectedClient.contact_email}</p>
                    </div>
                  </div>

                  {/* Founder psychology notes */}
                  <div className="space-y-1.5 font-mono text-xs">
                    <label className="text-[#9A8F82] uppercase tracking-wider block">Founder Psychology / Private Notes</label>
                    <textarea
                      value={modalPrivateNotes}
                      onChange={e => setModalPrivateNotes(e.target.value)}
                      placeholder="Record cognitive constraints, runway bottlenecks, and founder psychology alignment here..."
                      className="w-full bg-black/40 border border-[#D4A853]/8 focus:border-[#D4A853] focus:outline-none p-3 rounded text-white h-16 font-sans text-xs"
                    />
                  </div>

                  {/* Toggles section */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                    {/* Certified toggle */}
                    <div className="border border-[#D4A853]/8 p-3 rounded space-y-1 bg-black/20">
                      <span className="text-[#9A8F82] uppercase block">Certified License</span>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-white font-serif">{modalIsCertified ? "S&F Licensed" : "Unlicensed"}</span>
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
                      <span className="text-[#9A8F82] uppercase block">Assigned Segment</span>
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
                        <span className="text-[#9A8F82] uppercase">Cognitive Fatigue</span>
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
                      Pipeline Action Protocol
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedClient.status === "prospecting" && (
                        <button
                          type="button"
                          disabled={actionLoading !== null}
                          onClick={() => handlePipelineAction("outreach_sent", `/beta:send-outreach --client=${selectedClient.id}`)}
                          className="px-3 py-1.5 bg-[#D4A853]/10 border border-[#D4A853]/30 text-[#D4A853] rounded-md text-xs font-mono hover:bg-[#D4A853]/25 cursor-pointer uppercase disabled:opacity-50"
                        >
                          {actionLoading === "outreach_sent" ? "Sending..." : "⚡ Send Outreach (MCP)"}
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
                            {actionLoading === "diagnostic_in_progress" ? "Processing..." : "✓ Mark Responded"}
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading !== null}
                            onClick={() => handleSendFollowup()}
                            className="px-3 py-1.5 bg-white/5 border border-white/10 text-white rounded text-xs font-mono hover:bg-white/10 cursor-pointer uppercase disabled:opacity-50"
                          >
                            {actionLoading === "followup" ? "Logging..." : "📋 Send Follow-up"}
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
                          📬 Deliver Diagnostic
                        </button>
                      )}

                      {(selectedClient.status === "delivered" || selectedClient.status === "awaiting_testimonial" || selectedClient.status === "closed_completed") && (
                        <button
                          type="button"
                          disabled={actionLoading !== null}
                          onClick={() => handlePipelineAction("closed_completed", `/beta:request-testimonial --client=${selectedClient.id}`)}
                          className="px-3 py-1.5 bg-[#D4A853]/10 border border-[#D4A853]/30 text-[#D4A853] rounded-md text-xs font-mono hover:bg-[#D4A853]/25 cursor-pointer uppercase disabled:opacity-50"
                        >
                          {actionLoading === "closed_completed" ? "Completing..." : "🏆 Request Testimonial (MCP)"}
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
                        <span className="font-mono text-xs text-[#D4A853] uppercase block">Diagnostic Deliverables Form</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                          <div className="space-y-1">
                            <label className="text-[#9A8F82] uppercase">Loom URL (Required)</label>
                            <input
                              type="text"
                              value={loomUrl}
                              onChange={(e) => setLoomUrl(e.target.value)}
                              placeholder="https://loom.com/share/..."
                              className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[#9A8F82] uppercase">Figma URL (Optional)</label>
                            <input
                              type="text"
                              value={figmaUrl}
                              onChange={(e) => setFigmaUrl(e.target.value)}
                              placeholder="https://figma.com/file/..."
                              className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none"
                            />
                          </div>
                        </div>
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
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleConfirmDelivery}
                            className="px-3 py-1 bg-[#D4A853] text-[#0A0908] hover:bg-[#E8C97A] rounded font-mono font-bold text-xs"
                          >
                            Confirm Delivery
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Performance Guarantee protocol block */}
                  <div className="border border-[#D4A853]/15 p-4 rounded bg-black/30 space-y-4">
                    <div className="flex justify-between items-center border-b border-[#D4A853]/8 pb-2">
                      <span className="font-mono text-xs text-white uppercase tracking-wider block">
                        Performance Guarantee (Moat Protocol)
                      </span>
                      <button
                        type="button"
                        onClick={() => setModalGuaranteeActive(!modalGuaranteeActive)}
                        className={`px-3 py-1 rounded border text-xs font-mono cursor-pointer uppercase ${
                          modalGuaranteeActive ? "border-[#D4A853] bg-[#D4A853]/10 text-[#D4A853]" : "border-white/10 text-[#7A6F65]"
                        }`}
                      >
                        {modalGuaranteeActive ? "ACTIVE" : "DISABLED"}
                      </button>
                    </div>

                    {modalGuaranteeActive && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[0.62rem]">
                        {/* Gate checklist */}
                        <div className="space-y-2 border-r border-[#D4A853]/8 pr-4">
                          <span className="text-[#9A8F82] uppercase block mb-1">Checklist Gates:</span>
                          <div className="space-y-1.5">
                            <label className="flex items-center gap-2 cursor-pointer text-white">
                              <input
                                type="checkbox"
                                checked={modalTrafficGate}
                                onChange={e => setModalTrafficGate(e.target.checked)}
                                className="accent-[#D4A853]"
                              />
                              Traffic Gate (&gt;15k visitors/mo)
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-white">
                              <input
                                type="checkbox"
                                checked={modalSlaGate}
                                onChange={e => setModalSlaGate(e.target.checked)}
                                className="accent-[#D4A853]"
                              />
                              72h SLA Turnaround Gate
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-white">
                              <input
                                type="checkbox"
                                checked={modalIsolationGate}
                                onChange={e => setModalIsolationGate(e.target.checked)}
                                className="accent-[#D4A853]"
                              />
                              A/B Isolation Lock Gate
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-white">
                              <input
                                type="checkbox"
                                checked={modalTelemetryGate}
                                onChange={e => setModalTelemetryGate(e.target.checked)}
                                className="accent-[#D4A853]"
                              />
                              PostHog Telemetry Gate
                            </label>
                          </div>
                        </div>

                        {/* Numeric parameters and status */}
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[#9A8F82] uppercase">Target Bump %</label>
                              <input
                                type="number"
                                value={modalTargetImprovement}
                                onChange={e => setModalTargetImprovement(Number(e.target.value))}
                                className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[#9A8F82] uppercase">Window (Days)</label>
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
                              <label className="text-[#9A8F82] uppercase">Baseline Conv%</label>
                              <input
                                type="number"
                                step="0.01"
                                value={modalBaselineRate}
                                onChange={e => setModalBaselineRate(Number(e.target.value))}
                                className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[#9A8F82] uppercase">Current Conv%</label>
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
                            <label className="text-[#9A8F82] uppercase">Guarantee Status</label>
                            <select
                              value={modalGuaranteeStatus}
                              onChange={e => setModalGuaranteeStatus(e.target.value as any)}
                              className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white"
                            >
                              <option value="active">Active Monitoring</option>
                              <option value="met">Target Met</option>
                              <option value="failed_refunded">Failed (Stripe Refunded)</option>
                              <option value="voided">Voided (Gate Breached)</option>
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
                    <span className="font-mono text-xs text-[#9A8F82] uppercase tracking-wider block border-b border-[#D4A853]/8 pb-1">
                      Friction Diagnostics
                    </span>
                    {selectedClientInteractions.length === 0 ? (
                      <p className="text-xs text-[#9A8F82] font-mono italic">No diagnostics recorded.</p>
                    ) : (
                      selectedClientInteractions.map((inter, i) => (
                        <div key={inter.id || i} className="bg-black/30 p-3 border border-[#D4A853]/8 rounded space-y-1.5">
                          <div className="flex justify-between text-[0.58rem] font-mono">
                            <span className="text-[#D4A853]">{inter.dominant_friction_mechanism?.replace(/_/g, " ").toUpperCase()}</span>
                            <span className="text-[#9A8F82]">{new Date(inter.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-[#F5F0EB] font-sans leading-relaxed">{inter.root_cause_description}</p>
                          {inter.diagnostic_loom_url && (
                            <a
                              href={inter.diagnostic_loom_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-[#D4A853] hover:underline block font-mono"
                            >
                              🎬 Watch Loom Video
                            </a>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-3 grow flex flex-col min-h-0">
                    <span className="font-mono text-xs text-[#9A8F82] uppercase tracking-wider block border-b border-[#D4A853]/8 pb-1">
                      Activity Log / Event Timeline
                    </span>
                    <div className="overflow-y-auto space-y-2 grow pr-1 scrollbar-thin max-h-[300px]">
                      {loadingLogs ? (
                        <p className="text-xs text-[#9A8F82] font-mono animate-pulse">Fetching history...</p>
                      ) : selectedClientLogs.length === 0 ? (
                        <p className="text-xs text-[#9A8F82] font-mono italic">No events recorded.</p>
                      ) : (
                        selectedClientLogs.map((log) => (
                          <div key={log.id} className="text-xs font-mono border-b border-[#D4A853]/8 pb-2 last:border-b-0">
                            <div className="text-[#9A8F82] flex justify-between mb-0.5">
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
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveClientDetails}
                  className="px-5 py-2 bg-[#D4A853] text-[#0A0908] font-bold uppercase tracking-wider hover:bg-[#E8C97A] transition-all rounded cursor-pointer text-xs font-mono"
                >
                  Save Parameters
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
