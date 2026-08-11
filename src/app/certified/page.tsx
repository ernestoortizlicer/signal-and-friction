import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "S&F Certified — Archived",
  description: "S&F Certified is not currently accepting new enrollments.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "https://signal-and-friction.com/certified",
  },
};

export default function CertifiedPage() {
  return (
    <main className="min-h-screen bg-[#0A0908] text-[#F5F0EB] flex items-center justify-center px-6 py-16">
      <section className="w-full max-w-2xl border border-[#D4A853]/15 bg-[#110F0D]/70 rounded-2xl p-8 sm:p-12 space-y-7">
        <div className="space-y-3">
          <span className="font-mono text-[10px] text-[#D4A853] tracking-[0.35em] uppercase">
            Archived product surface
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
            S&amp;F Certified is not accepting new enrollments.
          </h1>
          <p className="font-mono text-sm leading-relaxed text-[#B0A89E]">
            The certification and methodology-licensing concept is preserved for future review, but it is not an active Signal &amp; Friction offer and no new payments or activations are accepted from this route.
          </p>
        </div>

        <div className="border-t border-[#D4A853]/10 pt-6 space-y-4">
          <p className="font-mono text-xs leading-relaxed text-[#7A6F65]">
            Current client work starts with the Applied Behavioral Diagnostic service path.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/pricing"
              className="text-center px-5 py-3 rounded border border-[#D4A853]/40 text-[#D4A853] font-mono text-xs uppercase tracking-[0.15em] hover:bg-[#D4A853] hover:text-[#0A0908] transition-colors"
            >
              View current services
            </Link>
            <Link
              href="/"
              className="text-center px-5 py-3 rounded border border-white/10 text-[#B0A89E] font-mono text-xs uppercase tracking-[0.15em] hover:border-white/20 hover:text-white transition-colors"
            >
              Return home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
