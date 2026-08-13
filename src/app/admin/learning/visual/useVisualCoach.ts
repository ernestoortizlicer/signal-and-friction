"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getAuthHeaders } from "@/lib/supabase";
import type { VisualFeedback, VisualHistory, VisualImage, VisualMode, VisualPageType } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

export function useVisualCoach() {
  const [mode, setMode] = useState<VisualMode>("noticing");
  const [pageType, setPageType] = useState<VisualPageType>("homepage");
  const [companyName, setCompanyName] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [imageA, setImageA] = useState<VisualImage | null>(null);
  const [imageB, setImageB] = useState<VisualImage | null>(null);
  const [observations, setObservations] = useState("");
  const [feedback, setFeedback] = useState<VisualFeedback | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [cost, setCost] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [secondPass, setSecondPass] = useState("");
  const [history, setHistory] = useState<VisualHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const startedAt = useRef(Date.now());

  async function loadHistory() {
    try {
      const res = await fetch("/api/learning/visual", { headers: getAuthHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load visual practice.");
      setHistory(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load visual practice.");
    }
  }

  useEffect(() => { void loadHistory(); }, []);

  const ready = useMemo(() => {
    if (!imageA || observations.trim().length < 20) return false;
    return mode === "noticing" || !!imageB;
  }, [imageA, imageB, mode, observations]);

  function resetDrill(nextMode?: VisualMode) {
    if (nextMode) setMode(nextMode);
    setImageA(null);
    setImageB(null);
    setObservations("");
    setFeedback(null);
    setModel(null);
    setCost(null);
    setSessionId(null);
    setSecondPass("");
    setError(null);
    startedAt.current = Date.now();
  }

  async function requestFeedback() {
    if (!ready || !imageA) return;
    if (!supabaseUrl) return setError("Supabase URL is not configured.");
    setBusy(true);
    setError(null);
    try {
      const images = mode === "contrast" && imageB
        ? [imageA.dataUrl, imageB.dataUrl]
        : [imageA.dataUrl];
      const res = await fetch(`${supabaseUrl}/functions/v1/visual-diagnostic-coach`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          observations,
          images,
          context: { companyName, pageUrl, pageType },
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Visual coach failed.");
      if (json.practiceOnly !== true || !json.feedback) {
        throw new Error("Visual coach returned an invalid practice contract.");
      }

      const coachFeedback = json.feedback as VisualFeedback;
      const coachModel = typeof json.meta?.model === "string" ? json.meta.model : null;
      const providerCostUSD = typeof json.meta?.providerCostUSD === "number" ? json.meta.providerCostUSD : null;
      setFeedback(coachFeedback);
      setModel(coachModel);
      setCost(providerCostUSD);

      const elapsedMinutes = Math.max(1, Math.min(240, Math.round((Date.now() - startedAt.current) / 60000)));
      const saveRes = await fetch("/api/learning/visual", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_session",
          mode,
          companyName,
          pageUrl,
          pageType,
          observations,
          imageFingerprints: [imageA.fingerprint, ...(mode === "contrast" && imageB ? [imageB.fingerprint] : [])],
          coachFeedback,
          coachModel,
          providerCostUSD,
          actualMinutes: elapsedMinutes,
        }),
      });
      const saved = await saveRes.json();
      if (!saveRes.ok) throw new Error(saved.error || "Feedback worked but the practice record could not be saved.");
      setSessionId(saved.sessionId);
      setHistory(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Visual feedback failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveSecondPass() {
    if (!sessionId || secondPass.trim().length < 10) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/learning/visual", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_second_pass", id: sessionId, secondPassText: secondPass }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Second look could not be saved.");
      setHistory(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Second look could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return {
    mode, pageType, companyName, pageUrl, imageA, imageB, observations,
    feedback, model, cost, secondPass, history, error, busy, ready,
    setPageType, setCompanyName, setPageUrl, setImageA, setImageB,
    setObservations, setSecondPass, setError,
    resetDrill, requestFeedback, saveSecondPass,
  };
}
