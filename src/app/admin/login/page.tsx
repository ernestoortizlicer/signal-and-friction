"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

/* ═══════════════════════════════════════════════════════════════════════════════
   VAULT — Admin Login
   Swiss vault meets SpaceX mission control. Clinical. Breathtaking.
   Palette: obsidian #0A0908 · gold #D4A853 · warm white #F5F0EB
   ═══════════════════════════════════════════════════════════════════════════════ */

const inputClass =
  "w-full bg-transparent border-b border-[#2A2520] px-0 py-3 text-sm text-[#F5F0EB] placeholder-[#3D3530] focus:outline-none focus:border-[#D4A853]/70 transition-colors duration-400 font-mono tracking-wide";


export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [shaking, setShaking] = useState(false);
  const router = useRouter();

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 450);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session) {
        document.cookie = `sf-admin-session=${data.session.access_token}; path=/; max-age=604800; SameSite=Lax; Secure`;
        setMessage({ type: "success", text: "Access granted. Entering Command Center…" });
        setTimeout(() => router.push("/admin/dashboard"), 900);
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Authentication failed." });
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setMessage({ type: "success", text: "Access token dispatched. Check your inbox." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to send magic link." });
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0A0908] text-[#F5F0EB] flex items-center justify-center p-6 relative overflow-hidden grain">

      {/* Diagnostic grid */}
      <div className="absolute inset-0 diagnostic-grid pointer-events-none opacity-40" />

      {/* Gold radial glow — center vault light */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(212,168,83,0.05),transparent)] pointer-events-none" />

      {/* Corner coordinates — mission-control aesthetic */}
      <div className="absolute top-4 left-5 font-mono text-xs text-[#2A2520] tracking-[0.2em] select-none">
        28.0°N · 55.2°E
      </div>
      <div className="absolute top-4 right-5 font-mono text-xs text-[#2A2520] tracking-[0.2em] select-none">
        S&amp;F · OPS
      </div>
      <div className="absolute bottom-4 right-5 font-mono text-xs text-[#D4A853]/20 tracking-[0.15em] select-none">
        PHASE 2
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[380px] relative"
      >
        {/* Vault card — sharp edges, glassmorphism */}
        <div className="border border-[#D4A853]/12 bg-[#0C0B09]/95 backdrop-blur-xl relative">

          {/* Terminal header bar */}
          <div className="border-b border-[#D4A853]/8 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-[6px] h-[6px] rounded-full bg-[#C85C5C]/50" />
                <div className="w-[6px] h-[6px] rounded-full bg-[#D4A853]/40" />
                <div className="w-[6px] h-[6px] rounded-full bg-[#5C9A6B]/35" />
              </div>
              <span className="font-mono text-xs text-[#3A3530] tracking-[0.2em] uppercase">
                Access Terminal
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#5C9A6B] animate-pulse" />
              <span className="font-mono text-xs text-[#5C5550] tracking-[0.15em] uppercase">
                Secure
              </span>
            </div>
          </div>

          <div className="px-8 pt-8 pb-6 space-y-7">

            {/* Vault identity */}
            <div className="text-center space-y-4">
              {/* Animated diamond logo */}
              <div className="flex justify-center group">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  {/* Outer slow-rotating hexagon */}
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 64 64"
                    fill="none"
                    className="absolute inset-0"
                    style={{ animation: "spin 25s linear infinite" }}
                  >
                    <polygon
                      points="32,2 58,17 58,47 32,62 6,47 6,17"
                      stroke="rgba(212,168,83,0.12)"
                      strokeWidth="0.5"
                      fill="none"
                    />
                  </svg>
                  {/* Inner counter-rotating hexagon */}
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 40 40"
                    fill="none"
                    className="absolute"
                    style={{ animation: "spin 18s linear infinite reverse" }}
                  >
                    <polygon
                      points="20,2 36,11 36,29 20,38 4,29 4,11"
                      stroke="rgba(212,168,83,0.20)"
                      strokeWidth="0.5"
                      fill="none"
                    />
                  </svg>
                  {/* Diamond center icon */}
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 22 22"
                    fill="none"
                    className="relative z-10 transition-transform duration-700 group-hover:rotate-45"
                  >
                    <path
                      d="M11 1L21 11L11 21L1 11Z"
                      stroke="#D4A853"
                      strokeWidth="1"
                      fill="none"
                      opacity="0.7"
                    />
                    <path
                      d="M11 5L17 11L11 17L5 11Z"
                      fill="#D4A853"
                      opacity="0.15"
                    />
                  </svg>
                  {/* Pulsing ring */}
                  <div
                    className="absolute inset-0 rounded-full border border-[#D4A853]/8 animate-ping"
                    style={{ animationDuration: "3s" }}
                  />
                </div>
              </div>

              {/* Title block */}
              <div className="space-y-1.5">
                <div className="font-mono text-xs text-[#5C5550] tracking-[0.3em] uppercase">
                  Signal &amp; Friction
                </div>
                <h1 className="font-serif text-[28px] font-bold text-[#F5F0EB] tracking-tight leading-none">
                  Command Center
                </h1>
                <p className="text-sm text-[#B0A89E] font-mono tracking-wide">
                  Authorized Personnel Only
                </p>
              </div>
            </div>

            {/* Mode toggle */}
            <div className="flex border border-[#D4A853]/10 font-mono text-xs tracking-[0.15em] uppercase">
              {(["password", "magic"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setMessage(null); }}
                  className={`flex-1 py-2.5 cursor-pointer transition-all duration-300 ${
                    mode === m
                      ? "bg-[#D4A853]/8 text-[#D4A853] border-b border-[#D4A853]/40"
                      : "text-[#5C5550] hover:text-[#9A8F82]"
                  }`}
                >
                  {m === "password" ? "Access Key" : "Magic Link"}
                </button>
              ))}
            </div>

            {/* Forms */}
            <AnimatePresence mode="wait">
              {mode === "password" ? (
                <motion.form
                  key="password-form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handlePasswordLogin}
                  className="space-y-5"
                >
                  <div>
                    <label className="block font-mono text-xs text-[#7A6F65] tracking-[0.25em] uppercase mb-1.5">
                      Operator Identity
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      placeholder="operator@signal-and-friction.com"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-xs text-[#7A6F65] tracking-[0.25em] uppercase mb-1.5">
                      Access Key
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                      placeholder="••••••••••••"
                    />
                  </div>
                  <button
                    type="submit"
                    id="login-submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-[#D4A853] text-[#0A0908] font-mono text-xs font-bold uppercase tracking-[0.25em] cursor-pointer disabled:opacity-40 transition-all duration-300 hover:bg-[#E4B96A] hover:shadow-[0_0_28px_rgba(212,168,83,0.25)] active:scale-[0.99]"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-[#0A0908] animate-ping" />
                        Verifying…
                      </span>
                    ) : (
                      "Authenticate"
                    )}
                  </button>
                </motion.form>
              ) : (
                <motion.form
                  key="magic-form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleMagicLinkLogin}
                  className="space-y-5"
                >
                  <div>
                    <label className="block font-mono text-xs text-[#7A6F65] tracking-[0.25em] uppercase mb-1.5">
                      Whitelisted Identity
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      placeholder="operator@signal-and-friction.com"
                    />
                  </div>
                  <button
                    type="submit"
                    id="magic-link-submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-[#D4A853] text-[#0A0908] font-mono text-xs font-bold uppercase tracking-[0.25em] cursor-pointer disabled:opacity-40 transition-all duration-300 hover:bg-[#E4B96A] hover:shadow-[0_0_28px_rgba(212,168,83,0.25)] active:scale-[0.99]"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-[#0A0908] animate-ping" />
                        Dispatching…
                      </span>
                    ) : (
                      "Dispatch Access Token"
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Message — with shake on error */}
            <AnimatePresence>
              {message && (
                <motion.div
                  key={message.type + message.text}
                  initial={{ opacity: 0 }}
                  animate={
                    message.type === "error" && shaking
                      ? { opacity: 1, x: [0, -6, 6, -6, 6, -3, 3, 0] }
                      : { opacity: 1, x: 0 }
                  }
                  transition={{ duration: 0.35 }}
                  exit={{ opacity: 0 }}
                  className={`py-2.5 px-3 border-l-2 font-mono text-xs tracking-wide leading-relaxed ${
                    message.type === "success"
                      ? "border-[#5C9A6B]/60 bg-[#5C9A6B]/5 text-[#5C9A6B]"
                      : "border-[#C85C5C]/60 bg-[#C85C5C]/5 text-[#C85C5C]"
                  }`}
                >
                  {message.type === "success" ? "●" : "⚠"} {message.text}
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Footer */}
          <div className="border-t border-[#D4A853]/6 px-5 py-3 text-center">
            <span className="font-mono text-xs text-[#3A3530] tracking-[0.2em] uppercase">
              Signal &amp; Friction · Classified Systems · Phase 2
            </span>
          </div>
        </div>

        {/* Below-card ghost label */}
        <div className="text-center mt-4 font-mono text-xs text-[#2A2520] tracking-[0.15em] uppercase">
          v3 · Command Center OS
        </div>
      </motion.div>
    </main>
  );
}
