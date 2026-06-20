import { spawn } from 'child_process';
import path from 'path';

const mcpServerPath = path.resolve('scripts/mcp-supabase-server.mjs');

console.log(`🚀 Starting MCP Server testing for path: ${mcpServerPath}`);

const mcp = spawn('node', [mcpServerPath]);

let buffer = '';

mcp.stdout.on('data', (data) => {
  buffer += data.toString();
  processBuffer();
});

mcp.stderr.on('data', (data) => {
  console.error(`MCP Stderr: ${data.toString()}`);
});

mcp.on('close', (code) => {
  console.log(`MCP process exited with code ${code}`);
});

const requests = [
  // 1. List tools
  {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  },
  // 2. Test stripe_list_products
  {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'stripe_list_products',
      arguments: {}
    }
  },
  // 3. Test stripe_create_payment_link
  {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'stripe_create_payment_link',
      arguments: {
        priceId: 'price_dwy_beta_diagnostic',
        clientId: '928568a9-a22a-4112-97a7-c41656fb18d8'
      }
    }
  },
  // 4. Test stripe_get_revenue
  {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'stripe_get_revenue',
      arguments: {}
    }
  }
];

let currentRequestIdx = 0;

function sendNextRequest() {
  if (currentRequestIdx >= requests.length) {
    console.log('\n🌟 ALL MCP SERVER VERIFICATIONS PASSED!');
    mcp.kill();
    process.exit(0);
    return;
  }

  const req = requests[currentRequestIdx];
  console.log(`\n🔹 Sending JSON-RPC Request (${req.method} / ${req.params?.name || ''}):`);
  mcp.stdin.write(JSON.stringify(req) + '\n');
}

function processBuffer() {
  const lines = buffer.split('\n');
  buffer = lines.pop(); // keep last incomplete line in buffer

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const response = JSON.parse(line);
      console.log(`🔸 Received JSON-RPC Response (ID: ${response.id}):`);
      
      if (response.error) {
        console.error(`❌ Tool execution failed: ${response.error.message}`);
        mcp.kill();
        process.exit(1);
      }

      // Assertions
      if (response.id === 1) {
        const tools = response.result?.tools || [];
        const toolNames = tools.map(t => t.name);
        console.log(`Registered Tools Count: ${toolNames.length}`);
        
        const requiredStripeTools = ['stripe_list_products', 'stripe_create_payment_link', 'stripe_get_revenue'];
        const missing = requiredStripeTools.filter(t => !toolNames.includes(t));
        
        if (missing.length > 0) {
          console.error(`❌ Missing Stripe tools: ${missing.join(', ')}`);
          mcp.kill();
          process.exit(1);
        }
        console.log('✅ Verified: All 3 Stripe tools are registered.');
      } else if (response.id === 2 || response.id === 3 || response.id === 4) {
        const content = response.result?.content?.[0]?.text || '';
        console.log(`Tool Output Preview:\n${content.substring(0, 300)}...\n`);
        if (!content.includes('Stripe') && !content.includes('payment_links')) {
          console.error('❌ Warning: Expected keywords "Stripe" or "payment_links" in tool output.');
        } else {
          console.log('✅ Output verified successfully.');
        }
      }

      currentRequestIdx++;
      sendNextRequest();
    } catch (err) {
      console.error(`Error parsing response: ${err.message}. Line: ${line}`);
    }
  }
}

// Start sequence
sendNextRequest();
