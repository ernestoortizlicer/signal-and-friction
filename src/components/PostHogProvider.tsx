"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";

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
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    posthog.init(key, {
      api_host: "https://app.posthog.com",
      capture_pageview: false, // manual via PostHogPageView
      capture_pageleave: true,
      autocapture: true,
      person_profiles: "always",
    });
    identifyIfAdmin();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        posthog.reset();
      } else {
        identifyIfAdmin();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <PostHogProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PostHogProvider>
  );
}
