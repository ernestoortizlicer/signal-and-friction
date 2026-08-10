"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// La sesión implícita se establece de forma asíncrona vía detección de
// fragmento hash (detectSessionInUrl, default del SDK). Este callback no
// recibe ?code= (no es PKCE) — espera a que el SDK termine de procesarla.
const SESSION_WAIT_TIMEOUT_MS = 6000;

function CallbackHandler() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let settled = false;

    function onSession(session: Session | null) {
      if (settled || !session) return;
      settled = true;
      document.cookie = `sf-admin-session=${session.access_token}; path=/; max-age=604800; SameSite=Lax; Secure`;
      router.push("/admin/dashboard");
    }

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) {
        settled = true;
        setError(sessionError.message || "Failed to retrieve session.");
        return;
      }
      onSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      onSession(session);
    });

    const timeoutId = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        setError("No session could be established from this link. It may be expired or already used.");
      }
    }, SESSION_WAIT_TIMEOUT_MS);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timeoutId);
    };
  }, [router]);

  if (error) {
    return (
      <div className="text-center p-6 max-w-sm border border-[#2C2520] bg-[#12100E] rounded shadow-2xl">
        <h1 className="font-serif text-xl text-red-400 mb-2">Auth Error</h1>
        <p className="text-xs font-mono text-[#807870] mb-4">{error}</p>
        <button
          onClick={() => router.push("/admin/login")}
          className="px-4 py-2 bg-[#B85C38] text-white text-xs font-mono rounded"
        >
          Return to Login
        </button>
      </div>
    );
  }

  return (
    <div className="text-center p-6">
      <div className="w-6 h-6 border-2 border-[#B85C38] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="font-mono text-xs text-[#807870] animate-pulse">
        Completing authentication handshake...
      </p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <main className="min-h-screen bg-[#0A0908] text-[#F5F0EB] flex items-center justify-center p-6 relative">
      <CallbackHandler />
    </main>
  );
}
