import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const alt = "Signal & Friction — Evidence-Ranked Behavioral Diagnostic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

const GOLD = "#D4A853";
const BG = "#0A0908";
const TEXT = "#F5F0EB";
const MUTED = "#B0A89E";

export default async function Image() {
  const [newsreaderBold, jetbrainsMonoSemiBold, interSemiBold] = await Promise.all([
    readFile(path.join(process.cwd(), "src/app/_og-fonts/Newsreader-Bold.woff")),
    readFile(path.join(process.cwd(), "src/app/_og-fonts/JetBrainsMono-SemiBold.woff")),
    readFile(path.join(process.cwd(), "src/app/_og-fonts/Inter-SemiBold.woff")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          backgroundColor: BG,
          backgroundImage: "linear-gradient(145deg, #14110D 0%, #0A0908 62%, #0A0908 100%)",
          padding: "76px 82px",
          color: TEXT,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 26,
            display: "flex",
            border: "1px solid rgba(212,168,83,0.16)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -90,
            top: -90,
            width: 470,
            height: 470,
            borderRadius: 470,
            display: "flex",
            border: "1px solid rgba(212,168,83,0.16)",
            boxShadow: "0 0 0 58px rgba(212,168,83,0.025), 0 0 0 118px rgba(212,168,83,0.018)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 18,
                height: 18,
                display: "flex",
                transform: "rotate(45deg)",
                border: `2px solid ${GOLD}`,
              }}
            />
            <div
              style={{
                display: "flex",
                fontFamily: "JetBrains Mono",
                fontSize: 22,
                letterSpacing: 6,
                color: GOLD,
                textTransform: "uppercase",
              }}
            >
              Signal &amp; Friction
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", maxWidth: 850 }}>
            <div
              style={{
                display: "flex",
                fontFamily: "Newsreader",
                fontSize: 78,
                lineHeight: 1.02,
                letterSpacing: -1,
              }}
            >
              Behavioral diagnosis that shows its evidence.
            </div>
            <div
              style={{
                display: "flex",
                width: 560,
                height: 2,
                backgroundColor: GOLD,
                opacity: 0.55,
                marginTop: 28,
                marginBottom: 26,
              }}
            />
            <div
              style={{
                display: "flex",
                fontFamily: "Inter",
                fontSize: 29,
                color: MUTED,
                lineHeight: 1.35,
              }}
            >
              Measured signals. Explicit hypotheses. Uncertainty. If the evidence is insufficient, we say so.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontFamily: "JetBrains Mono",
              fontSize: 19,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: MUTED,
            }}
          >
            <span>72h async delivery</span>
            <span style={{ color: GOLD }}>signal-and-friction.com</span>
          </div>
        </div>
      </div>
    ),
    {
      width: size.width,
      height: size.height,
      fonts: [
        { name: "Newsreader", data: newsreaderBold, weight: 700, style: "normal" },
        { name: "JetBrains Mono", data: jetbrainsMonoSemiBold, weight: 600, style: "normal" },
        { name: "Inter", data: interSemiBold, weight: 600, style: "normal" },
      ],
    },
  );
}
