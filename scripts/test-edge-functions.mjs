import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log('🚀 TESTING EDGE FUNCTIONS...');

  // 1. Get a test client ID from the database
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id, contact_email')
    .limit(1)
    .single();

  if (clientErr || !client) {
    console.error('❌ Failed to retrieve a client for invoice testing:', clientErr?.message);
    process.exit(1);
  }
  const testClientId = client.id;
  console.log(`✅ Using Client ID for testing: ${testClientId} (${client.contact_email})`);

  // 2. Test tally-webhook for DWY (should route to microdosing segment)
  console.log('\nTesting tally-webhook (DWY Segment)...');
  const dwyPayload = {
    data: {
      fields: [
        { label: 'website url', key: 'url', value: 'https://test-dwy-edge.io' },
        { label: 'drop-off', key: 'funnel', value: 'onboarding Setup confusion' },
        { label: 'segment', key: 'segment', value: 'Done-With-You autonomy' },
        { label: 'email', key: 'email', value: `dwy-edge-${Date.now()}@signal-and-friction.com` }
      ]
    }
  };

  const tallyDwyRes = await fetch(`${supabaseUrl}/functions/v1/tally-webhook`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'apikey': serviceKey
    },
    body: JSON.stringify(dwyPayload)
  });

  if (!tallyDwyRes.ok) {
    console.error('❌ DWY tally-webhook failed:', await tallyDwyRes.text());
  } else {
    const data = await tallyDwyRes.json();
    console.log('✅ DWY tally-webhook success:', JSON.stringify(data, null, 2));
  }

  // 3. Test tally-webhook for DFY (should route to high_ticket segment)
  console.log('\nTesting tally-webhook (DFY Segment)...');
  const dfyPayload = {
    data: {
      fields: [
        { label: 'website url', key: 'url', value: 'https://test-dfy-edge.io' },
        { label: 'drop-off', key: 'funnel', value: 'landing page bounce' },
        { label: 'segment', key: 'segment', value: 'Done-For-You concierge' },
        { label: 'email', key: 'email', value: `dfy-edge-${Date.now()}@signal-and-friction.com` }
      ]
    }
  };

  const tallyDfyRes = await fetch(`${supabaseUrl}/functions/v1/tally-webhook`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'apikey': serviceKey
    },
    body: JSON.stringify(dfyPayload)
  });

  if (!tallyDfyRes.ok) {
    console.error('❌ DFY tally-webhook failed:', await tallyDfyRes.text());
  } else {
    const data = await tallyDfyRes.json();
    console.log('✅ DFY tally-webhook success:', JSON.stringify(data, null, 2));
  }

  // 4. Test stripe-invoice
  console.log('\nTesting stripe-invoice...');
  const invoicePayload = {
    record: {
      status: 'delivered',
      payment_status: 'uninvoiced',
      client_id: testClientId,
      symbolic_price_charged: 2000
    }
  };

  const invoiceRes = await fetch(`${supabaseUrl}/functions/v1/stripe-invoice`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'apikey': serviceKey
    },
    body: JSON.stringify(invoicePayload)
  });

  if (!invoiceRes.ok) {
    console.error('❌ stripe-invoice failed:', await invoiceRes.text());
  } else {
    const data = await invoiceRes.json();
    console.log('✅ stripe-invoice success:', JSON.stringify(data, null, 2));
  }

  // 5. Test stripe-refund (CORS or OPTIONS/GET check)
  console.log('\nTesting stripe-refund (connectivity check)...');
  const refundRes = await fetch(`${supabaseUrl}/functions/v1/stripe-refund`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'apikey': serviceKey
    },
    body: JSON.stringify({
      practitioner_id: 'test-id',
      status: 'failed'
    })
  });
  console.log(`✅ stripe-refund response status: ${refundRes.status}`);

  // 6. Verify recent activity logs
  console.log('\nChecking recent activity logs...');
  const { data: logs, error: logsErr } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (logsErr) {
    console.error('❌ Failed to check activity logs:', logsErr.message);
  } else {
    console.log('✅ Recent activity logs:', JSON.stringify(logs, null, 2));
  }
}

run().catch(console.error);
