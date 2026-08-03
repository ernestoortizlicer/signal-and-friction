import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

// Global OG/social-card image — applies to every route that doesn't define
// its own opengraph-image (currently: home, /pricing, /sg, /portfolio,
// /confirmed). /certified and /scan keep their own separate metadata and are
// untouched by this file.
//
// Composition replicates the approved LinkedIn cover reference (banner2.png,
// supplied 2026-08-02) — NOT a rasterized screenshot of it. The decorative
// elements (grid, corner brackets, sonar/target rings, connecting signal
// line) are generated as a real SVG string below and embedded via a data-URI
// <img>, since Satori (next/og's renderer) has very limited native support
// for circles/curves through plain flexbox divs. All text stays as real
// Satori text nodes using the embedded fonts, not part of that SVG — keeps
// it crisp and lets each line use its real font/weight/color independently.
// Phase 6.1 — "Cognitive Conversion Diagnostics" named only one of the
// six canonical friction mechanisms (cognitive load) as if it were the
// whole category; trust deficit, commitment anxiety, ordering error,
// identity friction, and value uncertainty aren't "cognitive" at all.
// "Applied Behavioral Diagnostics" is the actual category name (Founding
// Constitution, Part I) and is now consistent with the homepage eyebrow
// and root <title> fixed in the same pass.
export const alt = "Signal & Friction — Applied Behavioral Diagnostics";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Required for output: "export" (static export) — without this, Next treats
// opengraph-image as a dynamic route handler, which static export can't
// produce, and the build fails at the page-data-collection step.
export const dynamic = "force-static";

const GOLD = "#D4A853";

function buildBackgroundSvg(): string {
  const W = 1200;
  const H = 630;
  const gridLines: string[] = [];
  for (let x = 0; x <= W; x += 48) {
    gridLines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${GOLD}" stroke-opacity="0.035" stroke-width="1"/>`);
  }
  for (let y = 0; y <= H; y += 48) {
    gridLines.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${GOLD}" stroke-opacity="0.035" stroke-width="1"/>`);
  }

  const bracket = (x: number, y: number, dx: number, dy: number) =>
    `<path d="M ${x} ${y + dy} L ${x} ${y} L ${x + dx} ${y}" stroke="${GOLD}" stroke-opacity="0.3" stroke-width="1.5" fill="none"/>`;
  const corners = [
    bracket(24, 24, 26, 26),
    bracket(W - 24, 24, -26, 26),
    bracket(24, H - 24, 26, -26),
    bracket(W - 24, H - 24, -26, -26),
  ].join("");

  // Sonar / target — concentric rings + crosshair, right-of-center, bleeding
  // off the right edge as in the reference.
  const cx = 1010;
  const cy = 330;
  const radii = [28, 62, 100, 145, 195];
  const rings = radii
    .map((r, i) => `<circle cx="${cx}" cy="${cy}" r="${r}" stroke="${GOLD}" stroke-opacity="${0.5 - i * 0.08}" stroke-width="1.25" fill="none"/>`)
    .join("");
  const crosshair = `
    <line x1="${cx}" y1="0" x2="${cx}" y2="${H}" stroke="${GOLD}" stroke-opacity="0.22" stroke-width="1"/>
    <line x1="${cx - 210}" y1="${cy}" x2="${W}" y2="${cy}" stroke="${GOLD}" stroke-opacity="0.22" stroke-width="1"/>
  `;
  const centerDot = `<circle cx="${cx}" cy="${cy}" r="7" fill="${GOLD}"/>`;

  // Signal line connecting the underline rule into the sonar target — a
  // gentle wave with a few dots of increasing size, same visual idea as the
  // reference's "transmission" line.
  const waveStart = { x: 660, y: cy + 118 };
  const wavePath = `M ${waveStart.x} ${waveStart.y} C ${waveStart.x + 60} ${waveStart.y + 10}, ${waveStart.x + 90} ${waveStart.y - 30}, ${waveStart.x + 150} ${cy}`;
  const dots = [0.25, 0.45, 0.65, 0.85].map((t, i) => {
    const dx = waveStart.x + (cx - 210 - waveStart.x) * t;
    const dy = waveStart.y - (waveStart.y - cy) * t;
    return `<circle cx="${dx}" cy="${dy}" r="${2 + i * 1.3}" fill="${GOLD}" fill-opacity="0.75"/>`;
  }).join("");
  const signalLine = `<path d="${wavePath}" stroke="${GOLD}" stroke-opacity="0.5" stroke-width="1.25" fill="none"/>${dots}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${gridLines.join("")}
    ${corners}
    ${crosshair}
    ${rings}
    ${signalLine}
    ${centerDot}
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export default async function Image() {
  const [newsreaderBold, jetbrainsMonoSemiBold, interSemiBold] = await Promise.all([
    readFile(path.join(process.cwd(), "src/app/_og-fonts/Newsreader-Bold.woff")),
    readFile(path.join(process.cwd(), "src/app/_og-fonts/JetBrainsMono-SemiBold.woff")),
    readFile(path.join(process.cwd(), "src/app/_og-fonts/Inter-SemiBold.woff")),
  ]);

  const backgroundSvg = buildBackgroundSvg();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: "#0A0908",
          backgroundImage: "linear-gradient(155deg, #110F0D 0%, #0A0908 65%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={backgroundSvg}
          width={size.width}
          height={size.height}
          style={{ position: "absolute", top: 0, left: 0 }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "80px",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "JetBrains Mono",
              fontSize: 22,
              letterSpacing: 6,
              color: GOLD,
              textTransform: "uppercase",
              marginBottom: 26,
            }}
          >
            Applied Behavioral Diagnostics
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Newsreader",
              fontSize: 92,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: "#F5F0EB",
            }}
          >
            SIGNAL&nbsp;<span style={{ color: GOLD }}>&amp;</span>&nbsp;FRICTION
          </div>
          <div
            style={{
              display: "flex",
              width: 600,
              height: 2,
              backgroundColor: GOLD,
              opacity: 0.6,
              marginTop: 22,
              marginBottom: 34,
            }}
          />
          <div
            style={{
              display: "flex",
              fontFamily: "Inter",
              fontSize: 34,
              color: "#F5F0EB",
              marginBottom: 12,
            }}
          >
            <span style={{ color: GOLD }}>One</span>&nbsp;friction.&nbsp;
            <span style={{ color: GOLD }}>One</span>&nbsp;fix.&nbsp;72h async.
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Inter",
              fontSize: 30,
              color: "#B0A89E",
            }}
          >
            Measured, modeled, or marked unknown.
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
    }
  );
}
