"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

interface EvidenceItem {
  tier: "measured" | "modeled" | "pending";
  label: string;
  value: string;
  source: string;
}

interface ScanReport {
  domain: string;
  url: string;
  scannedAt: string;
  grade: string;
  frictionScore: number;
  psError: string | null;
  metrics: {
    lcp: { ms: number; label: string; status: string };
    tbt: { ms: number; label: string; status: string };
    cls: { value: number; status: string };
    performanceScore: number;
    speedIndex: { ms: number; label: string };
  };
  signals: {
    platform: string | null;
    hasStripe: boolean;
    stripeAsync: boolean;
    scriptCount: number;
    missingOgTags: string[];
    hasCheckoutIndicator: boolean;
    hasLazyImages: boolean;
  };
  frictionMechanisms: Array<{ type: string; severity: "high" | "medium" | "low"; detail: string }>;
  abandonmentDelta: number;
}

// Measured facts come straight from the scan report — never LLM-generated,
// so every claim tagged "measured" is directly traceable to a specific
// field on this object. Modeled/pending are also assembled here, not by
// Claude, for the same reason: an LLM asked to self-report its own
// evidence tier is exactly the kind of claim this whole system exists to
// distrust.
function buildEvidenceFromScan(report: ScanReport): EvidenceItem[] {
  const scannedDate = new Date(report.scannedAt || Date.now()).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const src = `Google PageSpeed Insights, mobile, scanned ${scannedDate}`;
  const htmlSrc = `Raw HTML scan, scanned ${scannedDate}`;
  const evidence: EvidenceItem[] = [];
  const m = report.metrics;

  if (m?.lcp) evidence.push({ tier: "measured", label: "Largest Contentful Paint (mobile)", value: m.lcp.label, source: src });
  if (m?.tbt) evidence.push({ tier: "measured", label: "Total Blocking Time (mobile)", value: m.tbt.label, source: src });
  if (m?.cls) evidence.push({ tier: "measured", label: "Cumulative Layout Shift (mobile)", value: String(m.cls.value), source: src });
  if (m?.performanceScore !== undefined) evidence.push({ tier: "measured", label: "Performance score (mobile)", value: `${m.performanceScore} / 100`, source: src });

  const s = report.signals;
  if (s) {
    if (s.platform) evidence.push({ tier: "measured", label: "Platform", value: s.platform, source: htmlSrc });
    evidence.push({ tier: "measured", label: "Payment processor", value: s.hasStripe ? "Stripe.js detected" : "Not detected", source: htmlSrc });
    if (s.missingOgTags?.length) evidence.push({ tier: "measured", label: "Missing OG tags", value: s.missingOgTags.join(", "), source: htmlSrc });
    evidence.push({ tier: "measured", label: "Checkout indicator in HTML", value: s.hasCheckoutIndicator ? "Detected" : "Not detected", source: htmlSrc });
  }

  (report.frictionMechanisms || []).forEach((fm) => {
    evidence.push({ tier: "measured", label: `${fm.type} signal`, value: `${fm.severity} severity`, source: `${htmlSrc} — ${fm.detail}` });
  });

  if (report.abandonmentDelta > 0) {
    evidence.push({
      tier: "modeled",
      label: "Abandonment pressure from LCP",
      value: `+${report.abandonmentDelta}% vs. baseline`,
      source: `Modeled from LCP-to-abandonment coefficient (industry aggregate, not ${report.domain}'s own funnel)`,
    });
  }

  evidence.push({
    tier: "pending",
    label: "Actual checkout/conversion completion rate",
    value: "Unknown",
    source: "Requires the client's own analytics — not visible from a public scan",
  });
  evidence.push({
    tier: "pending",
    label: "Session recordings or step-level funnel data",
    value: "Unknown",
    source: "Requires the client's own session-recording tool — not available from a public scan",
  });

  return evidence;
}

// Confidence is a function of how much concrete public signal the scan
// actually found — never Claude's self-reported certainty. Capped at 60
// regardless of signal density: this is always modeled from public
// surface signals, never the client's own funnel, so it should never read
// as "high confidence."
function computeConfidence(report: ScanReport): { level: number; reason: string } {
  if (report.psError) {
    return {
      level: 20,
      reason: "PageSpeed measurement failed for this URL — confidence is capped low since even the baseline performance signal is unavailable.",
    };
  }
  const mechanisms = report.frictionMechanisms || [];
  const highCount = mechanisms.filter((m) => m.severity === "high").length;
  const level = Math.min(30 + mechanisms.length * 6 + highCount * 6, 60);
  const reason =
    mechanisms.length > 0
      ? `Based on ${mechanisms.length} concrete friction signal${mechanisms.length === 1 ? "" : "s"} detected in the public scan (${highCount} high severity) — capped at moderate since this is public-signal analysis, not the client's own funnel data.`
      : "No specific friction signals detected beyond baseline performance metrics — capped low since there's little here to anchor a specific hypothesis on.";
  return { level, reason };
}

interface AutoDiagnosis {
  scan?: {
    domain?: string;
    grade?: string;
    frictionScore?: number;
    metrics?: { lcp?: { ms: number; status: string }; tbt?: { ms: number; status: string }; cls?: { value: number; status: string }; performanceScore?: number };
    frictionMechanisms?: Array<{ type: string; severity: string; detail: string }>;
    abandonmentDelta?: number;
  };
  diagnosis?: {
    signal: string;
    friction: string;
    hypothesis: string;
    decision: { type: string; label: string; action: string; reasoning: string; tradeoff: string };
    confidence: number;
  };
  error?: string;
  generated_at?: string;
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
  auto_diagnosis?: AutoDiagnosis | null;
}

const springConfig = { type: "spring" as const, stiffness: 100, damping: 18 };

