import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEADS_DIR = path.resolve(__dirname, '../../db/leads');
const DELIVERABLES_DIR = path.resolve(__dirname, '../public/deliverables');

// Command-line arguments helper
function getArgs() {
  const args = {};
  process.argv.slice(2).forEach((val) => {
    if (val.startsWith('--')) {
      const parts = val.substring(2).split('=');
      args[parts[0]] = parts.slice(1).join('=') || true;
    }
  });
  return args;
}

const args = getArgs();
const companyName = args.name;
const companyUrl = args.url;
const testMode = args.test;

// Main Execution
async function main() {
  // Ensure target directories exist
  await fs.mkdir(LEADS_DIR, { recursive: true });
  await fs.mkdir(DELIVERABLES_DIR, { recursive: true });

  if (testMode) {
    console.log('🧪 Running in Test Mode...');
    await generateMockFiles('TestSaaS', 'https://testsaas.io', 'Cognitive Load');
    console.log('✅ Test run complete. Generated mock diagnostic.');
    process.exit(0);
  }

  if (!companyName || !companyUrl) {
    console.error('❌ Error: Missing arguments.');
    console.log('Usage: node scripts/generate-diagnostic.mjs --name="Acme" --url="https://acme.com"');
    process.exit(1);
  }

  const clientKey = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  console.log(`🔎 Auditing ${companyName} (${companyUrl})...`);

  let scrapedText = '';
  let browser;
  try {
    console.log('🌐 Launching headless browser to extract landing page details...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Go to the main landing page
    await page.goto(companyUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Scrape structural content
    scrapedText = await page.evaluate(() => {
      const title = document.title;
      const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
      
      // Get all headers
      const headers = Array.from(document.querySelectorAll('h1, h2, h3'))
        .map(h => h.innerText.trim())
        .filter(t => t.length > 0)
        .slice(0, 15)
        .join(' | ');

      // Get some CTA text
      const ctas = Array.from(document.querySelectorAll('a, button'))
        .map(el => el.innerText.trim())
        .filter(t => t.length > 3 && t.length < 30)
        .slice(0, 10)
        .join(' , ');

      return `Title: ${title}\nDescription: ${metaDesc}\nHeaders: ${headers}\nCTAs: ${ctas}`;
    });

    console.log('✓ Scraped landing page structure.');
  } catch (err) {
    console.warn('⚠️ Warning: Puppeteer scraping failed. Falling back to basic web details.', err.message);
    scrapedText = `Company Name: ${companyName}\nURL: ${companyUrl}`;
  } finally {
    if (browser) await browser.close();
  }

  // LLM Query Section
  console.log('🧠 Formulating diagnostic audit via AI model...');
  const apiKeyGemini = process.env.GEMINI_API_KEY;
  const apiKeyAnthropic = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKeyGemini && !apiKeyAnthropic) {
    console.log('⚠️ No GEMINI_API_KEY or ANTHROPIC_API_KEY found in environment.');
    console.log('🤖 Generating diagnostic audit using local heuristic mock...');
    await generateMockFiles(companyName, companyUrl, 'Cognitive Load', clientKey);
    console.log('✅ Diagnostic files successfully written via heuristics.');
    process.exit(0);
  }

  let prompt = `
  You are the Chief Product Surgeon at "Signal & Friction", a premium B2B SaaS growth consultancy. 
  You write B2B SaaS diagnostics with McKinsey-level clinical precision. No emojis, no introductory fluff, no exclamation marks.
  
  Analyze the following landing page data scraped from the company "${companyName}" (${companyUrl}):
  ---
  ${scrapedText}
  ---

  Determine the dominant cognitive friction mechanism blocking their funnel from these 6 categories:
  1. Cognitive Load (Choice overload, too many inputs/choices on screen)
  2. Trust Deficit (Demanding sensitive keys/credit cards/creds before demonstrating value)
  3. Commitment Anxiety (Forcing high-effort setups or migrations too early)
  4. Ordering Error (Securing team setup or paying before seeing dashboard utility)
  5. Identity Friction (Treating developers and non-technical founders with the same onboarding flow)
  6. Value Uncertainty (Vague landing page value metrics, buyer cannot construct economic ROI)

  Provide a JSON payload containing exactly two objects.
  
  First object: "lead" (represents CRM leads info)
  - industry: Estimated SaaS category (e.g. Developer Tools, Marketing Automation)
  - problemStatement: 2-3 sentences estimating where users bounce (e.g., during registration form or setup wizard)
  - signupToPricing: Estimate metric (e.g. "60% retention")
  - pricingToCheckout: Estimate metric (e.g. "12% retention")
  - checkoutToPaid: Estimate metric (e.g. "85% retention")
  - currentHypothesis: 1-sentence growth hypothesis
  - notes: Draft 3 ready-to-send outreach message pitches in English (no emojis, no Spanish, high-status, async-first CTA):
    Pitch A (Observation-led): Pitch containing a direct observation of the friction.
    Pitch B (Value-led): Pitch detailing the exact mechanism.
    Pitch C (Follow-up): Direct link check-in.
    Concatenate these three pitches cleanly in a text string.
    
  Second object: "deliverable" (represents Client Diagnostic Brief portal data)
  - clientName: "${companyName}"
  - date: Current date in format "June 17, 2026"
  - loomUrl: ""
  - diagnosis:
    - signal: A detailed 2-sentence clinical review of the funnel leaks.
    - friction:
      - mechanism: Mapped to exactly one of the 6 mechanisms listed above.
      - rootCause: 2-3 sentences detailing the psychological mechanism of the barrier.
    - decisions: Exactly 3 strategic options:
      - Option A (Type: "A — Conservative"): Snappy title, Action, Reasoning, and Trade-off.
      - Option B (Type: "B — Aggressive"): Snappy title, Action, Reasoning, and Trade-off.
      - Option C (Type: "C — Lateral"): Snappy title, Action, Reasoning, and Trade-off.

  Output ONLY the raw JSON string with no markdown code blocks, no backticks, no text wrappers.
  `;

  let jsonResult = '';
  try {
    if (apiKeyGemini) {
      console.log('🤖 Querying Gemini API...');
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKeyGemini}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });
      const resData = await response.json();
      jsonResult = resData.candidates[0].content.parts[0].text;
    } else if (apiKeyAnthropic) {
      console.log('🤖 Querying Anthropic Claude API...');
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKeyAnthropic,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2500,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const resData = await response.json();
      jsonResult = resData.content[0].text;
    }

    // Clean JSON result from any LLM wrappers
    jsonResult = jsonResult.trim();
    if (jsonResult.startsWith('```json')) {
      jsonResult = jsonResult.substring(7);
    }
    if (jsonResult.endsWith('```')) {
      jsonResult = jsonResult.substring(0, jsonResult.length - 3);
    }
    jsonResult = jsonResult.trim();

    const resultData = JSON.parse(jsonResult);
    
    // Save lead JSON
    const leadData = {
      id: `lead-${clientKey}`,
      companyName,
      contact: "Founder / Head of Product",
      industry: resultData.lead.industry || 'B2B SaaS',
      status: 'sniper',
      platform: 'linkedin',
      intakeData: {
        problemStatement: resultData.lead.problemStatement || '',
        funnelMetrics: {
          signupToPricing: resultData.lead.signupToPricing || '60% retention',
          pricingToCheckout: resultData.lead.pricingToCheckout || '10% retention',
          checkoutToPaid: resultData.lead.checkoutToPaid || '88% retention'
        },
        currentHypothesis: resultData.lead.currentHypothesis || '',
        monthlyRevenue: '$20k MRR'
      },
      submittedAt: new Date().toISOString(),
      notes: resultData.lead.notes || ''
    };
    
    // Save deliverable JSON
    const deliverableData = {
      clientKey,
      clientName: companyName,
      date: resultData.deliverable.date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      consultant: 'Signal & Friction',
      loomUrl: '',
      diagnosis: resultData.deliverable.diagnosis
    };

    await fs.writeFile(path.join(LEADS_DIR, `${clientKey}.json`), JSON.stringify(leadData, null, 2));
    await fs.writeFile(path.join(DELIVERABLES_DIR, `${clientKey}.json`), JSON.stringify(deliverableData, null, 2));

    console.log(`\n✅ Successfully generated conversion diagnostic for ${companyName}!`);
    console.log(`📁 Lead written to: db/leads/${clientKey}.json`);
    console.log(`📁 Deliverable portal data written to: public/deliverables/${clientKey}.json`);

  } catch (err) {
    console.error('❌ Error executing AI analysis:', err);
    console.log('🤖 Falling back to mock generator...');
    await generateMockFiles(companyName, companyUrl, 'Value Uncertainty', clientKey);
  }
}

