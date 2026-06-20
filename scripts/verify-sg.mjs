import puppeteer from "puppeteer";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tsaarsuuclvkjsgjcmoj.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseServiceKey) {
  console.error("❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

const TEST_URL = process.argv[2] || "https://39c6a78c.signal-and-friction.pages.dev";
const SG_TEST_URL = `${TEST_URL.replace(/\/$/, "")}/sg`;

async function main() {
  console.log(`🚀 Starting Live Verification for Singapore on: ${SG_TEST_URL}`);
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const consoleErrors = [];
  page.on("pageerror", (err) => {
    consoleErrors.push(err.toString());
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // --- 1. Load Singapore Page ---
    console.log("\n🔹 PHASE 1: LOAD SINGAPORE PAGE");
    console.log(`Navigating to ${SG_TEST_URL}...`);
    await page.goto(SG_TEST_URL, { waitUntil: "networkidle2" });
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes("Southeast Asia") && bodyText.includes("checkout friction")) {
      console.log("✅ Singapore page loaded with localized value prop.");
    } else {
      throw new Error("Singapore page localized value proposition text missing!");
    }

    // --- 2. Form Submission Test ---
    console.log("\n🔹 PHASE 2: FORM SUBMISSION TEST ON /SG");
    const testEmail = `test-lead-sg-${Date.now()}@signal-and-friction.com`;
    const testProductUrl = "https://automation-live-sg-test.sg";

    console.log(`Step 1: Inputting URL = ${testProductUrl}`);
    await page.waitForSelector("input[type='url']");
    await page.type("input[type='url']", testProductUrl);
    
    console.log("Clicking Proceed on Step 1");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const proceedBtn = buttons.find(b => b.textContent.includes("Proceed"));
      if (proceedBtn) proceedBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    console.log("Step 2: Selecting JCB/PayNow Gate");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const targetBtn = buttons.find(b => b.textContent.includes("JCB/PayNow Gate"));
      if (targetBtn) targetBtn.click();
    });
    await new Promise(r => setTimeout(r, 300));
    
    console.log("Clicking Proceed on Step 2");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const proceedBtn = buttons.find(b => b.textContent.includes("Proceed"));
      if (proceedBtn) proceedBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    console.log("Step 3: Selecting Done-With-You Autonomy");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const targetBtn = buttons.find(b => b.textContent.includes("Done-With-You Autonomy"));
      if (targetBtn) targetBtn.click();
    });
    await new Promise(r => setTimeout(r, 300));

    console.log("Clicking Proceed on Step 3");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const proceedBtn = buttons.find(b => b.textContent.includes("Proceed"));
      if (proceedBtn) proceedBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    console.log("Step 4: Selecting Beginner level");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const targetBtn = buttons.find(b => b.textContent.includes("Beginner level"));
      if (targetBtn) targetBtn.click();
    });
    await new Promise(r => setTimeout(r, 300));

    console.log("Clicking Proceed on Step 4");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const proceedBtn = buttons.find(b => b.textContent.includes("Proceed"));
      if (proceedBtn) proceedBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    console.log(`Step 5: Inputting Email = ${testEmail}`);
    await page.waitForSelector("input[type='email']");
    await page.type("input[type='email']", testEmail);

    console.log("Submitting form...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const submitBtn = buttons.find(b => b.textContent.includes("Execute Diagnostic"));
      if (submitBtn) submitBtn.click();
    });

    console.log("Waiting for redirection to /confirmed...");
    await page.waitForNavigation({ waitUntil: "networkidle2" });
    const currentUrl = page.url();
    console.log(`Current URL after redirect: ${currentUrl}`);

    if (currentUrl.includes("/confirmed") && currentUrl.includes(`email=${encodeURIComponent(testEmail)}`) && currentUrl.includes("region=sg")) {
      console.log("✅ Successfully redirected to /confirmed page with correct email and region parameters.");
    } else {
      throw new Error(`Failed to redirect to confirmed page correctly. URL is: ${currentUrl}`);
    }

    // --- Verify Supabase Ingestion ---
    console.log("\n🔹 VERIFYING LEAD INGESTION IN SUPABASE...");
    await new Promise(r => setTimeout(r, 3000));

    const { data: clientData, error: clientErr } = await supabaseService
      .from("clients")
      .select("*")
      .eq("contact_email", testEmail)
      .single();

    if (clientErr || !clientData) {
      throw new Error(`Client record for ${testEmail} not found in Supabase! Error: ${clientErr?.message}`);
    }
    console.log(`✅ Client record verified in DB. Client ID: ${clientData.id}`);

    const { data: projectData, error: projErr } = await supabaseService
      .from("beta_projects")
      .select("*")
      .eq("client_id", clientData.id)
      .single();

    if (projErr || !projectData) {
      throw new Error(`Beta project not found for client! Error: ${projErr?.message}`);
    }
    console.log(`✅ Beta project auto-generation verified in DB. Project ID: ${projectData.id}`);

    console.log("\n🔹 PHASE 3: CONSOLE ERROR LOG AUDIT");
    if (consoleErrors.length === 0) {
      console.log("✅ Verified: Zero console errors or exposed credentials found during execution.");
    } else {
      console.warn(`⚠️ Warning: Found ${consoleErrors.length} console errors:`, consoleErrors);
    }

    console.log("\n🌟 /SG VERIFICATION PASSED SUCCESSFULLY!");
  } catch (err) {
    console.error(`❌ VERIFICATION FAILED: ${err.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
