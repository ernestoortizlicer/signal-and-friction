"use client";

import Link from "next/link";

export default function CertifiedTemplate() {
  return (
    <main className="min-h-full p-8 text-text-primary">
      <div className="mx-auto max-w-3xl space-y-5">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Archived · non-gating</p>
        <h1 className="font-serif text-4xl font-bold">S&amp;F Certified</h1>
        <p className="text-text-body">This commercial certification surface is inactive. Learning OS and Diagnostic Calibration remain the readiness authority.</p>
        <Link href="/admin/learning" className="font-mono text-xs text-accent hover:underline">Open Learning OS →</Link>
      </div>
    </main>
  );
}