export default function AdminDashboard() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<'pipeline' | 'learning'>('pipeline');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [incidents, setIncidents] = useState<AIIncident[]>([]);
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [revenueSparkline, setRevenueSparkline] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [arrTotal, setArrTotal] = useState<number>(0);
  const [recentPayments, setRecentPayments] = useState<Array<{
    id: string;
    email: string | null;
    amount_total: number;
    currency: string;
    product_name: string | null;
    created_at: string;
    lead_id: string | null;
    clientName: string | null;
  }>>([]);
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
  const [deliveryEmailStatus, setDeliveryEmailStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [resendingDeliveryEmail, setResendingDeliveryEmail] = useState(false);

  // Diagnostic scaffold — private draft, generated from the same scanUrl
  // used by the AI Diagnostic Engine above. Never auto-visible to a client.
  const [existingScaffoldId, setExistingScaffoldId] = useState<string | null>(null);
  const [scaffoldGenerating, setScaffoldGenerating] = useState(false);
  const [scaffoldError, setScaffoldError] = useState("");

  // AI Diagnose engine state
  const [diagnoseLoading, setDiagnoseLoading] = useState(false);
  const [diagnoseResult, setDiagnoseResult] = useState<{
    signal: string;
    friction: string;
    hypothesis: string;
    decision: { type: string; label: string; action: string; reasoning: string; tradeoff: string };
    confidence: number;
  } | null>(null);

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

  // Scan + AI diagnostic pipeline (Part B) — the admin's own "Generate
  // diagnosis" now runs the same real scan-url.ts + diagnose.ts pipeline
  // the public /scan flow uses, instead of guessing from a company name.
  const [scanUrl, setScanUrl] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanReport | null>(null);
  const [scanError, setScanError] = useState("");
  const [diagEvidence, setDiagEvidence] = useState<EvidenceItem[]>([]);
  const [diagConfidenceLevel, setDiagConfidenceLevel] = useState<number | null>(null);
  const [diagConfidenceReason, setDiagConfidenceReason] = useState("");

  // Manual-only fields (Part C, non-negotiable) — never populated by the
  // AI pipeline above. Required at publish time; see validateDeliveryPayload.
  const [deliverImpactLow, setDeliverImpactLow] = useState("");
  const [deliverImpactHigh, setDeliverImpactHigh] = useState("");
  const [deliverImpactUnit, setDeliverImpactUnit] = useState<"%" | "$">("%");
  const [deliverImpactStep, setDeliverImpactStep] = useState("");
  const [deliverImpactModeledFrom, setDeliverImpactModeledFrom] = useState("");
  const [deliverImpactNarrowsWith, setDeliverImpactNarrowsWith] = useState("");
  const [deliverDecisionLabel, setDeliverDecisionLabel] = useState("");
  const [deliverDecisionAction, setDeliverDecisionAction] = useState("");
  const [deliverDecisionReasoning, setDeliverDecisionReasoning] = useState("");
  const [deliverDecisionTradeoff, setDeliverDecisionTradeoff] = useState("");
  const [deliverAvoid, setDeliverAvoid] = useState<{ action: string; reason: string }[]>([{ action: "", reason: "" }]);

  // Full-schema optional fields (Part E) — capturable, not required; the
  // deliverable renderer already treats these as optional.
  const [deliverBeforeTitle, setDeliverBeforeTitle] = useState("");
  const [deliverBeforeIssue, setDeliverBeforeIssue] = useState("");
  const [deliverBeforeFields, setDeliverBeforeFields] = useState<string[]>([""]);
  const [deliverBeforeWarning, setDeliverBeforeWarning] = useState("");
  const [deliverBeforeBounce, setDeliverBeforeBounce] = useState("");
  const [deliverAfterTitle, setDeliverAfterTitle] = useState("");
  const [deliverAfterDomain, setDeliverAfterDomain] = useState("");
  const [deliverAfterConfirmation, setDeliverAfterConfirmation] = useState("");
  const [deliverAfterDescription, setDeliverAfterDescription] = useState("");
  const [deliverAfterGain, setDeliverAfterGain] = useState("");
  const [deliverChecklist, setDeliverChecklist] = useState<{ task: string; tip: string }[]>([]);
  const [deliverLearningModules, setDeliverLearningModules] = useState<{ title: string; description: string; content: string }[]>([]);

  // Part D — dry-run review + hard validation gate before any DB write.
  const [showDryRun, setShowDryRun] = useState(false);
  const [dryRunPayload, setDryRunPayload] = useState<any | null>(null);
  const [dryRunErrors, setDryRunErrors] = useState<string[]>([]);

  // Real pipeline: scan the client's actual site (PageSpeed + HTML, same
  // as the public /scan flow), derive evidence tiers + confidence from
  // that report programmatically, then feed the same report to Claude for
  // signal/friction/hypothesis synthesis. Previously this button skipped
  // scan-url.ts entirely and fed Claude a guessed domain — the admin's own
  // diagnostic was less grounded than the public one. Not anymore.
  const handleScanAndDiagnose = async () => {
    if (!selectedClient) return;
    if (!scanUrl.trim()) {
      setScanError("Enter the client's website URL first — this scan hits their real site.");
      return;
    }
    setScanLoading(true);
    setDiagnoseLoading(true);
    setScanError("");
    setScanResult(null);
    setDiagnoseResult(null);
    setDiagEvidence([]);
    setDiagConfidenceLevel(null);
    setDiagConfidenceReason("");
    try {
      const scanRes = await fetch('/api/scan-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scanUrl.trim(), company: selectedClient.company_name }),
      });
      if (!scanRes.ok) {
        const err = await scanRes.json().catch(() => ({ error: `HTTP ${scanRes.status}` }));
        throw new Error(err.error || `Scan failed: HTTP ${scanRes.status}`);
      }
      const report: ScanReport = await scanRes.json();
      setScanResult(report);
      setScanLoading(false);

      const evidence = buildEvidenceFromScan(report);
      setDiagEvidence(evidence);
      const { level, reason } = computeConfidence(report);
      setDiagConfidenceLevel(level);
      setDiagConfidenceReason(reason);

      const diagRes = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: selectedClient.company_name,
          domain: report.domain,
          url: report.url,
          grade: report.grade,
          frictionScore: report.frictionScore,
          metrics: report.metrics,
          signals: report.signals,
          frictionMechanisms: report.frictionMechanisms,
          abandonmentDelta: report.abandonmentDelta,
          context: selectedClient.private_notes || undefined,
        }),
      });
      if (!diagRes.ok) {
        const err = await diagRes.json().catch(() => ({ error: `HTTP ${diagRes.status}` }));
        throw new Error(err.error || `Diagnosis failed: HTTP ${diagRes.status}`);
      }
      const diag = await diagRes.json();
      setDiagnoseResult(diag);

      // Auto-populate the delivery form's narrative fields — still
      // editable before publish, never auto-published as-is.
      setDiagSignal(diag.signal || "");
      setDiagMechanism(diag.friction || "");
      setDiagRootCause(diag.hypothesis || "");
    } catch (e: any) {
      setScanError(e.message || "Scan/diagnosis failed");
    } finally {
      setScanLoading(false);
      setDiagnoseLoading(false);
    }
  };

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
    setScanUrl("");
    setScanLoading(false);
    setScanResult(null);
    setScanError("");
    setDiagnoseResult(null);
    setDiagEvidence([]);
    setDiagConfidenceLevel(null);
    setDiagConfidenceReason("");
    setDiagSignal("");
    setDiagMechanism("");
    setDiagRootCause("");
    setDeliverImpactLow("");
    setDeliverImpactHigh("");
    setDeliverImpactUnit("%");
    setDeliverImpactStep("");
    setDeliverImpactModeledFrom("");
    setDeliverImpactNarrowsWith("");
    setDeliverDecisionLabel("");
    setDeliverDecisionAction("");
    setDeliverDecisionReasoning("");
    setDeliverDecisionTradeoff("");
    setDeliverAvoid([{ action: "", reason: "" }]);
    setDeliverBeforeTitle("");
    setDeliverBeforeIssue("");
    setDeliverBeforeFields([""]);
    setDeliverBeforeWarning("");
    setDeliverBeforeBounce("");
    setDeliverAfterTitle("");
    setDeliverAfterDomain("");
    setDeliverAfterConfirmation("");
    setDeliverAfterDescription("");
    setDeliverAfterGain("");
    setDeliverChecklist([]);
    setDeliverLearningModules([]);
    setShowDryRun(false);
    setDryRunPayload(null);
    setDryRunErrors([]);
    setExistingScaffoldId(null);
    setScaffoldError("");

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
      const resScaffold = await fetch(`${supabaseUrl}/rest/v1/diagnostic_scaffolds?client_id=eq.${client.id}&select=id&order=updated_at.desc&limit=1`, { headers });
      if (resScaffold.ok) {
        const [scaffold] = await resScaffold.json();
        setExistingScaffoldId(scaffold?.id ?? null);
      }
    } catch (e) {
      console.warn("Could not load client details:", e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleGenerateScaffold = async () => {
    if (!selectedClient) return;
    if (!scanUrl.trim()) {
      setScaffoldError("Enter the client's website URL first — this scans their real site.");
      return;
    }
    setScaffoldGenerating(true);
    setScaffoldError("");
    try {
      const res = await fetch('/api/scaffolds/generate', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClient.id, url: scanUrl.trim() }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.id) {
        setExistingScaffoldId(body.id);
        router.push(`/admin/scaffolds?id=${body.id}`);
      } else {
        setScaffoldError(body?.error || `Scaffold generation failed (HTTP ${res.status}).`);
      }
    } catch (e: any) {
      setScaffoldError(e.message || 'Scaffold generation failed');
    } finally {
      setScaffoldGenerating(false);
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

  // Assembles the full DeliverableData payload from every field currently
  // in the form (Part E — evidence/impact/confidence/avoid/beforeAfter/
  // checklist/learningModules, not just Loom+signal+mechanism+rootCause).
  const buildDeliveryPayload = () => {
    const clientKey = (selectedClient.company_name || selectedClient.company || "client")
      .toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const cleanAvoid = deliverAvoid.filter((a) => a.action.trim() && a.reason.trim());
    const cleanChecklist = deliverChecklist.filter((c) => c.task.trim());
    const cleanModules = deliverLearningModules.filter((m) => m.title.trim());
    const cleanBeforeFields = deliverBeforeFields.filter((f) => f.trim());

    return {
      clientKey,
      clientName: selectedClient.company_name || selectedClient.company || "Client",
      date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      consultant: "Signal & Friction",
      loomUrl,
      figmaUrl: figmaUrl || null,
      segment: (selectedClient.segment === "DFY" || selectedClient.segment === "high_ticket") ? "high_ticket" : "microdosing",
      founderFocusScore: 85,
      daysRemaining: 30,
      guaranteeStatus: "Specificity Guarantee Active",
      telemetryStatus: scanResult ? "✓ Public Signal Scan Confirmed (PageSpeed + HTML)" : "✓ Traffic & Baseline Confirmed",
      evidence: diagEvidence.length ? diagEvidence : undefined,
      projectedImpact: deliverImpactStep.trim()
        ? {
            low: Number(deliverImpactLow),
            high: Number(deliverImpactHigh),
            unit: deliverImpactUnit,
            step: deliverImpactStep.trim(),
            modeledFrom: deliverImpactModeledFrom.trim(),
            narrowsWith: deliverImpactNarrowsWith.trim(),
          }
        : null,
      confidenceLevel: diagConfidenceLevel ?? undefined,
      confidenceReason: diagConfidenceReason || undefined,
      avoid: cleanAvoid,
      beforeAfter: deliverBeforeTitle.trim()
        ? {
            beforeTitle: deliverBeforeTitle.trim(),
            beforeIssue: deliverBeforeIssue.trim(),
            beforeFields: cleanBeforeFields,
            beforeWarning: deliverBeforeWarning.trim() || undefined,
            beforeBounce: deliverBeforeBounce.trim(),
            afterTitle: deliverAfterTitle.trim(),
            afterDomain: deliverAfterDomain.trim(),
            afterConfirmation: deliverAfterConfirmation.trim() || undefined,
            afterDescription: deliverAfterDescription.trim() || undefined,
            afterGain: deliverAfterGain.trim(),
          }
        : undefined,
      checklist: cleanChecklist.length
        ? cleanChecklist.map((c, i) => ({ id: `c-${i + 1}`, task: c.task.trim(), tip: c.tip.trim(), done: false }))
        : undefined,
      learningModules: cleanModules.length
        ? cleanModules.map((m, i) => ({ id: `m-${i + 1}`, title: m.title.trim(), description: m.description.trim(), content: m.content.trim(), completed: false }))
        : undefined,
      diagnosis: {
        signal: diagSignal || "See Loom video for complete funnel signal breakdown.",
        friction: {
          mechanism: diagMechanism || "Cognitive Load",
          rootCause: diagRootCause || "See Loom video for complete root cause analysis and recommended intervention stack.",
        },
        finalDecision: {
          type: "A",
          label: deliverDecisionLabel.trim(),
          action: deliverDecisionAction.trim(),
          reasoning: deliverDecisionReasoning.trim(),
          tradeoff: deliverDecisionTradeoff.trim(),
        },
        decisions: [],
      },
    };
  };

  // Part C/D — hard validation gate. projectedImpact, finalDecision, and
  // avoid[] are never model-generated: if any of them is incomplete, or
  // any measured claim has no traceable source, or the Loom URL is
  // missing/placeholder, publishing is refused outright.
  const validateDeliveryPayload = (payload: ReturnType<typeof buildDeliveryPayload>): string[] => {
    const errors: string[] = [];
    if (!loomUrl || !loomUrl.includes("loom.com/") || loomUrl.toLowerCase().includes("placeholder")) {
      errors.push('Loom URL is missing, invalid, or contains "placeholder".');
    }
    const pi = payload.projectedImpact;
    if (!pi || !pi.step || !pi.modeledFrom || !pi.narrowsWith || Number.isNaN(pi.low) || Number.isNaN(pi.high)) {
      errors.push("Projected Impact is required and must be fully filled in — this is never model-generated.");
    }
    const fd = payload.diagnosis.finalDecision;
    if (!fd.label || !fd.action || !fd.reasoning || !fd.tradeoff) {
      errors.push("Final Decision is required and must be fully filled in — this is never model-generated.");
    }
    if (!payload.avoid || payload.avoid.length === 0) {
      errors.push("At least one complete Avoid item is required — this is never model-generated.");
    }
    const unsourced = (payload.evidence || []).filter((e) => e.tier === "measured" && !e.source?.trim());
    if (unsourced.length > 0) {
      errors.push(`${unsourced.length} measured evidence item(s) have no traceable source.`);
    }
    return errors;
  };

  // Part D — builds and validates the payload, then opens the dry-run
  // review. Nothing is written to the database from this function.
  const handleReviewDelivery = () => {
    if (!selectedClient) return;
    const payload = buildDeliveryPayload();
    const errors = validateDeliveryPayload(payload);
    setDryRunPayload(payload);
    setDryRunErrors(errors);
    setShowDryRun(true);
  };

  // The only function in this file that writes a deliverable — reachable
  // exclusively from the dry-run panel, and only when dryRunErrors is empty.
  const handlePublishDelivery = async () => {
    if (!selectedClient || !selectedClient.projectId || !dryRunPayload || dryRunErrors.length > 0) return;
    setActionLoading("delivered");
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tsaarsuuclvkjsgjcmoj.supabase.co";
      const headers = getAuthHeaders();
      const clientKey = dryRunPayload.clientKey;

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
      await fetch(`${supabaseUrl}/rest/v1/deliverables`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates",
        },
        body: JSON.stringify({ client_key: clientKey, data: dryRunPayload, updated_at: new Date().toISOString() }),
      });

      // 5. Fire delivery notification email. Was silently missing the admin
      // auth header — requireAdmin() rejected every call with 401 and the
      // trailing .catch(() => {}) swallowed even that, so no email ever
      // sent and nothing showed it. Now awaited, authenticated, and its
      // result is shown regardless of what happens to the dry-run panel
      // below (which closes on success either way).
      try {
        const notifyRes = await fetch(`/api/notify-delivery/${clientKey}`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: selectedClient.id }),
        });
        const notifyBody = await notifyRes.json().catch(() => null);
        if (notifyRes.ok && notifyBody?.sent) {
          setDeliveryEmailStatus({ ok: true, message: `Delivery email sent to ${notifyBody.to}.` });
        } else if (notifyRes.ok && notifyBody?.skipped) {
          setDeliveryEmailStatus({ ok: true, message: `Delivery email already sent previously — not re-sent (idempotent).` });
        } else {
          setDeliveryEmailStatus({
            ok: false,
            message: `Deliverable published, but the notification email failed: ${notifyBody?.error || `HTTP ${notifyRes.status}`}. Send it manually or retry from here.`,
          });
        }
      } catch (err) {
        setDeliveryEmailStatus({
          ok: false,
          message: `Deliverable published, but the notification email request failed: ${err instanceof Error ? err.message : "network error"}. Send it manually or retry from here.`,
        });
      }

      setSelectedClient((prev: any) => prev ? { ...prev, status: "delivered" } : null);
      setShowDiagnosticForm(false);
      setShowDryRun(false);
      setDryRunPayload(null);
      setDryRunErrors([]);
      setLoomUrl("");
      setFigmaUrl("");
      setDiagSignal("");
      setDiagMechanism("");
      setDiagRootCause("");
      setScanUrl("");
      setScanResult(null);
      setDiagEvidence([]);
      setDiagConfidenceLevel(null);
      setDiagConfidenceReason("");
      setDeliverImpactLow("");
      setDeliverImpactHigh("");
      setDeliverImpactStep("");
      setDeliverImpactModeledFrom("");
      setDeliverImpactNarrowsWith("");
      setDeliverDecisionLabel("");
      setDeliverDecisionAction("");
      setDeliverDecisionReasoning("");
      setDeliverDecisionTradeoff("");
      setDeliverAvoid([{ action: "", reason: "" }]);
      setDeliverBeforeTitle("");
      setDeliverBeforeIssue("");
      setDeliverBeforeFields([""]);
      setDeliverBeforeWarning("");
      setDeliverBeforeBounce("");
      setDeliverAfterTitle("");
      setDeliverAfterDomain("");
      setDeliverAfterConfirmation("");
      setDeliverAfterDescription("");
      setDeliverAfterGain("");
      setDeliverChecklist([]);
      setDeliverLearningModules([]);

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
      setShowDryRun(false);
    } finally {
      setActionLoading(null);
    }
  };

  // Standalone retry for the delivery notification email — reachable after
  // the publish flow has already closed (handlePublishDelivery clears
  // dryRunPayload on success), so this re-derives clientKey the same way
  // rather than depending on that now-gone state.
  const handleResendDeliveryEmail = async () => {
    if (!selectedClient) return;
    const clientKey = (selectedClient.company_name || selectedClient.company || "client")
      .toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    setResendingDeliveryEmail(true);
    try {
      const res = await fetch(`/api/notify-delivery/${clientKey}`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedClient.id }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.sent) {
        setDeliveryEmailStatus({ ok: true, message: `Delivery email sent to ${body.to}.` });
      } else if (res.ok && body?.skipped) {
        setDeliveryEmailStatus({ ok: true, message: `Delivery email already sent previously — not re-sent (idempotent).` });
      } else {
        setDeliveryEmailStatus({ ok: false, message: `Retry failed: ${body?.error || `HTTP ${res.status}`}. Send it manually or retry again.` });
      }
    } catch (err) {
      setDeliveryEmailStatus({ ok: false, message: `Retry request failed: ${err instanceof Error ? err.message : "network error"}` });
    } finally {
      setResendingDeliveryEmail(false);
    }
  };

  const handleSaveClientDetails = async () => {
    if (!selectedClient) return;
    setLoading(true);
    setSaveError(null);
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
      // Never fake a successful save — surface the real failure and leave
      // the modal open so nothing looks persisted when it wasn't.
      console.error("Failed to save client:", err);
      setSaveError(err instanceof Error ? err.message : "Failed to save — the change was not persisted.");
      setLoading(false);
    }
  };

  async function fetchAllData() {
    setFetchError(null);
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

      // 5. ARR: sum of all payments (unlimited select — must stay accurate,
      // not capped to whatever the recent-payments list below shows)
      const resPayments = await fetch(
        `${supabaseUrl}/rest/v1/payments?select=amount_total`,
        { headers }
      );
      if (resPayments.ok) {
        const paymentsData: Array<{ amount_total: number }> = await resPayments.json();
        setArrTotal(paymentsData.reduce((sum, p) => sum + (p.amount_total || 0), 0));
      }

      // 5b. Recent payments, WHO paid — the dashboard could previously only
      // show a global revenue total, never which client it came from.
      // payments.lead_id has no FK constraint (see the migration that
      // documents this table), so PostgREST can't auto-embed a `clients`
      // relationship — resolve names with a second lookup instead.
      const resRecentPayments = await fetch(
        `${supabaseUrl}/rest/v1/payments?select=id,email,amount_total,currency,product_name,created_at,lead_id&order=created_at.desc&limit=25`,
        { headers }
      );
      if (resRecentPayments.ok) {
        const recentData: Array<{ id: string; email: string | null; amount_total: number; currency: string; product_name: string | null; created_at: string; lead_id: string | null }> =
          await resRecentPayments.json();
        const leadIds = [...new Set(recentData.map((p) => p.lead_id).filter((id): id is string => !!id))];
        let clientNameMap: Record<string, string> = {};
        if (leadIds.length > 0) {
          const resNames = await fetch(
            `${supabaseUrl}/rest/v1/clients?select=id,company_name&id=in.(${leadIds.join(",")})`,
            { headers }
          );
          if (resNames.ok) {
            const rows: Array<{ id: string; company_name: string }> = await resNames.json();
            clientNameMap = Object.fromEntries(rows.map((r) => [r.id, r.company_name]));
          }
        }
        setRecentPayments(
          recentData.map((p) => ({ ...p, clientName: p.lead_id ? clientNameMap[p.lead_id] || null : null }))
        );
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
        const resSpark = await fetch('/api/stripe/sparklines', { headers: getAuthHeaders() });
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
      // Never fake a pipeline — a fetch failure is a real error, not an
      // occasion to show invented clients and invented deal stages.
      console.error("Failed to load dashboard data:", err);
      setFetchError(err instanceof Error ? err.message : "Failed to load dashboard data.");
      setMetrics(null);
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAllData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0908] flex items-center justify-center font-mono text-xs text-[#D4A853] animate-pulse">
        {"Loading pipeline analytics..."}
      </div>
    );
  }

  if (fetchError || !metrics) {
    return (
      <div className="min-h-screen bg-[#0A0908] flex items-center justify-center p-8">
        <div className="max-w-md w-full border-2 border-[#C85C5C]/50 bg-[#C85C5C]/10 rounded-lg p-6 space-y-3 text-center">
          <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#C85C5C]">
            {"⚠ Failed to load pipeline data"}
          </div>
          <p className="font-mono text-xs text-[#B0A89E] leading-relaxed">
            {fetchError || "Unknown error."}
          </p>
          <button
            onClick={() => { setLoading(true); fetchAllData(); }}
            className="font-mono text-xs uppercase tracking-wider text-[#D4A853] border border-[#D4A853]/40 hover:border-[#D4A853] hover:bg-[#D4A853]/10 transition-all px-4 py-2 rounded-full"
          >
            {"Retry"}
          </button>
        </div>
      </div>
    );
  }

  const m = metrics;

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
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#D4A853]/70 block mb-2">{"Internal OS"}</span>
            <h1 className="text-4xl font-serif text-white tracking-tight">{"Sales Pipeline · Signal & Friction"}</h1>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <span className="font-mono text-xs uppercase tracking-wider text-[#D4A853] border border-[#D4A853]/25 px-3 py-1 rounded bg-[#D4A853]/5">
              {"Authenticated Admin Area"}
            </span>
          </div>
        </header>

        {/* Navigation tabs */}
        <div className="flex border-b border-[#D4A853]/8 gap-8">
          <button
            onClick={() => setActiveView('pipeline')}
            className={`pb-4 font-mono text-xs uppercase tracking-widest border-b-2 transition-all duration-300 cursor-pointer ${
              activeView === 'pipeline' ? "border-[#D4A853] text-[#D4A853]" : "border-transparent text-[#7A6F65] hover:text-[#B0A89E]"
            }`}
          >
            {"Pipeline & Conversions"}
          </button>
          <button
            onClick={() => setActiveView('learning')}
            className={`pb-4 font-mono text-xs uppercase tracking-widest border-b-2 transition-all duration-300 cursor-pointer relative ${
              activeView === 'learning' ? "border-[#D4A853] text-[#D4A853]" : "border-transparent text-[#7A6F65] hover:text-[#B0A89E]"
            }`}
          >
            {"Continuous Learning OS"}
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
                        <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#D4A853]/70 block mb-1">{"ARR Trajectory"}</span>
                        <div className="flex items-baseline gap-3">
                          <span className="font-serif text-3xl font-bold text-white">${arrUsd.toLocaleString()}</span>
                          <span className="font-mono text-xs text-[#7A6F65]">{"/ target $1,000,000"}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-2xl font-bold text-[#D4A853]">{pct.toFixed(2)}%</span>
                        <span className="font-mono text-xs text-[#7A6F65] block mt-0.5">${remaining.toLocaleString()} {"remaining"}</span>
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
                        <span className="font-mono text-[9px] text-[#D4A853]/70 ml-1 self-end">{"today"}</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Recent Payments — WHO paid, not just the aggregate total */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs text-[#D4A853]/70 tracking-[0.3em] uppercase">{"Recent Payments"}</span>
                  <span className="font-mono text-xs text-[#7A6F65] border border-[#D4A853]/10 px-2 py-0.5 rounded-full">{`Last ${recentPayments.length}`}</span>
                </div>
                <div className="border border-[#D4A853]/15 bg-[#110F0D] rounded-2xl overflow-hidden">
                  {recentPayments.length === 0 ? (
                    <div className="p-6 text-center font-mono text-xs text-[#7A6F65]">{"No payments recorded yet."}</div>
                  ) : (
                    <div className="divide-y divide-[#D4A853]/8">
                      {recentPayments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-[#D4A853]/[0.03] transition-colors">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm text-[#F5F0EB] truncate">
                                {p.clientName || p.email || "Unmatched payment"}
                              </span>
                              {!p.lead_id && (
                                <span className="font-mono text-[9px] uppercase text-[#C85C5C] border border-[#C85C5C]/30 px-1.5 py-0.5 rounded shrink-0" title="No client record matched this payment's email">
                                  {"Unlinked"}
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-[#7A6F65]">{p.product_name || "—"} · {p.email || "no email"}</span>
                          </div>
                          <div className="text-right shrink-0 pl-4">
                            <span className="font-mono text-sm font-bold text-[#D4A853]">
                              ${Math.round(p.amount_total / 100).toLocaleString()} {p.currency?.toUpperCase()}
                            </span>
                            <span className="font-mono text-[10px] text-[#7A6F65] block">
                              {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* 30-Day Sprint Tracker */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs text-[#D4A853]/70 tracking-[0.3em] uppercase">{"30-Day Sprint"}</span>
                  <span className="font-mono text-xs text-[#7A6F65] border border-[#D4A853]/10 px-2 py-0.5 rounded-full">{"Phase 2 · $1M Path"}</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {(() => {
                    const clients = m.dealsClosed || 0;
                    const htMrr = (m.highTicketCount || 0) * 2000;
                    const dwyMrr = (m.microdosingCount || 0) * 350;
                    const mrr = htMrr + dwyMrr || clients * 350;
                    const pctToMillion = +((mrr * 12) / 10000).toFixed(1);
                    return [
                      { label: "Clients", display: String(clients), accent: "text-[#5C9A6B]" },
                      { label: "MRR", display: `$${mrr.toLocaleString()}`, accent: "text-[#D4A853]" },
                      { label: "Liquidity", display: `$${mrr.toLocaleString()}`, accent: "text-[#D4A853]" },
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
                  { label: "Total Leads", value: m.totalLeads, detail: "All profiles", color: "text-[#F5F0EB]" },
                  { label: "High-Ticket", value: m.highTicketCount || 0, detail: "Via Concierge", color: "text-[#D4A853]" },
                  { label: "Microdosing", value: m.microdosingCount || 0, detail: "Via Autonomy", color: "text-[#B0A89E]" },
                  { label: "Outreach Sent", value: m.outreachSent, detail: "Active Beta DMs", color: "text-[#D4A853]" },
                  { label: "Diagnostics", value: m.diagnosticsDelivered, detail: "Loom briefs delivered", color: "text-[#D4A853]" },
                  { label: "Closed Deals", value: m.dealsClosed, detail: "Testimonial & payment", color: "text-[#5C9A6B]" },
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
                  <h3 className="font-serif text-lg text-white border-b border-[#D4A853]/10 pb-3">{"Acquisition Funnel"}</h3>
                  <div className="space-y-4">
                    {[
                      { step: "Identified Leads", count: m.totalLeads, pct: 100 },
                      { step: "Outreach Cycles", count: m.outreachSent + m.diagnosticsDelivered, pct: m.totalLeads > 0 ? ((m.outreachSent + m.diagnosticsDelivered) / m.totalLeads) * 100 : 0 },
                      { step: "Diagnostics Delivered", count: m.diagnosticsDelivered, pct: m.totalLeads > 0 ? (m.diagnosticsDelivered / m.totalLeads) * 100 : 0 },
                      { step: "Successful Beta Close", count: m.dealsClosed, pct: m.totalLeads > 0 ? (m.dealsClosed / m.totalLeads) * 100 : 0 },
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
                  <h3 className="font-serif text-lg text-white border-b border-[#D4A853]/10 pb-3">{"Friction Mechanisms"}</h3>
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
                      <span className="text-[#D4A853]">⚡</span> {"Performance Guarantees"}
                    </h3>
                    <span className="font-mono text-xs uppercase bg-[#D4A853]/10 text-[#D4A853] px-3 py-1 rounded-full border border-[#D4A853]/20">
                      {m.activeGuaranteesCount || 0} {"Active"}
                    </span>
                  </div>

                  <p className="text-sm text-[#B0A89E] font-mono leading-relaxed">
                    {"Concierge clients under the S&F Specificity Guarantee — full refund if the finding isn't specific to their product."}
                  </p>

                  <div className="space-y-4">
                    {m.pipeline.filter(p => p.guarantee_active).length === 0 ? (
                      <div className="text-sm text-[#B0A89E] font-mono text-center py-6">{"No active guaranteed campaigns."}</div>
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
                              <span className="text-[#7A6F65]">{"30-Day Window"}</span>
                              <span className="text-[#D4A853]">{"Target: +"}{item.guarantee?.target_improvement_pct || 20}%</span>
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
                      <span className="text-[#D4A853]">🏆</span> {"Certified Partners™"}
                    </h3>
                    <span className="font-mono text-xs uppercase bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full border border-amber-500/20">
                      {m.certifiedCount || 0} {"Licensed"}
                    </span>
                  </div>

                  <p className="text-sm text-[#B0A89E] font-mono leading-relaxed">
                    {"Methodology licensed to external agencies ($1,500/yr). Annual audit with minimum 80% satisfaction."}
                  </p>

                  <div className="space-y-3">
                    {m.pipeline.filter(p => p.is_certified).length === 0 ? (
                      <div className="text-sm text-[#B0A89E] font-mono text-center py-6">{"No certified partners registered."}</div>
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
                              {"Next Audit: Dec 2026"}
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
                  <h3 className="font-serif text-lg text-white">{"Conversion Queue"}</h3>
                  <span className="font-mono text-xs uppercase text-[#7A6F65] border border-[#D4A853]/15 px-3 py-1 rounded-full">
                    {leads.length} {"incoming leads"}
                  </span>
                </div>
                {leads.length === 0 ? (
                  <p className="font-mono text-xs text-[#7A6F65] text-center py-8">{"No leads in queue. Connect the Tally form to get started."}</p>
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
                              <span className="font-mono text-[9px] text-[#7A6F65] uppercase block">{"Est. Value"}</span>
                              <span className="font-mono text-xs font-bold text-[#D4A853]">${estimatedValue.toLocaleString()}</span>
                            </div>
                            <div className="bg-black/40 rounded p-1.5">
                              <span className="font-mono text-[9px] text-[#7A6F65] uppercase block">{"Latency"}</span>
                              <span className={`font-mono text-xs font-bold ${urgency === 'hot' ? 'text-[#C85C5C]' : urgency === 'warm' ? 'text-amber-400' : 'text-[#B0A89E]'}`}>
                                {hoursAgo}h
                              </span>
                            </div>
                            <div className="bg-black/40 rounded p-1.5">
                              <span className="font-mono text-[9px] text-[#7A6F65] uppercase block">{"Source"}</span>
                              <span className="font-mono text-xs text-[#B0A89E]">{lead.source}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-[#D4A853]/8">
                            <span className={`font-mono text-[9px] uppercase ${urgency === 'hot' ? 'text-[#C85C5C]' : urgency === 'warm' ? 'text-amber-400' : 'text-[#7A6F65]'}`}>
                              {urgency === 'hot' ? '🔴 Respond now' : urgency === 'warm' ? '🟡 Respond today' : '⚪ In queue'}
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
                  <h3 className="font-serif text-xl text-white">{"Active Board"}</h3>
                  <span className="text-xs font-mono text-[#7A6F65] uppercase tracking-wider">
                    {"Click a card to edit"}
                  </span>
                </div>

                {/* Next Actions summary bar */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-5 border border-[#D4A853]/15 bg-black/40 rounded-xl">
                  {[
                    { status: "prospecting", title: "Pending Outreach", count: m.pipeline.filter(p => p.status === "prospecting").length, color: "text-[#D4A853]", action: "Send outreach pitch" },
                    { status: "outreach_sent", title: "Follow-up Needed", count: m.pipeline.filter(p => p.status === "outreach_sent").length, color: "text-amber-400", action: "Follow up or advance" },
                    { status: "diagnostic_in_progress", title: "Pending Diagnostic", count: m.pipeline.filter(p => p.status === "diagnostic_in_progress").length, color: "text-purple-400", action: "Upload Loom and Figma" },
                    { status: "delivered", title: "Pending Close", count: m.pipeline.filter(p => p.status === "delivered" || p.status === "awaiting_testimonial").length, color: "text-[#5C9A6B]", action: "Request testimonial" },
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
                          {({ prospecting: "Prospecting", outreach_sent: "Outreach Sent", diagnostic_in_progress: "Diagnosis In Progress", delivered: "Delivered" } as Record<string, string>)[col] || col.replace(/_/g, " ")} ({items.length})
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
                                const slaUrl = `https://signal-and-friction.com/sla/${clientKey}?cid=${encodeURIComponent(item.id)}`;
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
                                  ? `⚠ ${"SLA exceeded"} ${Math.abs(Math.round(hoursLeft))}h`
                                  : `⏱ ${Math.round(hoursLeft)}h ${"remaining"}`;
                                return (
                                  <span className={`mt-1.5 inline-block font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${color}`}>
                                    {label}
                                  </span>
                                );
                              })()}
                              {item.status === "delivered" && (
                                <span className="mt-1.5 inline-block font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border text-[#5C9A6B] border-[#5C9A6B]/20 bg-[#5C9A6B]/5">
                                  {"✓ SLA met"}
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
                                  {({ paid: "Paid", uninvoiced: "Uninvoiced", invoiced_unpaid: "Invoiced" } as Record<string, string>)[item.payment_status] || item.payment_status}
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
                    <h4 className="font-mono text-xs uppercase tracking-widest text-[#C85C5C] font-bold">{"CRITICAL SYSTEM ALERT"}</h4>
                    <p className="text-xs text-white leading-relaxed">
                      {`Found ${criticalAlerts.length} unresolved high or critical severity incident(s). System execution safety limits are degraded. Run the MCP command`} <code className="font-mono text-amber-500 bg-black/40 px-2 py-0.5 rounded border border-[#D4A853]/8 select-all">/beta:iterate-from-incidents</code> {"immediately to inject the fixes."}
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
                  { label: "Avg. Resolution", value: resolvedIncidents.length > 0 ? "1.0 h" : "N/A", detail: "Mitigation speed" },
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
                <div className="lg:col-span-7 border border-[#D4A853]/15 p-8 bg-[#0A0908]/60 rounded flex flex-col">
                  <h3 className="font-serif text-lg text-white border-b border-[#D4A853]/10 pb-3 flex-shrink-0">{"Incident Timeline"}</h3>
                  <div className="flex-1 min-h-0 mt-6 space-y-6 overflow-y-auto pr-2 scrollbar-thin">
                    {incidents.length === 0 ? (
                      <div className="text-sm text-[#B0A89E] font-mono py-12 text-center">{"No AI or process incidents recorded."}</div>
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
                              {"Phase:"} <strong className="text-[#D4A853]">{inc.phase}</strong>
                            </span>
                            <p className="text-sm text-[#B0A89E] leading-relaxed font-mono">
                              {inc.description}
                            </p>
                          </div>

                          {!inc.resolved_at && inc.root_cause && (
                            <div className="border-t border-[#D4A853]/8 pt-3">
                              <span className="font-mono text-xs text-[#D4A853] uppercase block mb-1">{"Root Cause Analysis"}</span>
                              <p className="text-sm text-[#B0A89E] leading-relaxed font-mono">
                                {inc.root_cause}
                              </p>
                            </div>
                          )}

                          {inc.resolved_at && (
                            <div className="border-t border-[#5C9A6B]/10 bg-[#5C9A6B]/[0.03] p-3 rounded-xl space-y-2">
                              <div className="flex justify-between items-center text-xs font-mono">
                                <span className="text-[#5C9A6B] uppercase">{"✓ Resolved & Mitigated"}</span>
                                <span className="text-[#B0A89E]">{inc.iteration_version}</span>
                              </div>
                              <p className="text-sm text-[#B0A89E] leading-relaxed font-mono">
                                <strong className="text-[#B0A89E]">{"Resolution: "}</strong>{inc.resolution}
                              </p>
                              {inc.lesson_learned && (
                                <p className="text-sm text-[#B0A89E] leading-relaxed font-mono italic">
                                  <strong className="text-[#B0A89E]">{"Lesson: "}</strong>&quot;{inc.lesson_learned}&quot;
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
                    <h3 className="font-serif text-lg text-white border-b border-[#D4A853]/10 pb-3">{"Weekly AI Progress Radar"}</h3>
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
                    <h3 className="font-serif text-lg text-white border-b border-[#D4A853]/10 pb-3">{"Detected Error Patterns"}</h3>
                    <div className="space-y-4">
                      {sortedPatterns.length === 0 ? (
                        <div className="text-xs text-[#B0A89E] font-mono text-center py-6">{"No patterns recorded."}</div>
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
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#D4A853]/70 block mb-1">{"Incoming Lead"}</span>
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
                    { label: 'Segment', value: selectedLead.segment, accent: selectedLead.segment === 'DFY' ? 'text-[#D4A853]' : 'text-[#B0A89E]' },
                    { label: 'Est. Value', value: selectedLead.segment === 'DFY' ? '$2,000' : '$350', accent: 'text-[#5C9A6B]' },
                    { label: 'Source', value: selectedLead.source, accent: 'text-[#B0A89E]' },
                    { label: 'Received', value: `${Math.floor((Date.now() - new Date(selectedLead.created_at).getTime()) / 3600000)}h ${"ago"}`, accent: 'text-[#B0A89E]' },
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
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#D4A853]/70 block">{"Form Answers"}</span>
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
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#D4A853] block">{"Next Action — Autopilot"}</span>
                  <p className="font-mono text-xs text-[#B0A89E] leading-relaxed">
                    {selectedLead.segment === 'DFY'
                      ? `High-Ticket DFY lead via ${selectedLead.source}. Priority: send custom signal diagnosis within 2 hours. Attach friction audit template. Subject: "I spotted a conversion gap in your funnel."`
                      : `DWY lead via ${selectedLead.source}. Priority: send autonomy path intro + Tally link within 24h. Subject: "Your signal setup — 3 things to check first."`}
                  </p>
                  <button
                    onClick={() => {
                      const action = selectedLead.segment === 'DFY'
                        ? `Send signal diagnosis to ${selectedLead.email} — DFY high-ticket outreach`
                        : `Send autonomy path intro to ${selectedLead.email} — DWY outreach`;
                      navigator.clipboard.writeText(action).catch(() => {});
                    }}
                    className="w-full font-mono text-xs uppercase border border-[#D4A853]/30 text-[#D4A853] hover:bg-[#D4A853]/8 py-2 rounded-lg transition-all cursor-pointer"
                  >
                    {"Copy Action Draft"}
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

                {/* Auto-diagnosis panel — rendered for DFY leads with website */}
                {selectedLead.segment === 'DFY' && selectedLead.website && (() => {
                  const ad = selectedLead.auto_diagnosis;
                  if (!ad) {
                    return (
                      <div className="border border-[#D4A853]/10 bg-[#110F0D]/60 p-4 rounded-xl space-y-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[#D4A853]/60 block">{"AI Diagnostic Engine"}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#D4A853]/40 animate-pulse" />
                          <p className="font-mono text-xs text-[#7A6F65]">{"Diagnosis in progress — available in ~30s"}</p>
                        </div>
                      </div>
                    );
                  }
                  if (ad.error && !ad.diagnosis) {
                    return (
                      <div className="border border-[#C85C5C]/20 bg-[#C85C5C]/5 p-4 rounded-xl">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[#C85C5C]/70 block mb-1">{"AI Diagnostic Engine — Error"}</span>
                        <p className="font-mono text-xs text-[#C85C5C]/80">{ad.error}</p>
                      </div>
                    );
                  }
                  const diag = ad.diagnosis;
                  if (!diag) return null;
                  const conf = diag.confidence;
                  const confColor = conf >= 65 ? '#5C9A6B' : conf >= 40 ? '#D4A853' : '#C85C5C';
                  return (
                    <div className="border border-[#D4A853]/20 bg-[#110F0D]/80 p-4 rounded-xl space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[#D4A853] block">{"AI Diagnostic Engine — Auto"}</span>
                        {ad.generated_at && (
                          <span className="font-mono text-[9px] text-[#7A6F65]">
                            {new Date(ad.generated_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      {/* Confidence bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between font-mono text-[9px]">
                          <span className="text-[#7A6F65] uppercase tracking-wider">{"Confidence Index"}</span>
                          <span style={{ color: confColor }} className="font-bold">{conf}/100</span>
                        </div>
                        <div className="w-full h-1 bg-[#2A2218] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${conf}%`, backgroundColor: confColor }} />
                        </div>
                      </div>

                      {/* Scan metrics */}
                      {ad.scan && (
                        <div className="grid grid-cols-3 gap-2">
                          {ad.scan.grade && (
                            <div className="bg-black/40 border border-[#D4A853]/8 p-2 rounded-lg text-center">
                              <span className="font-mono text-[9px] text-[#7A6F65] block">Friction</span>
                              <span className="font-mono text-sm font-bold text-[#D4A853]">{ad.scan.grade}</span>
                            </div>
                          )}
                          {ad.scan.metrics?.lcp && (
                            <div className="bg-black/40 border border-[#D4A853]/8 p-2 rounded-lg text-center">
                              <span className="font-mono text-[9px] text-[#7A6F65] block">LCP</span>
                              <span className={`font-mono text-xs font-bold ${ad.scan.metrics.lcp.status === 'good' ? 'text-[#5C9A6B]' : ad.scan.metrics.lcp.status === 'poor' ? 'text-[#C85C5C]' : 'text-[#D4A853]'}`}>
                                {(ad.scan.metrics.lcp.ms / 1000).toFixed(1)}s
                              </span>
                            </div>
                          )}
                          {ad.scan.abandonmentDelta !== undefined && ad.scan.abandonmentDelta > 0 && (
                            <div className="bg-black/40 border border-[#C85C5C]/10 p-2 rounded-lg text-center">
                              <span className="font-mono text-[9px] text-[#7A6F65] block">{"Abandonment"}</span>
                              <span className="font-mono text-xs font-bold text-[#C85C5C]">+{ad.scan.abandonmentDelta}%</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Signal */}
                      <div className="space-y-1">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-[#5C9A6B]">{"Signal"}</span>
                        <p className="font-mono text-xs text-[#F5F0EB] leading-relaxed">{diag.signal}</p>
                      </div>

                      {/* Friction */}
                      <div className="space-y-1">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-[#C85C5C]">{"Friction"}</span>
                        <p className="font-mono text-xs text-[#B0A89E] leading-relaxed">{diag.friction}</p>
                      </div>

                      {/* Hypothesis */}
                      <div className="space-y-1">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-[#D4A853]">{"Hypothesis"}</span>
                        <p className="font-mono text-xs text-[#B0A89E] leading-relaxed italic">{diag.hypothesis}</p>
                      </div>

                      {/* Decision */}
                      {diag.decision && (
                        <div className="border border-[#D4A853]/15 bg-[#D4A853]/[0.03] p-3 rounded-lg space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[9px] font-bold text-[#D4A853] border border-[#D4A853]/40 px-1.5 py-0.5 rounded">
                              {diag.decision.type}
                            </span>
                            <span className="font-mono text-xs text-[#F5F0EB] font-medium">{diag.decision.label}</span>
                          </div>
                          <p className="font-mono text-[10px] text-[#B0A89E] leading-relaxed">{diag.decision.action}</p>
                        </div>
                      )}

                      {/* Copy signal for outreach */}
                      <button
                        onClick={() => navigator.clipboard.writeText(
                          `Signal: ${diag.signal}\n\nFriction: ${diag.friction}\n\nHypothesis: ${diag.hypothesis}\n\nIntervention: ${diag.decision?.action ?? ''}`
                        ).catch(() => {})}
                        className="w-full font-mono text-xs uppercase border border-[#D4A853]/30 text-[#D4A853] hover:bg-[#D4A853]/8 py-2 rounded-lg transition-all cursor-pointer"
                      >
                        {"Copy Diagnosis for Outreach"}
                      </button>
                    </div>
                  );
                })()}
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
                  <span className="font-mono text-xs text-[#D4A853]/70 uppercase tracking-wider">{"Client Control Panel"}</span>
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
                      <label className="text-[#B0A89E] uppercase">{"Contact Name"}</label>
                      <p className="p-3 bg-black/40 border border-[#D4A853]/8 rounded text-white">{selectedClient.contact_name}</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[#B0A89E] uppercase">Email</label>
                      <p className="p-3 bg-black/40 border border-[#D4A853]/8 rounded text-white">{selectedClient.contact_email}</p>
                    </div>
                  </div>

                  {/* Founder psychology notes */}
                  <div className="space-y-1.5 font-mono text-xs">
                    <label className="text-[#B0A89E] uppercase tracking-wider block">{"Founder Psychology / Private Notes"}</label>
                    <textarea
                      value={modalPrivateNotes}
                      onChange={e => setModalPrivateNotes(e.target.value)}
                      placeholder="Log cognitive constraints, runway bottlenecks, and founder psychology alignment..."
                      className="w-full bg-black/40 border border-[#D4A853]/8 focus:border-[#D4A853] focus:outline-none p-3 rounded text-white h-16 font-sans text-xs"
                    />
                  </div>

                  {/* Toggles section */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                    {/* Certified toggle */}
                    <div className="border border-[#D4A853]/8 p-3 rounded space-y-1 bg-black/20">
                      <span className="text-[#B0A89E] uppercase block">{"Certified License"}</span>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-white font-serif">{modalIsCertified ? "S&F Licensed" : "No License"}</span>
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
                      <span className="text-[#B0A89E] uppercase block">{"Assigned Segment"}</span>
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
                        <span className="text-[#B0A89E] uppercase">{"Cognitive Fatigue"}</span>
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
                      {"Pipeline Action Protocol"}
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
                            {actionLoading === "diagnostic_in_progress" ? "Processing..." : "✓ Responded"}
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading !== null}
                            onClick={() => handleSendFollowup()}
                            className="px-3 py-1.5 bg-white/5 border border-white/10 text-white rounded text-xs font-mono hover:bg-white/10 cursor-pointer uppercase disabled:opacity-50"
                          >
                            {actionLoading === "followup" ? "Registering..." : "📋 Send Follow-up"}
                          </button>
                        </>
                      )}

                      {selectedClient.status === "diagnostic_in_progress" && (
                        <button
                          type="button"
                          disabled={actionLoading !== null}
                          onClick={() => { setShowDiagnosticForm(true); setShowDryRun(false); setDryRunPayload(null); setDryRunErrors([]); }}
                          className="px-3 py-1.5 bg-[#D4A853]/10 border border-[#D4A853]/30 text-[#D4A853] rounded-md text-xs font-mono hover:bg-[#D4A853]/25 cursor-pointer uppercase disabled:opacity-50"
                        >
                          {"📬 Deliver Diagnostic"}
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
                    {deliveryEmailStatus && (
                      <div
                        className={`mt-3 p-2 border rounded-md text-xs font-mono flex items-center justify-between gap-3 ${
                          deliveryEmailStatus.ok
                            ? "bg-[#5C9A6B]/10 border-[#5C9A6B]/30 text-[#5C9A6B]"
                            : "bg-[#C85C5C]/10 border-[#C85C5C]/30 text-[#C85C5C]"
                        }`}
                      >
                        <span>{deliveryEmailStatus.message}</span>
                        {!deliveryEmailStatus.ok && (
                          <button
                            type="button"
                            onClick={handleResendDeliveryEmail}
                            disabled={resendingDeliveryEmail}
                            className="px-2 py-1 rounded border border-current uppercase tracking-wide shrink-0 disabled:opacity-50 cursor-pointer"
                          >
                            {resendingDeliveryEmail ? "Sending…" : "Retry"}
                          </button>
                        )}
                      </div>
                    )}

                    {/* ── AI Diagnostic Engine — real scan + Claude synthesis ── */}
                    <div className="border border-[#D4A853]/20 p-4 rounded bg-black/30 space-y-4 mt-3">
                      <div className="flex items-center justify-between border-b border-[#D4A853]/8 pb-2">
                        <span className="font-mono text-xs text-[#D4A853] uppercase tracking-wider">{"AI Diagnostic Engine"}</span>
                        <span className="font-mono text-[9px] text-[#7A6F65] uppercase border border-[#D4A853]/10 px-2 py-0.5 rounded">
                          scan-url.ts → Claude · Vault Secured
                        </span>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[#B0A89E] uppercase text-xs font-mono">{"Client Website URL"}</label>
                        <input
                          type="text"
                          value={scanUrl}
                          onChange={(e) => setScanUrl(e.target.value)}
                          placeholder="https://client-product.com"
                          className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white text-xs font-mono focus:border-[#D4A853] focus:outline-none"
                        />
                        <p className="text-[9px] text-[#7A6F65] font-mono">{"This hits the client's real site — PageSpeed Insights + HTML scan, same pipeline as the public /scan flow."}</p>
                      </div>
                      <button
                        type="button"
                        disabled={diagnoseLoading || scanLoading}
                        onClick={handleScanAndDiagnose}
                        className="w-full py-2.5 bg-[#D4A853]/10 border border-[#D4A853]/30 text-[#D4A853] rounded font-mono text-xs uppercase tracking-wider hover:bg-[#D4A853]/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {scanLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-3 h-3 border border-[#D4A853] border-t-transparent rounded-full animate-spin inline-block" />
                            {"Scanning site (PageSpeed + HTML)..."}
                          </span>
                        ) : diagnoseLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-3 h-3 border border-[#D4A853] border-t-transparent rounded-full animate-spin inline-block" />
                            {"Processing telemetry..."}
                          </span>
                        ) : 'Scan & Diagnose →'}
                      </button>
                      {scanError && <p className="text-[#C85C5C] text-xs font-mono">{scanError}</p>}

                      <div className="border-t border-[#D4A853]/8 pt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-[#7A6F65] uppercase tracking-widest">
                            {"Diagnostic Scaffold — private draft, honest evidence only"}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={scaffoldGenerating}
                          onClick={existingScaffoldId ? () => router.push(`/admin/scaffolds?id=${existingScaffoldId}`) : handleGenerateScaffold}
                          className="w-full py-2.5 bg-white/5 border border-white/10 text-[#B0A89E] rounded font-mono text-xs uppercase tracking-wider hover:bg-white/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {scaffoldGenerating
                            ? (
                              <span className="flex items-center justify-center gap-2">
                                <span className="w-3 h-3 border border-[#B0A89E] border-t-transparent rounded-full animate-spin inline-block" />
                                {"Generating scaffold…"}
                              </span>
                            )
                            : existingScaffoldId ? 'Open Diagnostic Scaffold →' : 'Generate Diagnostic Scaffold →'}
                        </button>
                        {scaffoldError && <p className="text-[#C85C5C] text-xs font-mono">{scaffoldError}</p>}
                      </div>

                      {diagEvidence.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <span className="font-mono text-[9px] text-[#7A6F65] uppercase tracking-widest block">{"Evidence — every item traceable to the scan above"}</span>
                          <div className="space-y-1.5">
                            {diagEvidence.map((ev, i) => {
                              const tierColor = ev.tier === "measured" ? "#5C9A6B" : ev.tier === "modeled" ? "#D4A853" : "#7A6F65";
                              return (
                                <div key={i} className="bg-black/40 border border-white/5 p-2 rounded flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-mono text-[10px] text-[#F5F0EB]">{ev.label}: <span style={{ color: tierColor }}>{ev.value}</span></p>
                                    <p className="font-mono text-[9px] text-[#7A6F65] mt-0.5">{ev.source}</p>
                                  </div>
                                  <span
                                    className="font-mono text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0"
                                    style={{ color: tierColor, borderColor: tierColor + "60", background: tierColor + "15" }}
                                  >
                                    {ev.tier}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {diagConfidenceLevel !== null && (
                        <div className="space-y-1">
                          <div className="flex justify-between font-mono text-[10px]">
                            <span className="text-[#7A6F65] uppercase">{"Confidence (computed from evidence density)"}</span>
                            <span className={`font-bold ${diagConfidenceLevel >= 65 ? 'text-[#5C9A6B]' : diagConfidenceLevel >= 40 ? 'text-[#D4A853]' : 'text-[#C85C5C]'}`}>
                              {diagConfidenceLevel}/100
                            </span>
                          </div>
                          <div className="h-1 bg-black/60 rounded-full overflow-hidden border border-[#D4A853]/8">
                            <div
                              className={`h-full rounded-full transition-all ${diagConfidenceLevel >= 65 ? 'bg-[#5C9A6B]' : diagConfidenceLevel >= 40 ? 'bg-[#D4A853]' : 'bg-[#C85C5C]'}`}
                              style={{ width: `${diagConfidenceLevel}%` }}
                            />
                          </div>
                          <p className="font-mono text-[9px] text-[#7A6F65] leading-relaxed">{diagConfidenceReason}</p>
                        </div>
                      )}

                      {diagnoseResult && (
                        <div className="space-y-3 pt-1">
                          <div className="bg-black/40 border border-[#D4A853]/8 p-3 rounded space-y-1">
                            <span className="font-mono text-[9px] text-[#D4A853] uppercase tracking-widest block">{"Signal (candidateFriction) — auto-filled below, editable"}</span>
                            <p className="font-mono text-xs text-[#F5F0EB] leading-relaxed">{diagnoseResult.signal}</p>
                          </div>
                          <div className="bg-black/40 border border-[#C85C5C]/15 p-3 rounded space-y-1">
                            <span className="font-mono text-[9px] text-[#C85C5C] uppercase tracking-widest block">{"Friction Mechanism (behavioralMechanism) — auto-filled below, editable"}</span>
                            <p className="font-mono text-xs text-[#F5F0EB] leading-relaxed">{diagnoseResult.friction}</p>
                          </div>
                          <div className="bg-black/40 border border-white/5 p-3 rounded space-y-1">
                            <span className="font-mono text-[9px] text-[#B0A89E] uppercase tracking-widest block">{"Causal Hypothesis — auto-filled as Root Cause below, editable"}</span>
                            <p className="font-mono text-xs text-[#B0A89E] leading-relaxed italic">{diagnoseResult.hypothesis}</p>
                          </div>
                          <div className="bg-[#D4A853]/[0.04] border border-[#D4A853]/20 p-3 rounded space-y-2">
                            <span className="font-mono text-[9px] text-[#7A6F65] uppercase tracking-widest block">{"Claude's suggested decision — reference only. finalDecision below is never auto-filled from this."}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[9px] font-bold bg-[#D4A853] text-[#0A0908] px-1.5 py-0.5 rounded">
                                {diagnoseResult.decision.type}
                              </span>
                              <span className="font-mono text-xs font-bold text-[#F5F0EB]">{diagnoseResult.decision.label}</span>
                            </div>
                            <p className="font-mono text-xs text-[#F5F0EB] leading-relaxed">
                              <span className="text-[#D4A853]">→ </span>{diagnoseResult.decision.action}
                            </p>
                            <p className="font-mono text-xs text-[#7A6F65] leading-relaxed">{diagnoseResult.decision.reasoning}</p>
                            <p className="font-mono text-[10px] text-[#7A6F65]/70 border-t border-[#D4A853]/8 pt-2 mt-1">
                              {"Tradeoff: "}{diagnoseResult.decision.tradeoff}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Diagnostic Deliverable Form */}
                    {showDiagnosticForm && !showDryRun && (
                      <div className="border border-[#D4A853]/20 p-4 rounded bg-black/40 space-y-4 mt-3">
                        <span className="font-mono text-xs text-[#D4A853] uppercase block">{"Diagnostic Deliverable Form"}</span>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                          <div className="space-y-1">
                            <label className="text-[#B0A89E] uppercase">{"Loom URL (Required)"}</label>
                            <input
                              type="text"
                              value={loomUrl}
                              onChange={(e) => setLoomUrl(e.target.value)}
                              placeholder="https://loom.com/share/..."
                              className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[#B0A89E] uppercase">{"Figma URL (Optional)"}</label>
                            <input
                              type="text"
                              value={figmaUrl}
                              onChange={(e) => setFigmaUrl(e.target.value)}
                              placeholder="https://figma.com/file/..."
                              className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[#B0A89E] uppercase">{"Funnel Signal"}</label>
                            <textarea
                              value={diagSignal}
                              onChange={(e) => setDiagSignal(e.target.value)}
                              rows={2}
                              placeholder="Auto-filled from Scan & Diagnose above — editable."
                              className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none resize-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[#B0A89E] uppercase">{"Friction Mechanism"}</label>
                            <input
                              type="text"
                              value={diagMechanism}
                              onChange={(e) => setDiagMechanism(e.target.value)}
                              placeholder="Auto-filled from Scan & Diagnose above — editable."
                              className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[#B0A89E] uppercase">{"Root Cause"}</label>
                            <textarea
                              value={diagRootCause}
                              onChange={(e) => setDiagRootCause(e.target.value)}
                              rows={2}
                              placeholder="Auto-filled from Scan & Diagnose above — editable."
                              className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none resize-none"
                            />
                          </div>
                        </div>

                        {/* ── REQUIRED, MANUAL ONLY — never model-generated ── */}
                        <div className="border-2 border-[#C85C5C]/30 bg-[#C85C5C]/[0.03] p-3 rounded space-y-3">
                          <span className="font-mono text-[10px] text-[#C85C5C] uppercase tracking-widest block">
                            {"Required — Manual Only. Never AI-Generated."}
                          </span>

                          <div className="space-y-2">
                            <span className="text-[#B0A89E] uppercase text-xs font-mono block">{"Projected Impact"}</span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                              <input type="text" value={deliverImpactStep} onChange={(e) => setDeliverImpactStep(e.target.value)} placeholder="Step this range applies to (e.g. checkout completion rate)" className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none md:col-span-2" />
                              <div className="flex gap-2 items-center">
                                <input type="number" value={deliverImpactLow} onChange={(e) => setDeliverImpactLow(e.target.value)} placeholder="Low" className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none" />
                                <span className="text-[#7A6F65]">–</span>
                                <input type="number" value={deliverImpactHigh} onChange={(e) => setDeliverImpactHigh(e.target.value)} placeholder="High" className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none" />
                                <select value={deliverImpactUnit} onChange={(e) => setDeliverImpactUnit(e.target.value as "%" | "$")} className="bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none">
                                  <option value="%">%</option>
                                  <option value="$">$</option>
                                </select>
                              </div>
                              <input type="text" value={deliverImpactModeledFrom} onChange={(e) => setDeliverImpactModeledFrom(e.target.value)} placeholder="Modeled from (benchmark/coefficient named)" className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none" />
                              <input type="text" value={deliverImpactNarrowsWith} onChange={(e) => setDeliverImpactNarrowsWith(e.target.value)} placeholder="Narrows with (what client data would sharpen this)" className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none" />
                            </div>
                          </div>

                          <div className="space-y-2 border-t border-[#C85C5C]/15 pt-3">
                            <span className="text-[#B0A89E] uppercase text-xs font-mono block">{"Final Decision"}</span>
                            <div className="space-y-2 text-xs font-mono">
                              <input type="text" value={deliverDecisionLabel} onChange={(e) => setDeliverDecisionLabel(e.target.value)} placeholder="Decision label (short headline)" className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none" />
                              <textarea value={deliverDecisionAction} onChange={(e) => setDeliverDecisionAction(e.target.value)} rows={2} placeholder="Action — specific, implementable" className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none resize-none" />
                              <textarea value={deliverDecisionReasoning} onChange={(e) => setDeliverDecisionReasoning(e.target.value)} rows={2} placeholder="Reasoning — why this, grounded in the evidence" className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none resize-none" />
                              <textarea value={deliverDecisionTradeoff} onChange={(e) => setDeliverDecisionTradeoff(e.target.value)} rows={2} placeholder="Tradeoff — what this sacrifices or risks" className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none resize-none" />
                            </div>
                          </div>

                          <div className="space-y-2 border-t border-[#C85C5C]/15 pt-3">
                            <span className="text-[#B0A89E] uppercase text-xs font-mono block">{"What NOT To Do (at least 1 required)"}</span>
                            {deliverAvoid.map((item, i) => (
                              <div key={i} className="flex gap-2 items-start">
                                <div className="flex-1 space-y-1.5">
                                  <input
                                    type="text"
                                    value={item.action}
                                    onChange={(e) => setDeliverAvoid((prev) => prev.map((a, idx) => (idx === i ? { ...a, action: e.target.value } : a)))}
                                    placeholder="Action to avoid"
                                    className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white text-xs font-mono focus:border-[#D4A853] focus:outline-none"
                                  />
                                  <input
                                    type="text"
                                    value={item.reason}
                                    onChange={(e) => setDeliverAvoid((prev) => prev.map((a, idx) => (idx === i ? { ...a, reason: e.target.value } : a)))}
                                    placeholder="Why it backfires"
                                    className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white text-xs font-mono focus:border-[#D4A853] focus:outline-none"
                                  />
                                </div>
                                {deliverAvoid.length > 1 && (
                                  <button type="button" onClick={() => setDeliverAvoid((prev) => prev.filter((_, idx) => idx !== i))} className="text-[#C85C5C] hover:text-white border border-[#C85C5C]/30 px-2 py-1 rounded font-mono text-xs shrink-0">✕</button>
                                )}
                              </div>
                            ))}
                            <button type="button" onClick={() => setDeliverAvoid((prev) => [...prev, { action: "", reason: "" }])} className="text-[#D4A853] hover:text-white border border-[#D4A853]/30 px-2 py-1 rounded font-mono text-xs">+ Add avoid item</button>
                          </div>
                        </div>

                        {/* ── Optional full-schema capture ── */}
                        <details className="border border-[#D4A853]/10 rounded">
                          <summary className="font-mono text-[10px] text-[#B0A89E] uppercase tracking-widest p-2 cursor-pointer select-none">{"Before / After (optional)"}</summary>
                          <div className="p-3 space-y-2 text-xs font-mono border-t border-[#D4A853]/10">
                            <input type="text" value={deliverBeforeTitle} onChange={(e) => setDeliverBeforeTitle(e.target.value)} placeholder="Before title" className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none" />
                            <input type="text" value={deliverBeforeIssue} onChange={(e) => setDeliverBeforeIssue(e.target.value)} placeholder="Before issue (measured, from evidence)" className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none" />
                            <textarea
                              value={deliverBeforeFields.join("\n")}
                              onChange={(e) => setDeliverBeforeFields(e.target.value.split("\n"))}
                              rows={3}
                              placeholder={"Before fields, one per line"}
                              className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none resize-none"
                            />
                            <input type="text" value={deliverBeforeWarning} onChange={(e) => setDeliverBeforeWarning(e.target.value)} placeholder="Before warning (optional)" className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none" />
                            <input type="text" value={deliverBeforeBounce} onChange={(e) => setDeliverBeforeBounce(e.target.value)} placeholder="Before bounce/audit line" className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none" />
                            <div className="border-t border-[#D4A853]/8 my-1" />
                            <input type="text" value={deliverAfterTitle} onChange={(e) => setDeliverAfterTitle(e.target.value)} placeholder="After title" className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none" />
                            <input type="text" value={deliverAfterDomain} onChange={(e) => setDeliverAfterDomain(e.target.value)} placeholder="After domain/reference" className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none" />
                            <input type="text" value={deliverAfterConfirmation} onChange={(e) => setDeliverAfterConfirmation(e.target.value)} placeholder="After confirmation (optional)" className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none" />
                            <textarea value={deliverAfterDescription} onChange={(e) => setDeliverAfterDescription(e.target.value)} rows={2} placeholder="After description — what changes (optional)" className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none resize-none" />
                            <input type="text" value={deliverAfterGain} onChange={(e) => setDeliverAfterGain(e.target.value)} placeholder="After gain (modeled, not guaranteed)" className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none" />
                          </div>
                        </details>

                        <details className="border border-[#D4A853]/10 rounded">
                          <summary className="font-mono text-[10px] text-[#B0A89E] uppercase tracking-widest p-2 cursor-pointer select-none">{`Implementation Checklist (optional, ${deliverChecklist.length})`}</summary>
                          <div className="p-3 space-y-2 text-xs font-mono border-t border-[#D4A853]/10">
                            {deliverChecklist.map((item, i) => (
                              <div key={i} className="flex gap-2 items-start">
                                <div className="flex-1 space-y-1.5">
                                  <input type="text" value={item.task} onChange={(e) => setDeliverChecklist((prev) => prev.map((c, idx) => (idx === i ? { ...c, task: e.target.value } : c)))} placeholder="Task" className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none" />
                                  <input type="text" value={item.tip} onChange={(e) => setDeliverChecklist((prev) => prev.map((c, idx) => (idx === i ? { ...c, tip: e.target.value } : c)))} placeholder="Tip" className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none" />
                                </div>
                                <button type="button" onClick={() => setDeliverChecklist((prev) => prev.filter((_, idx) => idx !== i))} className="text-[#C85C5C] hover:text-white border border-[#C85C5C]/30 px-2 py-1 rounded text-xs shrink-0">✕</button>
                              </div>
                            ))}
                            <button type="button" onClick={() => setDeliverChecklist((prev) => [...prev, { task: "", tip: "" }])} className="text-[#D4A853] hover:text-white border border-[#D4A853]/30 px-2 py-1 rounded text-xs">+ Add checklist item</button>
                          </div>
                        </details>

                        <details className="border border-[#D4A853]/10 rounded">
                          <summary className="font-mono text-[10px] text-[#B0A89E] uppercase tracking-widest p-2 cursor-pointer select-none">{`Learning Modules (optional, ${deliverLearningModules.length})`}</summary>
                          <div className="p-3 space-y-2 text-xs font-mono border-t border-[#D4A853]/10">
                            {deliverLearningModules.map((mod, i) => (
                              <div key={i} className="flex gap-2 items-start border-b border-[#D4A853]/5 pb-2">
                                <div className="flex-1 space-y-1.5">
                                  <input type="text" value={mod.title} onChange={(e) => setDeliverLearningModules((prev) => prev.map((m, idx) => (idx === i ? { ...m, title: e.target.value } : m)))} placeholder="Module title" className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none" />
                                  <input type="text" value={mod.description} onChange={(e) => setDeliverLearningModules((prev) => prev.map((m, idx) => (idx === i ? { ...m, description: e.target.value } : m)))} placeholder="Description" className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none" />
                                  <textarea value={mod.content} onChange={(e) => setDeliverLearningModules((prev) => prev.map((m, idx) => (idx === i ? { ...m, content: e.target.value } : m)))} rows={2} placeholder="Content" className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white focus:border-[#D4A853] focus:outline-none resize-none" />
                                </div>
                                <button type="button" onClick={() => setDeliverLearningModules((prev) => prev.filter((_, idx) => idx !== i))} className="text-[#C85C5C] hover:text-white border border-[#C85C5C]/30 px-2 py-1 rounded text-xs shrink-0">✕</button>
                              </div>
                            ))}
                            <button type="button" onClick={() => setDeliverLearningModules((prev) => [...prev, { title: "", description: "", content: "" }])} className="text-[#D4A853] hover:text-white border border-[#D4A853]/30 px-2 py-1 rounded text-xs">+ Add learning module</button>
                          </div>
                        </details>

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
                            {"Cancel"}
                          </button>
                          <button
                            type="button"
                            onClick={handleReviewDelivery}
                            className="px-3 py-1 bg-[#D4A853] text-[#0A0908] hover:bg-[#E8C97A] rounded font-mono font-bold text-xs"
                          >
                            {"Review Delivery →"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── Part D: Dry-run review — nothing is written until Publish is clicked here ── */}
                    {showDryRun && dryRunPayload && (
                      <div className="border-2 border-[#D4A853]/40 p-4 rounded bg-black/60 space-y-4 mt-3">
                        <span className="font-mono text-xs text-[#D4A853] uppercase block">{"Dry Run — Review Before Publish"}</span>

                        {dryRunErrors.length > 0 ? (
                          <div className="border border-[#C85C5C]/40 bg-[#C85C5C]/10 p-3 rounded space-y-1">
                            <span className="font-mono text-[10px] text-[#C85C5C] uppercase tracking-widest block">{"Publish blocked — fix these first"}</span>
                            {dryRunErrors.map((err, i) => (
                              <p key={i} className="font-mono text-xs text-[#C85C5C]">{"✗ "}{err}</p>
                            ))}
                          </div>
                        ) : (
                          <div className="border border-[#5C9A6B]/40 bg-[#5C9A6B]/10 p-3 rounded">
                            <p className="font-mono text-xs text-[#5C9A6B]">{"✓ Validation passed — ready to publish."}</p>
                          </div>
                        )}

                        {(() => {
                          const cid = selectedClient?.id ? `?cid=${encodeURIComponent(selectedClient.id)}` : "";
                          return (
                            <div className="space-y-1.5 text-[10px] font-mono">
                              <div className="text-[#5C9A6B] bg-[#5C9A6B]/5 border border-[#5C9A6B]/15 px-3 py-1.5 rounded flex items-center justify-between gap-2">
                                <span>{"✓ Deliverable goes live immediately on publish — no rebuild"}</span>
                                <button
                                  type="button"
                                  onClick={() => navigator.clipboard.writeText(`https://signal-and-friction.com/deliverable/${dryRunPayload.clientKey}${cid}`).catch(() => {})}
                                  className="shrink-0 text-[#5C9A6B] hover:text-white border border-[#5C9A6B]/30 px-2 py-0.5 rounded cursor-pointer"
                                >
                                  ⧉ /deliverable/{dryRunPayload.clientKey}
                                </button>
                              </div>
                              <div className="text-[#D4A853] bg-[#D4A853]/5 border border-[#D4A853]/15 px-3 py-1.5 rounded flex items-center justify-between gap-2">
                                <span>{"⏱ SLA link — share with client now"}</span>
                                <button
                                  type="button"
                                  onClick={() => navigator.clipboard.writeText(`https://signal-and-friction.com/sla/${dryRunPayload.clientKey}${cid}`).catch(() => {})}
                                  className="shrink-0 text-[#D4A853] hover:text-white border border-[#D4A853]/30 px-2 py-0.5 rounded cursor-pointer"
                                >
                                  ⧉ /sla/{dryRunPayload.clientKey}
                                </button>
                              </div>
                            </div>
                          );
                        })()}

                        <div className="space-y-2 text-xs font-mono">
                          <div className="flex justify-between border-b border-[#D4A853]/8 pb-1"><span className="text-[#7A6F65] uppercase">{"Target URL"}</span><span className="text-[#F5F0EB]">/deliverable/{dryRunPayload.clientKey}</span></div>
                          <div className="flex justify-between border-b border-[#D4A853]/8 pb-1"><span className="text-[#7A6F65] uppercase">{"Client Name"}</span><span className="text-[#F5F0EB]">{dryRunPayload.clientName}</span></div>
                          <div className="flex justify-between border-b border-[#D4A853]/8 pb-1"><span className="text-[#7A6F65] uppercase">{"Segment"}</span><span className="text-[#F5F0EB]">{dryRunPayload.segment}</span></div>
                          <div className="flex justify-between border-b border-[#D4A853]/8 pb-1"><span className="text-[#7A6F65] uppercase">{"Loom URL"}</span><span className="text-[#F5F0EB] truncate max-w-[60%]">{dryRunPayload.loomUrl || "(missing)"}</span></div>

                          <div className="pt-2">
                            <span className="text-[#7A6F65] uppercase block mb-1">{`Evidence (${dryRunPayload.evidence?.length || 0} items)`}</span>
                            {(dryRunPayload.evidence || []).map((ev: EvidenceItem, i: number) => (
                              <div key={i} className="pl-2 border-l border-[#D4A853]/15 mb-1">
                                <span className="text-[#F5F0EB]">[{ev.tier}] {ev.label}: {ev.value}</span>
                                <p className="text-[#7A6F65] text-[10px]">{ev.source}</p>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-[#D4A853]/8">
                            <span className="text-[#7A6F65] uppercase block mb-1">{"Projected Impact"}</span>
                            {dryRunPayload.projectedImpact ? (
                              <p className="text-[#F5F0EB]">{dryRunPayload.projectedImpact.low}–{dryRunPayload.projectedImpact.high}{dryRunPayload.projectedImpact.unit} on {dryRunPayload.projectedImpact.step} — modeled from {dryRunPayload.projectedImpact.modeledFrom}</p>
                            ) : (
                              <p className="text-[#C85C5C]">{"(missing)"}</p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-[#D4A853]/8">
                            <span className="text-[#7A6F65] uppercase block mb-1">{`Confidence: ${dryRunPayload.confidenceLevel ?? "(none)"}/100`}</span>
                            <p className="text-[#7A6F65] text-[10px]">{dryRunPayload.confidenceReason}</p>
                          </div>

                          <div className="pt-2 border-t border-[#D4A853]/8">
                            <span className="text-[#7A6F65] uppercase block mb-1">{"Final Decision"}</span>
                            <p className="text-[#F5F0EB]">{dryRunPayload.diagnosis.finalDecision.label || "(missing)"}</p>
                            <p className="text-[#B0A89E] text-[10px] mt-1">{dryRunPayload.diagnosis.finalDecision.action}</p>
                          </div>

                          <div className="pt-2 border-t border-[#D4A853]/8">
                            <span className="text-[#7A6F65] uppercase block mb-1">{`Avoid (${dryRunPayload.avoid?.length || 0} items)`}</span>
                            {(dryRunPayload.avoid || []).map((a: { action: string; reason: string }, i: number) => (
                              <p key={i} className="text-[#F5F0EB] text-[10px]">✗ {a.action}</p>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-[#D4A853]/8 flex gap-4">
                            <span className="text-[#7A6F65]">{`Before/After: ${dryRunPayload.beforeAfter ? "set" : "not set"}`}</span>
                            <span className="text-[#7A6F65]">{`Checklist: ${dryRunPayload.checklist?.length || 0}`}</span>
                            <span className="text-[#7A6F65]">{`Learning modules: ${dryRunPayload.learningModules?.length || 0}`}</span>
                          </div>
                        </div>

                        <details className="border border-[#D4A853]/10 rounded">
                          <summary className="font-mono text-[10px] text-[#B0A89E] uppercase tracking-widest p-2 cursor-pointer select-none">{"Raw JSON payload"}</summary>
                          <pre className="p-3 text-[9px] text-[#7A6F65] font-mono overflow-auto max-h-64 border-t border-[#D4A853]/10 whitespace-pre-wrap">{JSON.stringify(dryRunPayload, null, 2)}</pre>
                        </details>

                        {diagnosticError && <p className="text-[#C85C5C] text-xs font-mono">{diagnosticError}</p>}
                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowDryRun(false)}
                            className="px-3 py-1 bg-white/5 text-white border border-white/10 hover:bg-white/10 rounded font-mono text-xs"
                          >
                            {"← Back to Edit"}
                          </button>
                          <button
                            type="button"
                            disabled={dryRunErrors.length > 0 || actionLoading !== null}
                            onClick={handlePublishDelivery}
                            className="px-3 py-1 bg-[#D4A853] text-[#0A0908] hover:bg-[#E8C97A] rounded font-mono font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {actionLoading === "delivered" ? "Publishing..." : `Publish to /deliverable/${dryRunPayload.clientKey} →`}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Performance Guarantee protocol block */}
                  <div className="border border-[#D4A853]/15 p-4 rounded bg-black/30 space-y-4">
                    <div className="flex justify-between items-center border-b border-[#D4A853]/8 pb-2">
                      <span className="font-mono text-xs text-white uppercase tracking-wider block">
                        {"Performance Guarantee (Moat Protocol)"}
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                        {/* Gate checklist */}
                        <div className="space-y-2 border-r border-[#D4A853]/8 pr-4">
                          <span className="text-[#B0A89E] uppercase block mb-1">{"Gate Checklist:"}</span>
                          <div className="space-y-1.5">
                            <label className="flex items-center gap-2 cursor-pointer text-white">
                              <input
                                type="checkbox"
                                checked={modalTrafficGate}
                                onChange={e => setModalTrafficGate(e.target.checked)}
                                className="accent-[#D4A853]"
                              />
                              {"Traffic Gate (>15k visits/mo)"}
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
                              {"A/B Isolation Gate"}
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-white">
                              <input
                                type="checkbox"
                                checked={modalTelemetryGate}
                                onChange={e => setModalTelemetryGate(e.target.checked)}
                                className="accent-[#D4A853]"
                              />
                              {"PostHog Telemetry Gate"}
                            </label>
                          </div>
                        </div>

                        {/* Numeric parameters and status */}
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[#B0A89E] uppercase">{"Target Improvement %"}</label>
                              <input
                                type="number"
                                value={modalTargetImprovement}
                                onChange={e => setModalTargetImprovement(Number(e.target.value))}
                                className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[#B0A89E] uppercase">{"Window (Days)"}</label>
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
                              <label className="text-[#B0A89E] uppercase">{"Baseline Conv%"}</label>
                              <input
                                type="number"
                                step="0.01"
                                value={modalBaselineRate}
                                onChange={e => setModalBaselineRate(Number(e.target.value))}
                                className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[#B0A89E] uppercase">{"Current Conv%"}</label>
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
                            <label className="text-[#B0A89E] uppercase">{"Guarantee Status"}</label>
                            <select
                              value={modalGuaranteeStatus}
                              onChange={e => setModalGuaranteeStatus(e.target.value as any)}
                              className="w-full bg-black/60 border border-[#D4A853]/8 p-2 rounded text-white"
                            >
                              <option value="active">{"Active Monitoring"}</option>
                              <option value="met">{"Target Met"}</option>
                              <option value="failed_refunded">{"Failed (Stripe Refund)"}</option>
                              <option value="voided">{"Voided (Gate Unmet)"}</option>
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
                      {"Friction Diagnostics"}
                    </span>
                    {selectedClientInteractions.length === 0 ? (
                      <p className="text-xs text-[#B0A89E] font-mono italic">{"No diagnostics recorded."}</p>
                    ) : (
                      selectedClientInteractions.map((inter, i) => (
                        <div key={inter.id || i} className="bg-black/30 p-3 border border-[#D4A853]/8 rounded space-y-1.5">
                          <div className="flex justify-between text-xs font-mono">
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
                              🎬 {"Watch Loom Video"}
                            </a>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-3 grow flex flex-col min-h-0">
                    <span className="font-mono text-xs text-[#B0A89E] uppercase tracking-wider block border-b border-[#D4A853]/8 pb-1">
                      {"Activity History"}
                    </span>
                    <div className="overflow-y-auto space-y-2 grow pr-1 scrollbar-thin max-h-[300px]">
                      {loadingLogs ? (
                        <p className="text-xs text-[#B0A89E] font-mono animate-pulse">{"Loading history..."}</p>
                      ) : selectedClientLogs.length === 0 ? (
                        <p className="text-xs text-[#B0A89E] font-mono italic">{"No events recorded."}</p>
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
              {saveError && (
                <div className="border border-[#C85C5C]/40 bg-[#C85C5C]/10 rounded px-3 py-2 font-mono text-xs text-[#C85C5C]">
                  {"⚠ "}{saveError}
                </div>
              )}
              <div className="flex justify-end gap-3 border-t border-[#D4A853]/8 pt-4">
                <button
                  type="button"
                  onClick={() => { setSaveError(null); setShowModal(false); }}
                  className="px-4 py-2 border border-white/10 hover:text-white uppercase tracking-wider rounded cursor-pointer text-xs font-mono"
                >
                  {"Cancel"}
                </button>
                <button
                  type="button"
                  onClick={handleSaveClientDetails}
                  className="px-5 py-2 bg-[#D4A853] text-[#0A0908] font-bold uppercase tracking-wider hover:bg-[#E8C97A] transition-all rounded cursor-pointer text-xs font-mono"
                >
                  {"Save Parameters"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
