import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

// Global OG/social-card image — applies to every route that doesn't define
// its own opengraph-image (currently: home, /pricing, /sg, /portfolio,
// /confirmed). /certified and /scan keep their own separate metadata and are
// untouched by this file.
export const alt = "Signal & Friction — One friction. One decision.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Required for output: "export" (static export) — without this, Next tries
// to treat opengraph-image as a dynamic route handler, which static export
// can't produce, and the build fails at the page-data-collection step.
export const dynamic = "force-static";

// next/og's ImageResponse (Satori) has no access to system or Google fonts —
// text renders in a generic fallback unless the actual font bytes are passed
// in explicitly. Fetched once from Google Fonts (Newsreader Bold, JetBrains
// Mono SemiBold — the same two families the real site uses) and committed
// under src/app/_og-fonts/ rather than fetched over the network at build
// time, so a build never depends on Google's CDN being reachable.
export default async function Image() {
  const [newsreaderBold, jetbrainsMonoSemiBold] = await Promise.all([
    readFile(path.join(process.cwd(), "src/app/_og-fonts/Newsreader-Bold.woff")),
    readFile(path.join(process.cwd(), "src/app/_og-fonts/JetBrainsMono-SemiBold.woff")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "100px",
          backgroundColor: "#0A0908",
          backgroundImage: "linear-gradient(155deg, #110F0D 0%, #0A0908 60%)",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "JetBrains Mono",
            fontSize: 26,
            letterSpacing: 10,
            color: "#D4A853",
            textTransform: "uppercase",
            marginBottom: 48,
          }}
        >
          Signal &amp; Friction
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontFamily: "Newsreader",
            fontSize: 78,
            lineHeight: 1.18,
            color: "#F5F0EB",
          }}
        >
          <span style={{ display: "flex" }}>One friction.</span>
          <span style={{ display: "flex", color: "#D4A853" }}>One decision.</span>
        </div>
        <div
          style={{
            display: "flex",
            width: 140,
            height: 2,
            backgroundColor: "#D4A853",
            opacity: 0.4,
            marginTop: 56,
          }}
        />
      </div>
    ),
    {
      width: size.width,
      height: size.height,
      fonts: [
        { name: "Newsreader", data: newsreaderBold, weight: 700, style: "normal" },
        { name: "JetBrains Mono", data: jetbrainsMonoSemiBold, weight: 600, style: "normal" },
      ],
    }
  );
}
