import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const clients = [
  {
    "company_name": "Formbricks",
    "contact_name": "Johannes Dancker",
    "contact_email": "johannes@formbricks.com",
    "industry": "OSS SaaS",
    "source_platform": "LinkedIn"
  },
  {
    "company_name": "Documenso",
    "contact_name": "Timur Ercan",
    "contact_email": "timur@documenso.com",
    "industry": "OSS SaaS",
    "source_platform": "Twitter/X"
  },
  {
    "company_name": "Featurebase",
    "contact_name": "Bruno Hiis",
    "contact_email": "bruno@featurebase.app",
    "industry": "B2B SaaS",
    "source_platform": "Twitter/X"
  }
];

async function run() {
  console.log('Inserting clients into Supabase...');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/clients`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(clients)
  });

  if (!res.ok) {
    console.error('Failed to insert clients:', await res.text());
    return;
  }

  const insertedClients = await res.json();
  console.log(`Successfully inserted ${insertedClients.length} clients.`);

  // Note: The database trigger public.handle_client_created() automatically
  // inserts corresponding beta_projects rows in 'prospecting' state!
  console.log('Database triggers successfully initialized project states.');
}

run().catch(console.error);
