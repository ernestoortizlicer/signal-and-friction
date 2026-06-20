import http from 'http';
import fs from 'fs/promises';
import path from 'path';

const PORT = 3001;
const LEADS_DIR = '/Users/ernestoortiz/Downloads/Claude/db/leads';
const DELIVERABLES_DIR = '/Users/ernestoortiz/Downloads/Claude/signal-and-friction-app/public/deliverables';

// Ensure directories exist
await fs.mkdir(LEADS_DIR, { recursive: true });
await fs.mkdir(DELIVERABLES_DIR, { recursive: true });

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function handleGetLeads(res) {
  try {
    const files = await fs.readdir(LEADS_DIR);
    const leads = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(LEADS_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        try {
          const lead = JSON.parse(content);
          if (!lead.id) lead.id = file.replace('.json', '');
          leads.push(lead);
        } catch {}
      }
    }
    
    leads.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, leads }));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

async function handlePostLead(req, res) {
  try {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        if (!data.companyName) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Company Name is required' }));
          return;
        }
        
        const id = data.id || `lead-${Date.now()}`;
        const filename = `${data.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;
        const filePath = path.join(LEADS_DIR, filename);
        
        const newLead = {
          id,
          companyName: data.companyName,
          contact: data.contact || '',
          industry: data.industry || '',
          status: data.status || 'intake',
          intakeData: {
            problemStatement: data.problemStatement || '',
            funnelMetrics: data.intakeData?.funnelMetrics || { signupToPricing: '', pricingToCheckout: '', checkoutToPaid: '' },
            currentHypothesis: data.intakeData?.currentHypothesis || '',
            monthlyRevenue: data.intakeData?.monthlyRevenue || ''
          },
          submittedAt: data.submittedAt || new Date().toISOString(),
          notes: data.notes || '',
          responded: data.responded || false,
          platform: data.platform || 'linkedin'
        };
        
        await fs.writeFile(filePath, JSON.stringify(newLead, null, 2), 'utf-8');
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, lead: newLead }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
      }
    });
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

async function findLeadFile(id) {
  const files = await fs.readdir(LEADS_DIR);
  for (const file of files) {
    if (file.endsWith('.json')) {
      const filePath = path.join(LEADS_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      try {
        const lead = JSON.parse(content);
        if (lead.id === id || file.replace('.json', '') === id) {
          return { filePath, lead, filename: file };
        }
      } catch {}
    }
  }
  return null;
}

async function handleUpdateLead(req, res, id) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const data = JSON.parse(body);
      const result = await findLeadFile(id);
      if (!result) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Lead not found' }));
        return;
      }
      
      const updatedLead = {
        ...result.lead,
        ...data,
        intakeData: {
          ...result.lead.intakeData,
          ...(data.intakeData || {})
        }
      };
      
      await fs.writeFile(result.filePath, JSON.stringify(updatedLead, null, 2), 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, lead: updatedLead }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
  });
}

async function handleDeleteLead(res, id) {
  try {
    const result = await findLeadFile(id);
    if (!result) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Lead not found' }));
      return;
    }
    await fs.unlink(result.filePath);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Lead deleted successfully' }));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

async function handleGetDeliverable(res, id) {
  try {
    const clientKey = id.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const filePath = path.join(DELIVERABLES_DIR, `${clientKey}.json`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, deliverable: JSON.parse(content) }));
    } catch {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Deliverable not found' }));
    }
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

async function handleUpdateDeliverable(req, res, id) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const data = JSON.parse(body);
      const clientKey = id.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const filePath = path.join(DELIVERABLES_DIR, `${clientKey}.json`);
      
      const deliverable = {
        clientKey,
        clientName: data.clientName || id,
        date: data.date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        consultant: "Signal & Friction",
        loomUrl: data.loomUrl || '',
        diagnosis: {
          signal: data.diagnosis?.signal || '',
          friction: {
            mechanism: data.diagnosis?.friction?.mechanism || 'Cognitive Load',
            rootCause: data.diagnosis?.friction?.rootCause || ''
          },
          decisions: data.diagnosis?.decisions || [
            { type: 'A — Conservative', label: '', action: '', reasoning: '', tradeoff: '' },
            { type: 'B — Aggressive', label: '', action: '', reasoning: '', tradeoff: '' },
            { type: 'C — Lateral', label: '', action: '', reasoning: '', tradeoff: '' }
          ]
        }
      };
      
      await fs.writeFile(filePath, JSON.stringify(deliverable, null, 2), 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, deliverable }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
  });
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);
  
  // Handle pre-flight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  
  // Routes mapping
  if (pathname === '/api/leads' && req.method === 'GET') {
    await handleGetLeads(res);
  } else if (pathname === '/api/leads' && req.method === 'POST') {
    await handlePostLead(req, res);
  } else if (pathname.startsWith('/api/leads/') && req.method === 'PUT') {
    const id = pathname.replace('/api/leads/', '');
    await handleUpdateLead(req, res, id);
  } else if (pathname.startsWith('/api/leads/') && req.method === 'DELETE') {
    const id = pathname.replace('/api/leads/', '');
    await handleDeleteLead(res, id);
  } else if (pathname.startsWith('/api/deliverables/') && req.method === 'GET') {
    const id = pathname.replace('/api/deliverables/', '');
    await handleGetDeliverable(res, id);
  } else if (pathname.startsWith('/api/deliverables/') && req.method === 'PUT') {
    const id = pathname.replace('/api/deliverables/', '');
    await handleUpdateDeliverable(req, res, id);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Endpoint not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`Signal & Friction local CRM server running at http://localhost:${PORT}`);
});
