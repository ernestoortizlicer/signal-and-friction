import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '..', 'public');

async function generateBanners() {
  console.log('🚀 Launching headless browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--font-render-hinting=none'],
  });

  // ── LinkedIn Banner: 1584 × 396 ──
  console.log('\n📐 Generating LinkedIn banner (1584×396)...');
  const linkedinPage = await browser.newPage();
  await linkedinPage.setViewport({ width: 1584, height: 396, deviceScaleFactor: 2 });
  await linkedinPage.goto(
    `file://${path.resolve(__dirname, 'banner-linkedin.html')}`,
    { waitUntil: 'networkidle0', timeout: 30000 }
  );
  // Wait for Google Fonts to fully load and render
  await linkedinPage.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 1000));
  await linkedinPage.screenshot({
    path: path.join(publicDir, 'sf_linkedin_banner.png'),
    type: 'png',
    clip: { x: 0, y: 0, width: 1584, height: 396 },
  });
  console.log('✓ LinkedIn banner saved → public/sf_linkedin_banner.png');

  // ── Tally Banner: 1500 × 500 ──
  console.log('\n📐 Generating Tally banner (1500×500)...');
  const tallyPage = await browser.newPage();
  await tallyPage.setViewport({ width: 1500, height: 500, deviceScaleFactor: 2 });
  await tallyPage.goto(
    `file://${path.resolve(__dirname, 'banner-tally.html')}`,
    { waitUntil: 'networkidle0', timeout: 30000 }
  );
  await tallyPage.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 1000));
  await tallyPage.screenshot({
    path: path.join(publicDir, 'sf_tally_banner.png'),
    type: 'png',
    clip: { x: 0, y: 0, width: 1500, height: 500 },
  });
  console.log('✓ Tally banner saved → public/sf_tally_banner.png');

  // ── OpenGraph Image: 1200 × 630 ──
  console.log('\n📐 Generating OpenGraph Image (1200×630)...');
  const ogPage = await browser.newPage();
  await ogPage.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
  await ogPage.goto(
    `file://${path.resolve(__dirname, 'banner-og.html')}`,
    { waitUntil: 'networkidle0', timeout: 30000 }
  );
  await ogPage.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 1000));
  await ogPage.screenshot({
    path: path.join(publicDir, 'sf_og_image.png'),
    type: 'png',
    clip: { x: 0, y: 0, width: 1200, height: 630 },
  });
  console.log('✓ OpenGraph Image saved → public/sf_og_image.png');

  await browser.close();
  console.log('\n══════════════════════════════════');
  console.log('✅ All banners generated with pixel-perfect typography');
  console.log('   deviceScaleFactor: 2 (Retina-quality output)');
  console.log('══════════════════════════════════\n');
}

generateBanners().catch((err) => {
  console.error('❌ Banner generation failed:', err);
  process.exit(1);
});
