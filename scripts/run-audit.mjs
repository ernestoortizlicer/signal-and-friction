import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing env variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// Paths
const workspaceRoot = '/Users/ernestoortiz/Downloads/Claude';
const appRoot = path.join(workspaceRoot, 'signal-and-friction-app');

async function run() {
  console.log('🏁 STARTING MASTER WORKSPACE & SYSTEMS AUDIT...\n');

  // --- PHASE 1: SUPABASE AUDIT ---
  console.log('==================================================');
  console.log('🛰️  PHASE 1: SUPABASE AUDIT');
  console.log('==================================================');
  
  // Fetch OpenAPI spec to get all public tables
  let tables = [];
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      }
    });
    if (res.ok) {
      const swagger = await res.json();
      tables = Object.keys(swagger.paths)
        .filter(p => p !== '/' && !p.includes('{'))
        .map(p => p.replace('/', ''));
    }
  } catch (e) {
    console.error('Failed to query swagger OpenAPI:', e.message);
  }

  if (tables.length === 0) {
    // Fallback known list
    tables = [
      'clients', 'beta_projects', 'interactions', 'activity_log', 'tasks',
      'accounts', 'categories', 'transactions', 'transaction_entries',
      'investments', 'financial_goals', 'priority_tasks', 'priority_scores_log',
      'education_content', 'certified_practitioners', 'certification_programs',
      'performance_guarantees', 'cognitive_challenges', 'stripe_payment_links',
      'ai_incidents'
    ];
  }

  console.log(`\n📊 Querying Table row counts for ${tables.length} tables:`);
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`❌ Table "${table}": Error fetching count - ${error.message}`);
      } else {
        console.log(`  - ${table}: ${count} rows`);
      }
    } catch (err) {
      console.log(`❌ Table "${table}": Exception - ${err.message}`);
    }
  }

  // --- PHASE 2: CLOUDFLARE AUDIT ---
  console.log('\n==================================================');
  console.log('⛅  PHASE 2: CLOUDFLARE AUDIT');
  console.log('==================================================');
  console.log('Env variables check:');
  const requiredEnv = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY',
    'ALLOWED_ADMIN_EMAIL'
  ];
  requiredEnv.forEach(envName => {
    const present = process.env[envName] ? 'PRESENT' : 'MISSING';
    console.log(`  - ${envName}: ${present}`);
  });

  // --- PHASE 3: MASTER WORKSPACE FILE AUDIT ---
  console.log('\n==================================================');
  console.log('📁  PHASE 3: MASTER WORKSPACE FILE AUDIT');
  console.log('==================================================');
  
  const allFiles = [];
  const fileContentCache = {};

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'out' || entry.name === '.git' || entry.name === '.wrangler') continue;
        scanDir(fullPath);
      } else {
        const stats = fs.statSync(fullPath);
        allFiles.push({
          path: fullPath,
          relPath: path.relative(workspaceRoot, fullPath),
          size: stats.size,
          mtime: stats.mtime
        });
      }
    }
  }

  scanDir(workspaceRoot);
  console.log(`Scanned ${allFiles.length} files in the workspace (excluding build artifacts).`);

  // Read package.json to get referenced scripts
  const packageJson = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'));
  const scriptsInPackage = Object.values(packageJson.scripts || {}).join(' ');

  // Identify file imports/references
  console.log('\n🔍 Auditing references and dead files...');
  const deadFiles = [];
  const componentReferences = {};
  
  // Find all file contents for reference checking
  allFiles.forEach(file => {
    if (['.ts', '.tsx', '.js', '.mjs', '.html', '.css', '.json'].includes(path.extname(file.path))) {
      try {
        fileContentCache[file.path] = fs.readFileSync(file.path, 'utf8');
      } catch (e) {}
    }
  });

  allFiles.forEach(file => {
    const ext = path.extname(file.path);
    const basename = path.basename(file.path);
    const nameWithoutExt = path.basename(file.path, ext);

    // Skip checking directories or standard config files
    if (['.json', '.md', '.png', '.svg', '.ico', '.m4a', '.mp4', '.toml', '.local', '.gitignore'].includes(ext) || basename.startsWith('.')) {
      return;
    }

    // 1. Check if scripts in scripts/ are referenced in package.json or check-health/test scripts
    if (file.relPath.startsWith('signal-and-friction-app/scripts/')) {
      const isReferencedInPackage = scriptsInPackage.includes(basename);
      let isReferencedInScripts = false;
      
      for (const [filePath, content] of Object.entries(fileContentCache)) {
        if (filePath !== file.path && content.includes(basename)) {
          isReferencedInScripts = true;
          break;
        }
      }

      if (!isReferencedInPackage && !isReferencedInScripts) {
        deadFiles.push({ type: 'script', file: file.relPath, size: file.size });
      }
      return;
    }

    // 2. Check if components are rendered / imported
    if (file.relPath.includes('src/components/')) {
      let isImported = false;
      for (const [filePath, content] of Object.entries(fileContentCache)) {
        if (filePath !== file.path && (content.includes(nameWithoutExt) || content.includes(basename))) {
          isImported = true;
          break;
        }
      }
      if (!isImported) {
        deadFiles.push({ type: 'component', file: file.relPath, size: file.size });
      }
      return;
    }

    // 3. Check general files in app/
    if (file.relPath.includes('src/app/') && !basename.includes('page.tsx') && !basename.includes('layout.tsx') && !basename.includes('global') && !basename.includes('route.ts')) {
      let isImported = false;
      for (const [filePath, content] of Object.entries(fileContentCache)) {
        if (filePath !== file.path && (content.includes(nameWithoutExt) || content.includes(basename))) {
          isImported = true;
          break;
        }
      }
      if (!isImported) {
        deadFiles.push({ type: 'file', file: file.relPath, size: file.size });
      }
    }
  });

  console.log('\n❌ Confirmed Dead/Unreferenced Code Files:');
  if (deadFiles.length === 0) {
    console.log('  None found!');
  } else {
    deadFiles.forEach(df => {
      console.log(`  - [${df.type.toUpperCase()}] ${df.file} (${df.size} bytes)`);
    });
  }

  // Find console.logs
  const consoleLogs = [];
  for (const [filePath, content] of Object.entries(fileContentCache)) {
    if (filePath.includes('node_modules') || filePath.includes('scripts/test-') || filePath.includes('scripts/run-audit.mjs') || filePath.includes('scripts/check-health.mjs') || filePath.includes('scripts/verify-')) continue;
    
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('console.log') && !line.trim().startsWith('//')) {
        consoleLogs.push({
          file: path.relative(workspaceRoot, filePath),
          line: idx + 1,
          content: line.trim()
        });
      }
    });
  }

  console.log('\n📜 Active console.log statements found:');
  if (consoleLogs.length === 0) {
    console.log('  None found!');
  } else {
    consoleLogs.forEach(cl => {
      console.log(`  - ${cl.file}:${cl.line} -> ${cl.content}`);
    });
  }
}

run().catch(console.error);
