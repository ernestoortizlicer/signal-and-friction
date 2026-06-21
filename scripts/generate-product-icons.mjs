/**
 * generate-product-icons.mjs
 * Generates 512x512 PNG icons for all 12 S&F products using Puppeteer.
 * Output: public/product-icons/
 * Usage: node scripts/generate-product-icons.mjs
 */

import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../public/product-icons");

fs.mkdirSync(OUT_DIR, { recursive: true });

const PRODUCTS = [
  { slug: "dfy-beta-diagnostic",  name: "Beta Diagnostic",  tier: "DFY", price: "$2,000",    color: "#7C3AED", icon: "◈" },
  { slug: "dfy-intervention",     name: "Intervention",     tier: "DFY", price: "$3,000",    color: "#7C3AED", icon: "⟁" },
  { slug: "dfy-monitoring",       name: "Monitoring",       tier: "DFY", price: "$2,500/mo", color: "#7C3AED", icon: "⊙" },
  { slug: "dfy-expansion",        name: "Expansion",        tier: "DFY", price: "$2,000",    color: "#7C3AED", icon: "⊞" },
  { slug: "dfy-autonomy-kit",     name: "Autonomy Kit",     tier: "DFY", price: "$5,000",    color: "#7C3AED", icon: "⬡" },
  { slug: "dwy-beta-diagnostic",  name: "Beta Diagnostic",  tier: "DWY", price: "$350",      color: "#0EA5E9", icon: "◈" },
  { slug: "dwy-intervention",     name: "Intervention",     tier: "DWY", price: "$750",      color: "#0EA5E9", icon: "⟁" },
  { slug: "dwy-monitoring",       name: "Monitoring",       tier: "DWY", price: "$500/mo",   color: "#0EA5E9", icon: "⊙" },
  { slug: "dwy-expansion",        name: "Expansion",        tier: "DWY", price: "$350",      color: "#0EA5E9", icon: "⊞" },
  { slug: "dwy-autonomy-kit",     name: "Autonomy Kit",     tier: "DWY", price: "$1,500",    color: "#0EA5E9", icon: "⬡" },
  { slug: "certified-practitioner", name: "Practitioner",   tier: "CERTIFIED", price: "$4,500/yr", color: "#F59E0B", icon: "✦" },
  { slug: "certified-agency",     name: "Agency",           tier: "CERTIFIED", price: "$4,500/yr", color: "#F59E0B", icon: "✦✦" },
];

function buildHTML(p) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 512px; height: 512px; overflow: hidden;
    background: #080808;
    font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    position: relative;
  }
  .grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 32px 32px;
  }
  .glow {
    position: absolute;
    width: 280px; height: 280px;
    border-radius: 50%;
    background: radial-gradient(circle, ${p.color}22 0%, transparent 70%);
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    filter: blur(40px);
  }
  .content {
    position: relative; z-index: 2;
    display: flex; flex-direction: column; align-items: center; gap: 16px;
    padding: 48px;
  }
  .badge {
    font-size: 11px; font-weight: 700; letter-spacing: 0.18em;
    color: ${p.color};
    border: 1px solid ${p.color}55;
    padding: 4px 12px; border-radius: 100px;
    background: ${p.color}12;
  }
  .icon {
    font-size: 80px; line-height: 1;
    color: #ffffff;
    filter: drop-shadow(0 0 24px ${p.color}88);
  }
  .name {
    font-size: 22px; font-weight: 600;
    color: #ffffff; letter-spacing: -0.02em;
    text-align: center;
  }
  .divider {
    width: 40px; height: 1px;
    background: linear-gradient(90deg, transparent, ${p.color}, transparent);
  }
  .price {
    font-size: 14px; font-weight: 500;
    color: #888; letter-spacing: 0.04em;
  }
  .sf {
    position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
    font-size: 10px; letter-spacing: 0.2em; color: #333; text-transform: uppercase;
    font-weight: 600;
  }
</style>
</head>
<body>
  <div class="grid"></div>
  <div class="glow"></div>
  <div class="content">
    <div class="badge">${p.tier}</div>
    <div class="icon">${p.icon}</div>
    <div class="name">${p.name}</div>
    <div class="divider"></div>
    <div class="price">${p.price}</div>
  </div>
  <div class="sf">Signal &amp; Friction</div>
</body>
</html>`;
}

async function run() {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 512, height: 512, deviceScaleFactor: 2 });

  for (const product of PRODUCTS) {
    const html = buildHTML(product);
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const outPath = path.join(OUT_DIR, `${product.slug}.png`);
    await page.screenshot({ path: outPath, type: "png" });
    console.log(`✅  ${product.tier} ${product.name} → product-icons/${product.slug}.png`);
  }

  await browser.close();
  console.log(`\n✓ 12 product icons generated in public/product-icons/`);
}

run().catch(err => { console.error(err); process.exit(1); });
