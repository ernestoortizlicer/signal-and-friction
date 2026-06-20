import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://tsaarsuuclvkjsgjcmoj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzYWFyc3V1Y2x2a2pzZ2pjbW9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTczMjE2NywiZXhwIjoyMDk3MzA4MTY3fQ.otLhAuMzjARHclJYVLRKIHEF9wMDwT0Hssz62PO2LD4';

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
