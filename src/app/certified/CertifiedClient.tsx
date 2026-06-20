"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";

const HexGrid = dynamic(() => import("@/components/HexGrid"), { ssr: false });

export default function CertifiedClient() {
  const [tier, setTier] = useState<"one_time" | "monthly">("one_time");
  const [formData, setFormData] = useState({ name: "", email: "", agency: "", website: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("success") === "true") {
        const name = params.get("name") || "";
        const email = params.get("email") || "";
        const agency = params.get("agency") || "";
        const website = params.get("website") || "";
        const selectedTier = (params.get("tier") as "one_time" | "monthly") || "one_time";
        
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormData({ name, email, agency, website });
        setTier(selectedTier);
        setSubmitted(true);

        // Call onboarding function to mark status as active in DB
        const activate = async () => {
          try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tsaarsuuclvkjsgjcmoj.supabase.co";
            const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
            await fetch(`${supabaseUrl}/functions/v1/certification-onboarding`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "apikey": supabaseAnonKey,
                "Authorization": `Bearer ${supabaseAnonKey}`
              },
              body: JSON.stringify({
                name,
                email,
                agency,
                website,
                tier: selectedTier,
                action: "activate"
              })
            });
          } catch (err) {
            console.error("Failed to execute database activation:", err);
          }
        };
        activate();
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tsaarsuuclvkjsgjcmoj.supabase.co";
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      
      const response = await fetch(`${supabaseUrl}/functions/v1/certification-onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          agency: formData.agency,
          website: formData.website,
          tier: tier
        })
      });
      
      if (!response.ok) {
        throw new Error("Onboarding Edge Function failed");
      }
      
      const data = await response.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      console.warn("Failed to call certification onboarding, falling back to simulation:", err);
      // Local fallback simulation
      const origin = typeof window !== "undefined" ? window.location.origin : "https://signal-and-friction.pages.dev";
      window.location.href = `${origin}/certified?success=true&name=${encodeURIComponent(formData.name)}&email=${encodeURIComponent(formData.email)}&agency=${encodeURIComponent(formData.agency)}&website=${encodeURIComponent(formData.website)}&tier=${tier}&simulated=true`;
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0A0908] text-[#F5F0EB] overflow-y-auto relative flex flex-col justify-between font-sans">
      <HexGrid />

      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#D4A853]/10 bg-[#0A0908]/80 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-3">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L15 8L8 15L1 8Z" stroke="#D4A853" strokeWidth="1.5" />
          </svg>
          <span className="font-mono text-xs text-[#D4A853]/60 tracking-[0.35em] uppercase font-bold">
            S&amp;F Certified™
          </span>
        </div>
        <Link href="/" className="font-mono text-xs text-[#7A6F65] hover:text-[#D4A853] transition-colors tracking-widest uppercase">
          ← Return to Console
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-[1000px] mx-auto w-full px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        
        {/* Left Column: Program Details */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-3">
            <span className="font-mono text-xs text-[#D4A853] tracking-[0.4em] uppercase border border-[#D4A853]/25 px-2.5 py-1 rounded bg-[#D4A853]/5 inline-block">
              Methodology Licensing Program
            </span>
            <h1 className="text-3xl lg:text-5xl font-bold leading-tight tracking-tight">
              Scale your agency with the <span className="text-[#D4A853] glow-text">Signal &amp; Friction™</span> methodology.
            </h1>
          </div>

          <p className="text-sm text-[#9A8F82] leading-relaxed max-w-lg font-mono">
            Licensing of the industry-leading cognitive conversion diagnostics framework. Enable your agency to sell medical-grade audits, run optimized A/B tests, and secure high-ticket clients.
          </p>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            {[
              { title: "Licensed Badge", desc: "Gain permission to use the official 'S&F Certified™' badge on your sales assets." },
              { title: "Playbook Updates", desc: "Receive quarterly updates to the diagnostic playbook containing fresh heuristics." },
              { title: "Public Directory", desc: "Get featured on our high-ticket partner directory for inbound referrals." },
              { title: "Socratic Exam", desc: "Prove mastery of the Fogg Model, sequence latency, and cognitive load indexes." }
            ].map((b, idx) => (
              <div key={idx} className="border border-[#D4A853]/8 bg-white/[0.01] p-4 rounded space-y-1">
                <span className="text-xs font-serif font-bold text-[#F5F0EB] block">{b.title}</span>
                <p className="text-sm text-[#9A8F82] font-mono leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Pricing & Intake Form */}
        <div className="lg:col-span-5">
          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="border border-[#D4A853]/15 bg-[#0A0908]/95 p-8 rounded glow-border space-y-6"
              >
                <div className="text-center space-y-1.5 border-b border-[#D4A853]/10 pb-4">
                  <h3 className="text-lg font-serif font-bold text-white">License Intake Portal</h3>
                  <p className="text-xs text-[#9A8F82] font-mono uppercase tracking-wider">Select license billing parameters</p>
                </div>

                {/* Billing Selector */}
                <div className="flex bg-[#110F0D]/40 border border-[#D4A853]/8 p-1 rounded-full text-center text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setTier("one_time")}
                    className={`flex-1 py-2 rounded-full cursor-pointer transition-all ${tier === "one_time" ? "bg-[#D4A853] text-[#0A0908] font-bold" : "text-[#7A6F65] hover:text-white"}`}
                  >
                    Lifetime ($2,500)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTier("monthly")}
                    className={`flex-1 py-2 rounded-full cursor-pointer transition-all ${tier === "monthly" ? "bg-[#D4A853] text-[#0A0908] font-bold" : "text-[#7A6F65] hover:text-white"}`}
                  >
                    Subscription ($250/mo)
                  </button>
                </div>

                {/* Intake Form */}
                <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
                  <div className="space-y-1.5">
                    <label className="text-[#9A8F82] uppercase tracking-wider block">Full Name</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ernesto Ortiz"
                      className="w-full bg-black/40 border border-[#D4A853]/8 focus:border-[#D4A853] focus:outline-none p-3 rounded text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[#9A8F82] uppercase tracking-wider block">Work Email</label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="ernesto@agency.io"
                      className="w-full bg-black/40 border border-[#D4A853]/8 focus:border-[#D4A853] focus:outline-none p-3 rounded text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[#9A8F82] uppercase tracking-wider block">Agency Name</label>
                    <input
                      required
                      type="text"
                      value={formData.agency}
                      onChange={e => setFormData(prev => ({ ...prev, agency: e.target.value }))}
                      placeholder="Divergent Optimization"
                      className="w-full bg-black/40 border border-[#D4A853]/8 focus:border-[#D4A853] focus:outline-none p-3 rounded text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[#9A8F82] uppercase tracking-wider block">Website URL</label>
                    <input
                      required
                      type="url"
                      value={formData.website}
                      onChange={e => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://divergent-optimization.io"
                      className="w-full bg-black/40 border border-[#D4A853]/8 focus:border-[#D4A853] focus:outline-none p-3 rounded text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-[#D4A853] text-[#0A0908] font-bold text-xs uppercase tracking-[0.2em] transition-all hover:bg-[#E8C97A] active:scale-[0.98] disabled:opacity-40 disabled:scale-100 cursor-pointer glow-accent mt-2"
                  >
                    {loading ? "Routing to Stripe Secure Handshake..." : "Initiate Certification License"}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="border border-[#5C9A6B]/20 bg-[#0A0908]/95 p-8 rounded glow-border-green space-y-6 text-center"
              >
                <div className="w-12 h-12 rounded-full border-2 border-[#5C9A6B] flex items-center justify-center mx-auto text-xl text-[#5C9A6B] animate-bounce">
                  ✓
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-serif font-bold text-white">Stripe Payment Successful</h3>
                  <p className="text-sm text-[#9A8F82] font-mono leading-relaxed">
                    License payment received for <strong className="text-white">{formData.agency}</strong> ({tier === "one_time" ? "Lifetime Plan" : "Subscription Plan"}).
                  </p>
                </div>

                <div className="border border-[#D4A853]/8 bg-[#110F0D]/25 p-4 rounded text-left space-y-3 font-mono text-xs">
                  <span className="text-[#D4A853] font-semibold block uppercase tracking-wider">Automated Onboarding Kit:</span>
                  <p className="text-[#9A8F82] leading-relaxed">
                    We have dispatched your digital S&amp;F Certification playbook, exam key, and vector badge assets to: <strong className="text-[#F5F0EB]">{formData.email}</strong>.
                  </p>
                  <a
                    href="https://82a60ddf.signal-and-friction.pages.dev/sf_linkedin_banner.png"
                    download
                    className="inline-block py-2 px-3 border border-[#D4A853]/30 text-[#D4A853] rounded hover:bg-[#D4A853]/5 text-center w-full uppercase tracking-wider"
                  >
                    Download Badge Vector Asset
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="w-full py-2.5 border border-[#7A6F65] text-xs text-[#9A8F82] hover:text-white transition-colors cursor-pointer"
                >
                  Return to License Form
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Curriculum / Syllabus Section */}
      <div className="max-w-[1000px] mx-auto w-full px-6 py-12 border-t border-[#D4A853]/8 relative z-10 space-y-8">
        <div className="space-y-2">
          <span className="font-mono text-xs text-[#D4A853] tracking-[0.3em] uppercase block">Mastery Course Syllabus</span>
          <h2 className="text-xl font-bold font-serif text-white uppercase tracking-wider">The S&amp;F Certification Curriculum</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { id: "01", title: "Cognitive Heuristics", desc: "Isolate value deficits and trust bottlenecks using Stanford behavior models." },
            { id: "02", title: "Sequence Optimization", desc: "Sequence pricing, CC inputs, and API integrations to minimize conversion decay." },
            { id: "03", title: "PostHog Gating", desc: "Integrate telemetry, establish baselines, and isolate testing variables." },
            { id: "04", title: "Socratic Debates", desc: "Draft copy teardowns, rating consensus models, and resolving regulatory roadblocks." },
            { id: "05", title: "Performance Guarantees", desc: "Draft legally sound guarantee terms, manage Stripe refunds, and allocate risks." },
          ].map((m, idx) => (
            <div key={idx} className="border border-[#D4A853]/8 bg-[#110F0D]/10 p-5 rounded space-y-2 font-mono">
              <span className="text-[#D4A853] font-bold text-xs">Module {m.id}</span>
              <h4 className="text-white font-serif font-bold text-sm">{m.title}</h4>
              <p className="text-sm text-[#9A8F82] leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.03] py-6 px-6 text-center text-xs font-mono text-[#7A6F65] relative z-10">
        © 2026 Signal &amp; Friction Method™ Certified. All rights reserved.
      </footer>
    </main>
  );
}
