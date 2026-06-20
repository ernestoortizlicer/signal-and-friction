"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ACME_FALLBACK, DeliverableData } from "./fallback";
import DeliverableClientView from "./[clientKey]/DeliverableClientView";

function DeliverableContent() {
  const searchParams = useSearchParams();
  const clientKey = searchParams.get("client");
  const [data, setData] = useState<DeliverableData | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadDeliverable() {
      if (!clientKey) {
        setData(ACME_FALLBACK);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/deliverables/${clientKey}.json`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          setData(ACME_FALLBACK);
        }
      } catch (e) {
        console.error("Error fetching dynamic deliverable", e);
        setData(ACME_FALLBACK);
      } finally {
        setLoading(false);
      }
    }
    loadDeliverable();
  }, [clientKey]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0908] flex items-center justify-center font-mono text-xs text-[#5A524A] animate-pulse">
        Fetching secure B2B revenue diagnostic...
      </div>
    );
  }

  const d = data || ACME_FALLBACK;

  return <DeliverableClientView data={d} />;
}

export default function DeliverablePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0908] flex items-center justify-center font-mono text-xs text-[#5A524A]">Loading secure diagnostic portal...</div>}>
      <DeliverableContent />
    </Suspense>
  );
}
