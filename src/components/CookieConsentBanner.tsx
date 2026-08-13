"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getConsent, setConsent, SHOW_BANNER_EVENT, type ConsentValue } from "@/lib/cookieConsent";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Reads localStorage, which doesn't exist during SSR — must run after
    // mount, not as a lazy initializer, or the prerendered HTML and the
    // client's first hydration pass would disagree on visibility.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (getConsent() === null) setVisible(true);
    function onShow() {
      setVisible(true);
    }
    window.addEventListener(SHOW_BANNER_EVENT, onShow);
    return () => window.removeEventListener(SHOW_BANNER_EVENT, onShow);
  }, []);

  if (!visible) return null;

  function choose(value: ConsentValue) {
    setConsent(value);
    setVisible(false);
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 border-t border-[#D4A853]/25 bg-[#0A0908]/95 backdrop-blur-md px-4 py-3 md:px-6">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-3 md:gap-6 text-xs font-mono text-[#B0A89E]">
        <p className="flex-1 text-center md:text-left leading-relaxed">
          I use cookies for basic analytics to understand how visitors use this site. They only load if you accept.{" "}
          <Link href="/legal/privacy" className="text-[#D4A853] hover:underline">
            Privacy Policy →
          </Link>
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => choose("rejected")}
            className="font-mono text-xs font-semibold text-[#B0A89E] border border-white/10 hover:border-white/30 hover:text-white transition-all tracking-wide uppercase px-3 py-2 rounded-full"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="font-mono text-xs font-semibold text-[#0A0908] bg-[#D4A853] hover:bg-[#E8C97A] transition-all tracking-wide uppercase px-3 py-2 rounded-full"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
