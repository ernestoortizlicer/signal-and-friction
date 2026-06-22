"use client";

/**
 * LanguageContext — Admin-layer only.
 *
 * ARCHITECTURAL BOUNDARY: This context is intentionally scoped to the
 * /admin/** route tree via AdminLayout. It MUST NEVER be imported by
 * any component under /deliverable/, /sla/, /certified/, or any other
 * client-facing route. Those routes enforce "en" natively and statically.
 *
 * Persistence: localStorage key "sf-admin-lang" (client-side only, never
 * sent to Supabase or any external system).
 *
 * Hydration contract: lang starts as null so both SSR and the initial
 * client render produce an identical placeholder. useEffect resolves it
 * to the stored value after hydration — no mismatch, no flash.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "es" | "en";

interface LanguageContextValue {
  lang: Lang | null;
  toggle: () => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: null,
  toggle: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("sf-admin-lang") as Lang | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(stored === "es" || stored === "en" ? stored : "es");
  }, []);

  const toggle = () => {
    setLang((prev) => {
      const current = prev ?? "es";
      const next: Lang = current === "es" ? "en" : "es";
      localStorage.setItem("sf-admin-lang", next);
      return next;
    });
  };

  return (
    <LanguageContext.Provider value={{ lang, toggle }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
