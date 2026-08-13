"use client";

import { useState } from "react";
import { compressVisualScreenshot } from "./image-utils";
import type { VisualImage } from "./types";

export default function ScreenshotPicker({
  label,
  image,
  onImage,
  disabled = false,
}: {
  label: string;
  image: VisualImage | null;
  onImage: (image: VisualImage) => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="border border-[#D4A853]/12 rounded-xl overflow-hidden bg-[#0A0908]/40">
      <div className="p-3 flex items-center justify-between gap-3 border-b border-[#D4A853]/10">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#D4A853]">
          Screenshot {label}
        </span>
        <label className={`font-mono text-[10px] uppercase tracking-wider border border-[#D4A853]/25 px-2.5 py-1 rounded ${disabled || busy ? "opacity-40 cursor-not-allowed" : "cursor-pointer text-[#D4A853]"}`}>
          {busy ? "Compressing…" : image ? "Replace" : "Upload"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={disabled || busy}
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setBusy(true);
              setError(null);
              try {
                onImage(await compressVisualScreenshot(file));
              } catch (err) {
                setError(err instanceof Error ? err.message : "Screenshot failed.");
              } finally {
                setBusy(false);
                event.target.value = "";
              }
            }}
          />
        </label>
      </div>

      {image ? (
        <div className="bg-black/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.dataUrl} alt={`Training screenshot ${label}`} className="w-full max-h-[560px] object-contain" />
          <div className="px-3 py-2 font-mono text-[9px] text-[#7A6F65]">
            {image.width}×{image.height} · {image.fingerprint.slice(0, 12)}… · raw image not persisted
          </div>
        </div>
      ) : (
        <div className="min-h-48 grid place-items-center text-xs text-[#7A6F65] p-6 text-center">
          Capture the real interface in your browser, then upload the screenshot here.
        </div>
      )}

      {error && <p className="px-3 pb-3 text-[10px] text-[#C85C5C]">{error}</p>}
    </div>
  );
}
