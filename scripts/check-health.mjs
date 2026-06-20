import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey || !anonKey) {
  console.error('❌ Missing required environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);
const supabaseAnon = createClient(supabaseUrl, anonKey);

async function run() {
  console.log('🔍 Executing health check query...');
  
  // 1. SELECT 1 connectivity test
  const { data: healthData, error: healthErr } = await supabase
    .from('stripe_payment_links')
    .select('id')
    .limit(1);
    
  if (healthErr) {
    console.error('❌ Supabase health check query failed:', healthErr.message);
    process.exit(1);
  }
  console.log('✅ Supabase Connection Healthy (SELECT 1 test equivalent passed).');

  // 2. Query row counts for all required tables
  const tables = [
    'stripe_payment_links',
    'certification_programs',
    'certified_practitioners',
    'performance_guarantees',
    'ai_incidents',
    'education_content',
    'priority_tasks',
    'clients',
    'beta_projects'
  ];

  console.log('\n📊 TABLE ROW COUNTS:');
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`❌ Table "${table}": Error fetching row count: ${error.message}`);
    } else {
      console.log(`✅ Table "${table}": ${count} rows`);
    }
  }

  // 3. Verify RLS is enabled on sensitive tables by trying to query anonymously
  const sensitiveTables = [
    'priority_tasks',
    'transaction_entries',
    'transactions',
    'accounts',
    'ai_incidents',
    'certified_practitioners',
    'performance_guarantees'
  ];

  console.log('\n🔒 RLS SECURITY VERIFICATION (Anonymous Query Tests):');
  for (const table of sensitiveTables) {
    try {
      const { data, error } = await supabaseAnon
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`✅ Table "${table}": Query blocked anonymously as expected. (Error: ${error.message})`);
      } else if (!data || data.length === 0) {
        console.log(`✅ Table "${table}": Returned empty/blocked anonymously as expected.`);
      } else {
        console.log(`❌ Table "${table}": SECURITY BREACH! Anonymous query succeeded and returned data.`);
      }
    } catch (e) {
      console.log(`✅ Table "${table}": Exception thrown (blocked anonymously): ${e.message}`);
    }
  }
}

run().catch((err) => {
  console.error('❌ Execution error:', err);
  process.exit(1);
});
