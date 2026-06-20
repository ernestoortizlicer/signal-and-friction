import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const PORT = 3002;
const BASE_URL = `http://localhost:${PORT}`;
const projectRoot = '/Users/ernestoortiz/Downloads/Claude/signal-and-friction-app';
const framesDir = path.join(projectRoot, 'temp_frames');
const audioPath = path.join(projectRoot, 'audio.m4a');
const outputVideo = path.join(projectRoot, 'SIGNAL_AND_FRICTION_LOOM.mp4');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function isPortOpen(port) {
  try {
    execSync(`lsof -i :${port}`);
    return true;
  } catch (_e) {
    return false;
  }
}

async function run() {
  console.log('=== AUTOMATED LOOM VIDEO GENERATOR ===');

  if (fs.existsSync(framesDir)) {
    console.log('Cleaning up existing temp_frames directory...');
    fs.rmSync(framesDir, { recursive: true, force: true });
  }
  fs.mkdirSync(framesDir);

  let spawnedProcess = null;
  const alreadyRunning = await isPortOpen(PORT);

  if (alreadyRunning) {
    console.log(`✓ Next.js dev server is already running on port ${PORT}. Connecting...`);
  } else {
    console.log(`Next.js server is NOT running on port ${PORT}. Starting in background...`);
    spawnedProcess = spawn('npx', ['next', 'dev', '-p', String(PORT)], {
      cwd: projectRoot,
      env: { ...process.env, PORT: String(PORT) },
      shell: true
    });

    console.log('Waiting for Next.js to start compiler...');
    let ready = false;
    for (let i = 0; i < 30; i++) {
      await sleep(1500);
      try {
        const res = await fetch(BASE_URL);
        if (res.ok) {
          ready = true;
          break;
        }
      } catch (_e) {
        // Continue polling
      }
    }

    if (!ready) {
      throw new Error(`Timeout waiting for dev server to start on ${BASE_URL}`);
    }
    console.log('✓ Next.js dev server is active and responding!');
  }

  console.log('Launching Puppeteer browser at 1920x1080...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--window-size=1920,1080', '--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Authenticate and set cookie for admin routes
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: 'ernestoortizlicer@gmail.com',
        password: 'AdminPassword123!'
      });
      if (error) {
        console.warn('⚠️ Supabase login failed, admin routes might redirect to login:', error.message);
      } else if (data.session) {
        console.log('✓ Signed in as admin. Setting session cookie for localhost...');
        await page.setCookie({
          name: 'sf-admin-session',
          value: data.session.access_token,
          domain: 'localhost',
          path: '/',
          httpOnly: false,
          secure: false,
          sameSite: 'Lax'
        });
      }
    } else {
      console.warn('⚠️ Missing Supabase URL or Anon key in environment variables.');
    }
  } catch (authErr) {
    console.warn('⚠️ Failed to authenticate Puppeteer session:', authErr.message);
  }

  let frameIndex = 0;
  let isCapturing = true;
  
  const captureLoop = async () => {
    while (isCapturing) {
      const startTime = Date.now();
      try {
        const framePath = path.join(framesDir, `frame_${String(frameIndex).padStart(4, '0')}.jpg`);
        await page.screenshot({ path: framePath, type: 'jpeg', quality: 80 });
        frameIndex++;
      } catch (err) {
        // Catch target closed or detached page errors silently
      }
      const elapsed = Date.now() - startTime;
      const waitTime = Math.max(0, 100 - elapsed);
      await sleep(waitTime);
    }
  };

  // Launch capture loop
  captureLoop();
  console.log('✓ Screen recording started (10fps)...');

  console.log('\n--- EXECUTION TIMELINE START ---');

  try {
    console.log('[0s - 15s] Navigating to Home and scrolling to simulator...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(2000);

    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const scrollY = Math.round((i / steps) * 1700);
      await page.evaluate((y) => window.scrollTo(0, y), scrollY).catch(() => {});
      await sleep(250);
    }
    await sleep(3500);

    console.log('[15s - 55s] Interacting with Conversion Simulator toggles...');
    
    const clickButtonByText = async (text) => {
      return await page.evaluate((txt) => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const target = buttons.find(b => b.textContent.includes(txt));
        if (target) {
          target.click();
          return true;
        }
        return false;
      }, text).catch(() => false);
    };

    console.log('  - Click "Deferred" to mend CC Gate...');
    await clickButtonByText('Deferred');
    await sleep(8000);

    console.log('  - Click "3-Field Form" to mend Cognitive Load...');
    await clickButtonByText('3-Field Form');
    await sleep(8000);

    console.log('  - Click "Dashboard First" to mend Setup Wall...');
    await clickButtonByText('Dashboard First');
    await sleep(8000);

    console.log('  - Click "ROI Projection" to mend Value Deficit...');
    await clickButtonByText('ROI Projection');
    await sleep(11000);

    console.log('[55s - 70s] Navigating to Client Pipeline (/admin/dashboard)...');
    await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
    await sleep(8000);
    await page.evaluate(() => window.scrollTo(0, 100)).catch(() => {});
    await sleep(7000);

    console.log('[70s - 85s] Navigating to Priority focus Matrix (/admin/priorities)...');
    await page.goto(`${BASE_URL}/admin/priorities`, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
    await sleep(8000);
    await page.evaluate(() => window.scrollTo(0, 150)).catch(() => {});
    await sleep(7000);

    console.log('[85s - 95s] Navigating to Financial Ledger & Projections (/admin/finance)...');
    await page.goto(`${BASE_URL}/admin/finance`, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
    await sleep(5000);
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const roiTab = tabs.find(t => t.textContent.includes('ROI') || t.textContent.includes('Calculator'));
      if (roiTab) roiTab.click();
    }).catch(() => {});
    await sleep(5000);

    console.log('[95s - 105s] Returning to Home page lead form...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
    await page.evaluate(() => window.scrollTo(0, 9999)).catch(() => {});
    await sleep(10000);

  } catch (timelineErr) {
    console.error('Timeline execution error:', timelineErr.message);
  }

  console.log('--- EXECUTION TIMELINE COMPLETED ---');

  isCapturing = false;
  await sleep(500); // Wait for last frame capture to settle
  browser.close().catch(() => {});
  console.log(`✓ Capturing stopped. Generated ${frameIndex} frames.`);

  console.log('\nChecking for ffmpeg availability...');
  let ffmpegPath = 'ffmpeg';
  let hasFfmpeg = false;

  const localFfmpeg = path.join(projectRoot, 'ffmpeg');
  if (fs.existsSync(localFfmpeg)) {
    ffmpegPath = localFfmpeg;
    hasFfmpeg = true;
    console.log(`✓ Found local ffmpeg binary at: ${localFfmpeg}`);
  } else {
    try {
      execSync('which ffmpeg');
      hasFfmpeg = true;
    } catch (_e) {
      if (fs.existsSync('/usr/local/bin/ffmpeg')) {
        ffmpegPath = '/usr/local/bin/ffmpeg';
        hasFfmpeg = true;
      } else if (fs.existsSync('/opt/homebrew/bin/ffmpeg')) {
        ffmpegPath = '/opt/homebrew/bin/ffmpeg';
        hasFfmpeg = true;
      }
    }
  }

  if (hasFfmpeg) {
    console.log('✓ ffmpeg is available. Assembling SIGNAL_AND_FRICTION_LOOM.mp4...');
    try {
      // Calculate dynamic framerate to map video frames exactly to audio duration
      let audioDuration = 113.5;
      try {
        const durationOutput = execSync(`"${ffmpegPath}" -i "${audioPath}" 2>&1 | grep Duration`).toString();
        const match = durationOutput.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
        if (match) {
          audioDuration = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
          console.log(`✓ Detected audio duration: ${audioDuration}s`);
        }
      } catch (durationErr) {
        console.warn('⚠️ Could not auto-detect audio duration, falling back to 113.5s');
      }

      const framerate = frameIndex / audioDuration;
      console.log(`✓ Calculated dynamic framerate: ${framerate.toFixed(2)} fps (${frameIndex} frames over ${audioDuration.toFixed(1)}s)`);

      const ffmpegCmd = `"${ffmpegPath}" -y -r ${framerate} -i "${path.join(framesDir, 'frame_%04d.jpg')}" -i "${audioPath}" -c:v libx264 -pix_fmt yuv420p "${outputVideo}"`;
      console.log(`Executing: ${ffmpegCmd}`);
      execSync(ffmpegCmd, { stdio: 'inherit' });
      console.log(`\n🎉 SUCCESS! Video compiled at: ${outputVideo}`);
      
      console.log('Cleaning up frames...');
      fs.rmSync(framesDir, { recursive: true, force: true });
    } catch (err) {
      console.error('Failed to compile video with ffmpeg:', err.message);
    }
  } else {
    console.log('⚠️ ffmpeg is NOT yet available on this system.');
    console.log(`\n[Manual Fallback] Frames are preserved in ${framesDir}. Once ffmpeg is installed, run:`);
    console.log(`ffmpeg -y -r 6.2 -i "${framesDir}/frame_%04d.jpg" -i "${audioPath}" -c:v libx264 -pix_fmt yuv420p "${outputVideo}"`);
  }

  if (spawnedProcess) {
    console.log('Stopping spawned Next.js server...');
    spawnedProcess.kill();
  }
}

run().catch(err => {
  console.error('Fatal execution error:', err.message);
  process.exit(1);
});
