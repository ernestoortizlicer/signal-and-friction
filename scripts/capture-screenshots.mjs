import puppeteer from "puppeteer";
import { mkdirSync } from "fs";
import { join } from "path";

const BASE_URL = process.argv[2] || "https://29937c47.signal-and-friction.pages.dev";
const OUT_DIR = "/Users/ernestoortiz/Downloads/Claude/signal-and-friction-app/screenshots";

try { mkdirSync(OUT_DIR, { recursive: true }); } catch {}

const PUBLIC_ROUTES = [
  { path: "/", name: "landing" },
  { path: "/sg", name: "singapore" },
  { path: "/certified", name: "certified" },
  { path: "/confirmed?email=demo@signal-and-friction.com&segment=high_ticket", name: "confirmed-dfy" },
  { path: "/confirmed?email=demo@signal-and-friction.com&segment=microdosing", name: "confirmed-dwy" },
  { path: "/confirmed/success?email=demo@signal-and-friction.com&product=DFY+Beta+Diagnostic", name: "success-page" },
  { path: "/portfolio", name: "portfolio" },
  { path: "/legal/guarantee", name: "legal-guarantee" },
  { path: "/admin/login", name: "admin-login" },
];

async function captureAll() {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true
  });

  const results = [];

  for (const route of PUBLIC_ROUTES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    try {
      await page.goto(`${BASE_URL}${route.path}`, {
        waitUntil: "networkidle0",
        timeout: 30000
      });
      await new Promise(r => setTimeout(r, 1800));

      const desktop = join(OUT_DIR, `${route.name}-desktop.png`);
      await page.screenshot({ path: desktop, fullPage: true });

      await page.setViewport({ width: 375, height: 812 });
      await new Promise(r => setTimeout(r, 600));
      const mobile = join(OUT_DIR, `${route.name}-mobile.png`);
      await page.screenshot({ path: mobile, fullPage: true });

      results.push({ route: route.path, name: route.name, status: "OK", desktop, mobile });
      console.log(`✅ ${route.name} → captured`);
    } catch (err) {
      results.push({ route: route.path, name: route.name, status: "ERROR", error: err.message });
      console.log(`❌ ${route.name} → ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();

  console.log("\n=== SCREENSHOT AUDIT RESULTS ===");
  const ok = results.filter(r => r.status === "OK").length;
  const fail = results.filter(r => r.status === "ERROR").length;
  console.log(`Total: ${results.length} routes | ✅ ${ok} OK | ❌ ${fail} errors`);
  results.forEach(r => {
    if (r.status === "OK") {
      console.log(`  ✅ ${r.name}`);
    } else {
      console.log(`  ❌ ${r.name}: ${r.error}`);
    }
  });

  return results;
}

captureAll().catch(console.error);