// Helper to write mock structures if no APIs exist or errors occur
async function generateMockFiles(name, url, mechanism, clientKeyOverride) {
  const clientKey = clientKeyOverride || name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  const leadData = {
    id: `lead-${clientKey}`,
    companyName: name,
    contact: "Founder",
    industry: "B2B SaaS",
    status: "sniper",
    platform: "linkedin",
    intakeData: {
      problemStatement: `High signups, but low user conversion at the primary pricing wall due to high choice friction.`,
      funnelMetrics: {
        signupToPricing: "65% retention",
        pricingToCheckout: "11% retention",
        checkoutToPaid: "90% retention"
      },
      currentHypothesis: `The choice complexity on the checkout flow triggers a ${mechanism} bottleneck.`,
      monthlyRevenue: "$25k MRR"
    },
    submittedAt: new Date().toISOString(),
    notes: `Pitch A (Observation-led): Hey, noticed you are scaling ${name}. Mapped your signup flow and isolated a clear ${mechanism} leak on the registration wall. Let me know if you want me to drop a 2-line visual mockup fix in chat, no strings.
Pitch B (Value-led): Hey, reviewed ${name}'s onboarding setup. Asking for credentials before showing visual utility triggers Trust Deficit. Restructuring inputs into progressive steps removes the drop-off. Mapped this out in a visual wireframe. Want me to send the image?`
  };

  const deliverableData = {
    clientKey,
    clientName: name,
    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    consultant: "Signal & Friction",
    loomUrl: "",
    diagnosis: {
      signal: `80% of active signups complete the onboarding setup but only 12% upgrade to premium tiers. User analytics drop-offs indicate high user calculation overhead when evaluating the ROI of paid plans.`,
      friction: {
        mechanism,
        rootCause: `The pricing interface presents features as list taxonomies rather than framing economic yield. Users bounce because they cannot safely estimate a clear ROI before buying.`
      },
      decisions: [
        {
          type: "A — Conservative",
          label: "Consolidate to a single clear metric upgrade path",
          action: "Gate upgrade paths directly by user seats or usage caps, rather than miscellaneous feature locks.",
          reasoning: "Aligns pricing with direct utility, reducing cognitive evaluation overhead.",
          tradeoff: "A small fraction of power users may require bespoke configurations."
        },
        {
          type: "B — Aggressive",
          label: "Invert the sequence: Show Dashboard first",
          action: "Provide immediate access to a sandbox dashboard containing simulated data before requiring signup configuration.",
          reasoning: "Lowers value uncertainty by demonstrating core product utility in under 5 seconds.",
          tradeoff: "Slightly increases server compute resources for hosting sandbox views."
        },
        {
          type: "C — Lateral",
          label: "Implement a 100% credited trial period",
          action: "Absorb the initial diagnostic integration setup fee as a 100% credit toward recurring premium tiers.",
          reasoning: "Reduces commitment anxiety at the initial stage of value exchange.",
          tradeoff: "Delays raw checkout revenues by 14 days to prioritize high-retention users."
        }
      ]
    }
  };

  await fs.writeFile(path.join(LEADS_DIR, `${clientKey}.json`), JSON.stringify(leadData, null, 2));
  await fs.writeFile(path.join(DELIVERABLES_DIR, `${clientKey}.json`), JSON.stringify(deliverableData, null, 2));
}

main().catch((err) => {
  console.error('Fatal CLI execution error:', err);
  process.exit(1);
});
