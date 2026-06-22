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
  lang: Lang;
  toggle: () => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "es",
  toggle: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("es");

  useEffect(() => {
    const stored = localStorage.getItem("sf-admin-lang") as Lang | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "es" || stored === "en") setLang(stored);
  }, []);

  const toggle = () => {
    setLang((prev) => {
      const next: Lang = prev === "es" ? "en" : "es";
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
