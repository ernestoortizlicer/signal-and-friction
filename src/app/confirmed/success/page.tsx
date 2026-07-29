"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";

const HexGrid = dynamic(() => import("@/components/HexGrid"), { ssr: false });

function SuccessContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const product = searchParams.get("product") || "Diagnostic Protocol";

  // Record referral if this client arrived via a referral link
  useEffect(() => {
    const refCode = typeof window !== 'undefined'
      ? localStorage.getItem('sf_referral_ref')
      : null;
    if (!refCode) return;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tsaarsuuclvkjsgjcmoj.supabase.co';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    fetch(`${supabaseUrl}/rest/v1/referrals`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        ref_code: refCode,
        referred_email: email || null,
        referred_product: product || null,
        status: 'pending',
        stripe_coupon_id: 'SFREF500',
      }),
    })
      .then(() => localStorage.removeItem('sf_referral_ref'))
      .catch(() => {});
  }, [email, product]);

  return (
    <main className="h-screen w-screen bg-[#0A0908] text-[#F5F0EB] overflow-y-auto relative flex flex-col items-center justify-center font-mono py-8">
      <HexGrid />

      {/* Background grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(212,168,83,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,83,0.02) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="z-10 flex flex-col items-center gap-8 max-w-lg w-full px-8 text-center"
      >
        {/* Shield icon */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M28 4L8 13V29C8 40.05 16.8 50.42 28 53C39.2 50.42 48 40.05 48 29V13L28 4Z"
              stroke="#D4A853"
              strokeWidth="1.5"
              fill="rgba(212,168,83,0.06)"
            />
            <path
              d="M20 28L25.5 33.5L36 23"
              stroke="#5C9A6B"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>

        {/* Status badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="font-mono text-xs text-[#5C9A6B] tracking-[0.35em] uppercase"
        >
          Payment Confirmed
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6 }}
          className="space-y-2"
        >
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Diagnostic Protocol <span className="text-[#D4A853]">Activated</span>
          </h1>
          {product && (
            <p className="font-mono text-xs text-[#B0A89E] tracking-[0.15em] uppercase">
              {product}
            </p>
          )}
        </motion.div>

        {/* Delivery info */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="border border-[#D4A853]/10 bg-[#D4A853]/[0.03] p-6 space-y-4 w-full"
        >
          {email && (
            <div className="space-y-1">
              <div className="font-mono text-xs text-[#7A6F65] tracking-[0.2em] uppercase">
                Delivery Inbox
              </div>
              <div className="font-mono text-xs text-[#F5F0EB] tracking-wide break-all">
                {email}
              </div>
            </div>
          )}

          <div className="border-t border-[#D4A853]/8 pt-4">
            <p className="font-mono text-sm text-[#B0A89E] leading-relaxed">
              You will receive your clinical diagnostic and Loom walkthrough within{" "}
              <span className="text-[#F5F0EB]">72 hours</span>. No meetings. No calls. Just the deliverable.
            </p>
          </div>
        </motion.div>

        {/* Protocol steps */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="grid grid-cols-3 gap-3 w-full"
        >
          {[
            { id: "01", label: "Scan Active" },
            { id: "02", label: "Report Compiling" },
            { id: "03", label: "Transmission Queued" },
          ].map((step) => (
            <div
              key={step.id}
              className="border border-[#D4A853]/5 px-3 py-2.5 text-center"
            >
              <div className="font-mono text-xs text-[#D4A853]/70 tracking-[0.2em] mb-1">{step.id}</div>
              <div className="font-mono text-xs text-[#B0A89E]">{step.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Return link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          <Link
            href="/"
            className="font-mono text-xs text-[#7A6F65] hover:text-[#B0A89E] transition-colors tracking-[0.2em] uppercase"
          >
            ← Return to Signal & Friction
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen bg-[#0A0908] flex items-center justify-center">
          <div className="font-mono text-xs text-[#7A6F65] tracking-[0.2em] uppercase flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853] animate-ping" />
            Loading...
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
