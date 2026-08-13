import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const exists = (path) => fs.existsSync(path);
const fail = (message) => { console.error(`MARKET SURFACE INTEGRITY FAILED: ${message}`); process.exitCode = 1; };
const requireText = (source, needle, label) => { if (!source.includes(needle)) fail(`${label} missing ${needle}`); };
const forbidText = (source, needle, label) => { if (source.includes(needle)) fail(`${label} contains forbidden legacy text: ${needle}`); };

const marketProfiles = read('src/lib/market-profiles.ts');
const landing = read('src/components/MarketLanding.tsx');
const pricing = read('src/components/MarketPricing.tsx');
const leadSubmit = read('functions/api/leads/submit.ts');
const confirmed = read('src/app/confirmed/page.tsx');
const success = read('src/app/confirmed/success/page.tsx');
const sitemap = read('src/app/sitemap.ts');
const root = read('src/app/page.tsx');

for (const route of ['/us', '/ca', '/uk', '/sg', '/au']) requireText(marketProfiles, `route: '${route}'`, 'market-profiles.ts');
for (const code of ['US', 'CA', 'GB', 'SG', 'AU']) requireText(marketProfiles, `${code}: {`, 'market-profiles.ts');
for (const path of [
  'src/app/us/page.tsx', 'src/app/ca/page.tsx', 'src/app/uk/page.tsx', 'src/app/sg/page.tsx', 'src/app/au/page.tsx',
  'src/app/us/pricing/page.tsx', 'src/app/ca/pricing/page.tsx', 'src/app/uk/pricing/page.tsx', 'src/app/sg/pricing/page.tsx', 'src/app/au/pricing/page.tsx',
]) if (!exists(path)) fail(`required market route missing: ${path}`);
if (exists('src/app/sg/SingaporeClient.tsx')) fail('duplicated legacy SingaporeClient.tsx must not exist');

requireText(root, 'MarketLanding', 'root page');
requireText(landing, 'PUBLIC_CLAIMS', 'MarketLanding');
requireText(landing, 'DFY_LADDER', 'MarketLanding');
requireText(landing, 'DWY_LADDER', 'MarketLanding');
requireText(landing, 'scan gathers evidence', 'MarketLanding');
requireText(pricing, '@/lib/offer-catalog', 'MarketPricing');

for (const field of ['market_surface', 'country_code', 'company_stage', 'acquisition_source']) requireText(leadSubmit, field, 'lead submit market contract');
requireText(leadSubmit, "SG: 'apac'", 'lead submit market mapping');
requireText(leadSubmit, "AU: 'apac'", 'lead submit market mapping');

for (const legacy of ['Behavioral Diagnostic System v4.5', 'LIFT_LOW', 'LIFT_HIGH', 'single friction point killing your revenue']) {
  forbidText(root, legacy, 'root page');
  forbidText(landing, legacy, 'MarketLanding');
}
for (const fakeState of ['Oscilloscope', 'Funnel Scan Active', 'Report Compilation', 'timeLeft']) {
  forbidText(confirmed, fakeState, 'confirmed page');
  forbidText(success, fakeState, 'success page');
}
for (const hreflang of ['x-default', 'en-US', 'en-CA', 'en-GB', 'en-SG', 'en-AU']) requireText(sitemap, hreflang, 'localized sitemap');

if (!process.exitCode) console.log('Market surface integrity: PASS');
