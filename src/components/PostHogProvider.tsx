"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { getConsent, CONSENT_CHANGE_EVENT, type ConsentValue } from "@/lib/cookieConsent";

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      posthog.capture("$pageview", {
        $current_url: window.location.href,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

// Identifying every visitor as "ernesto-sf-admin" merged every anonymous
// session — public site traffic included — into one PostHog person
// profile, making all analytics unusable. Only identify when there's an
// actual authenticated admin session; every other visitor stays anonymous
// under PostHog's own auto-generated distinct_id.
function identifyIfAdmin() {
  const adminEmailsEnv =
    process.env.NEXT_PUBLIC_ALLOWED_ADMIN_EMAIL ||
    process.env.NEXT_PUBLIC_ADMIN_EMAILS ||
    "ernestoortiz@gmail.com,ernestoortizlicer@gmail.com";
  const whitelist = adminEmailsEnv.split(",").map((e) => e.trim().toLowerCase());

  supabase.auth.getSession().then(({ data: { session } }) => {
    const userEmail = (session?.user?.email || "").toLowerCase();
    if (session && whitelist.includes(userEmail)) {
      posthog.identify("ernesto-sf-admin", {
        name: "Ernesto Ortiz",
        role: "operator",
        product: "Signal & Friction",
      });
    }
  });
}

export function PHProvider({ children }: { children: React.ReactNode }) {
  // GDPR: analytics are opt-in. PostHog never initializes — no script runs,
  // no cookie or localStorage entry is ever set — until the visitor accepts
  // via the cookie banner. Starts null (no decision read yet) so the first
  // render never assumes consent.
  const [consent, setConsentState] = useState<ConsentValue | null>(null);
  const initedRef = useRef(false);

  useEffect(() => {
    // Reads localStorage, which doesn't exist during SSR — must run after
    // mount, not as a lazy initializer, or the prerendered HTML and the
    // client's first hydration pass would disagree on consent state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsentState(getConsent());
    function onChange(e: Event) {
      setConsentState((e as CustomEvent<ConsentValue>).detail ?? null);
    }
    window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
  }, []);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;

    if (consent !== "accepted") {
      // Covers both an explicit reject and a reject-after-a-prior-accept —
      // actively clear anything PostHog already stored, don't just stop
      // calling it. Only meaningful once init has actually run once.
      if (initedRef.current) {
        posthog.opt_out_capturing();
        posthog.reset();
      }
      return;
    }

    posthog.init(key, {
      api_host: "https://app.posthog.com",
      capture_pageview: false, // manual via PostHogPageView
      capture_pageleave: true,
      autocapture: true,
      person_profiles: "always",
    });
    initedRef.current = true;
    identifyIfAdmin();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        posthog.reset();
      } else {
        identifyIfAdmin();
      }
    });
    return () => subscription.unsubscribe();
  }, [consent]);

  return (
    <PostHogProvider client={posthog}>
      {consent === "accepted" && (
        <Suspense fallback={null}>
          <PostHogPageView />
        </Suspense>
      )}
      {children}
    </PostHogProvider>
  );
}
