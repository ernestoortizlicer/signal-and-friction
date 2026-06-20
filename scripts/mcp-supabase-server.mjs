// ════════════════════════════════════════════════════════════
// MCP SUPABASE SERVER (Model Context Protocol)
// Path: signal-and-friction-app/scripts/mcp-supabase-server.mjs
// Description: Standard I/O MCP server linking Claude to Supabase
// ════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load env
dotenv.config();
// Also try loading .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Read JSON-RPC requests from stdin
process.stdin.on('data', async (chunk) => {
  const lines = chunk.toString().split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const request = JSON.parse(line);
      const response = await handleRequest(request);
      process.stdout.write(JSON.stringify(response) + '\n');
    } catch (err) {
      process.stderr.write(`Error parsing request: ${err.message}\n`);
    }
  }
});

async function handleRequest(req) {
  const { method, params, id } = req;
  
  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'supabase-pipeline-manager',
          version: '1.0.0'
        }
      }
    };
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: [
          {
            name: 'beta_list_prospects',
            description: 'List all client leads in the pipeline with their status.',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'beta_send_outreach',
            description: 'Update client status to outreach_sent and log the outreach.',
            inputSchema: {
              type: 'object',
              properties: {
                companyName: { type: 'string', description: 'Name of the company.' }
              },
              required: ['companyName']
            }
          },
          {
            name: 'beta_log_response',
            description: 'Log client response status (e.g. accepted, rejected).',
            inputSchema: {
              type: 'object',
              properties: {
                companyName: { type: 'string' },
                responseType: { type: 'string', enum: ['accepted', 'followup_sent', 'rejected'] }
              },
              required: ['companyName', 'responseType']
            }
          },
          {
            name: 'beta_deliver',
            description: 'Deliver conversion diagnostic. Marks as delivered, saves Loom URL.',
            inputSchema: {
              type: 'object',
              properties: {
                companyName: { type: 'string' },
                loomUrl: { type: 'string' },
                figmaUrl: { type: 'string' }
              },
              required: ['companyName', 'loomUrl']
            }
          },
          {
            name: 'beta_insights',
            description: 'Generate pipeline insights and conversion metrics report.',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'beta_portfolio_publish',
            description: 'Generate and publish client case study in public portfolio.',
            inputSchema: {
              type: 'object',
              properties: {
                companyName: { type: 'string' },
                oneLinePain: { type: 'string' },
                oneLineSolution: { type: 'string' },
                keyMetricResult: { type: 'string' }
              },
              required: ['companyName', 'oneLinePain', 'oneLineSolution', 'keyMetricResult']
            }
          },
          {
            name: 'beta_log_incident',
            description: 'Create an incident record in the database.',
            inputSchema: {
              type: 'object',
              properties: {
                incidentType: { type: 'string', enum: ['ai_hallucination', 'process_error', 'client_friction', 'automation_failure', 'data_quality_issue', 'prompt_improvement', 'tool_misuse', 'unexpected_outcome'] },
                severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                phase: { type: 'string', enum: ['prospecting', 'outreach', 'follow_up', 'diagnostic', 'delivery', 'testimonial', 'portfolio', 'backend', 'dashboard', 'mcp_server'] },
                description: { type: 'string' },
                rootCause: { type: 'string' },
                hallucinationSnippet: { type: 'string' },
                affectedCompanyName: { type: 'string', description: 'Optional name of the company affected.' }
              },
              required: ['incidentType', 'severity', 'phase', 'description']
            }
          },
          {
            name: 'beta_resolve_incident',
            description: 'Resolve an AI incident and trigger learning versioning if applicable.',
            inputSchema: {
              type: 'object',
              properties: {
                incidentId: { type: 'string', description: 'UUID of the incident to resolve.' },
                resolution: { type: 'string' },
                lessonLearned: { type: 'string' },
                appliedImprovement: { type: 'string' },
                improvementType: { type: 'string', enum: ['prompt_updated', 'schema_changed', 'automation_fixed', 'message_rewritten', 'validation_added', 'documentation_updated', 'tool_reconfigured'] },
                improvedPrompt: { type: 'string', description: 'Exact updated prompt text (if improvementType is prompt_updated).' }
              },
              required: ['incidentId', 'resolution', 'lessonLearned', 'appliedImprovement', 'improvementType']
            }
          },
          {
            name: 'beta_open_incidents',
            description: 'List all unresolved incidents ordered by severity.',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'beta_incident_insights',
            description: 'Generate reports on incident patterns, root causes, and mitigation status.',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'beta_iterate_from_incidents',
            description: 'Scan unresolved critical/high incidents and generate specific system iteration recommendations.',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'finance_add_transaction',
            description: 'Add a financial transaction with double-entry matching.',
            inputSchema: {
              type: 'object',
              properties: {
                accountName: { type: 'string', description: 'Name of the asset account (e.g., "Signal & Friction Checking").' },
                amount: { type: 'number', description: 'Transaction amount in USD.' },
                categoryName: { type: 'string', description: 'Category name (e.g., "ai_credits", "consulting_income").' },
                description: { type: 'string', description: 'Description of the transaction.' }
              },
              required: ['accountName', 'amount', 'categoryName', 'description']
            }
          },
          {
            name: 'finance_net_worth',
            description: 'Get current net worth breakdown (assets vs liabilities).',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'finance_retire_project',
            description: 'Run retirement projections based on compound interest.',
            inputSchema: {
              type: 'object',
              properties: {
                monthlyContribution: { type: 'number', description: 'Monthly contribution in USD.' },
                annualReturnRate: { type: 'number', description: 'Annual return rate percentage, default 8%.' },
                years: { type: 'number', description: 'Number of years to project, default 30.' }
              }
            }
          },
          {
            name: 'finance_learn',
            description: 'Retrieve financial education articles from the knowledge base.',
            inputSchema: {
              type: 'object',
              properties: {
                topic: { type: 'string', description: 'Topic to search for (e.g., FIRE, Tax, Investing).' }
              }
            }
          },
          {
            name: 'finance_incident',
            description: 'Log a financial anomaly or investment forecast discrepancy.',
            inputSchema: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                discrepancyAmount: { type: 'number', description: 'Amount of discrepancy in USD.' },
                expectedAmount: { type: 'number' },
                actualAmount: { type: 'number' }
              },
              required: ['description']
            }
          },
          {
            name: 'finance_advice',
            description: 'Ask Claude to analyze current financial data and give investment recommendations.',
            inputSchema: {
              type: 'object',
              properties: {
                question: { type: 'string', description: 'The specific investment question.' }
              },
              required: ['question']
            }
          },
          {
            name: 'priorities_next',
            description: 'Returns the Next 3 highest-priority pending tasks with explanations. Obsidian-tier focus engine.',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'priorities_add_task',
            description: 'Creates a manual priority task with all fields. Gold-standard task entry.',
            inputSchema: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Task title.' },
                category: { type: 'string', description: 'Category (e.g., client_work, finance, learning, health, admin).' },
                effort_minutes: { type: 'number', description: 'Estimated effort in minutes.' },
                energy_required: { type: 'string', enum: ['deep', 'analytical', 'shallow', 'admin', 'creative'], description: 'Energy mode required.' },
                deadline: { type: 'string', description: 'ISO deadline string (optional).' },
                description: { type: 'string', description: 'Optional description.' },
                revenue_impact: { type: 'number', description: 'Revenue impact in USD (optional).' },
                learning_multiplier: { type: 'number', description: 'Learning value 1-10 (default 3).' }
              },
              required: ['title']
            }
          },
          {
            name: 'priorities_matrix',
            description: 'Returns the full priority matrix grouped by 5 quadrants: do_now, schedule, delegate, eliminate, learn.',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'priorities_auto_pilot',
            description: 'Given available minutes, returns the optimal task combination that maximizes total priority score within that time budget.',
            inputSchema: {
              type: 'object',
              properties: {
                available_minutes: { type: 'number', description: 'Available time in minutes (default 60).' }
              }
            }
          },
          {
            name: 'priorities_explain',
            description: 'Given a task_id, returns a detailed explanation of why it is ranked where it is with component scores.',
            inputSchema: {
              type: 'object',
              properties: {
                task_id: { type: 'string', description: 'UUID of the task to explain.' }
              },
              required: ['task_id']
            }
          },
          {
            name: 'priorities_day_plan',
            description: 'Returns a daily schedule ordered by energy curves — deep work morning, admin afternoon, creative evening.',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'client_set_segment',
            description: 'Sets the segment for a client and adjusts their billing diagnostic price.',
            inputSchema: {
              type: 'object',
              properties: {
                clientId: { type: 'string', description: 'UUID of the client.' },
                segment: { type: 'string', description: 'Segment: "high_ticket" or "microdosing".' }
              },
              required: ['clientId', 'segment']
            }
          },
          {
            name: 'learning_get_drafts',
            description: 'Returns the 3 Socratic drafts of a knowledge base article for Ernesto.',
            inputSchema: {
              type: 'object',
              properties: {
                articleSlug: { type: 'string', description: 'Slug of the article.' }
              },
              required: ['articleSlug']
            }
          },
          {
            name: 'learning_rate_draft',
            description: 'Rates a Socratic draft and updates Ernesto\'s preferences in the system.',
            inputSchema: {
              type: 'object',
              properties: {
                draftId: { type: 'string', description: 'UUID of the draft.' },
                rating: { type: 'integer', description: 'Rating between 1 and 5.' },
                feedback: { type: 'string', description: 'Written feedback notes.' }
              },
              required: ['draftId', 'rating']
            }
          },
          {
            name: 'message_humanize',
            description: 'Translates raw template text into casual-professional American executive copy.',
            inputSchema: {
              type: 'object',
              properties: {
                messageText: { type: 'string', description: 'The draft message.' }
              },
              required: ['messageText']
            }
          },
          {
            name: 'certification_list',
            description: 'List all licensed practitioners and their satisfaction scores.',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'certification_audit',
            description: 'Audit practitioner compliance score and status.',
            inputSchema: {
              type: 'object',
              properties: {
                practitionerId: { type: 'string', description: 'UUID of the certified practitioner.' },
                satisfactionScore: { type: 'integer', description: 'CSAT compliance percentage (0-100).' },
                status: { type: 'string', enum: ['active', 'suspended', 'expired'], description: 'Status.' }
              },
              required: ['practitionerId']
            }
          },
          {
            name: 'guarantee_status',
            description: 'Check active project guarantees metrics and checklist gates.',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'learning_hyper_leap_challenge',
            description: 'Retrieve case studies and cognitive gap challenges.',
            inputSchema: {
              type: 'object',
              properties: {
                category: { type: 'string', description: 'Filter by category (optional).' }
              }
            }
          },
          {
            name: 'stripe_list_products',
            description: 'Retrieve products and prices from Stripe. Performs a mock listing if no Stripe Secret Key is present.',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'stripe_create_payment_link',
            description: 'Generates a Stripe Checkout Payment Link for a specific Price ID and client. Performs a mock listing if no Stripe Secret Key is present.',
            inputSchema: {
              type: 'object',
              properties: {
                priceId: { type: 'string', description: 'Price ID to create checkout payment link for (e.g. price_dfy_beta_diagnostic, price_dwy_beta_diagnostic).' },
                clientId: { type: 'string', description: 'Optional UUID of the client this checkout is for.' }
              },
              required: ['priceId']
            }
          },
          {
            name: 'stripe_get_revenue',
            description: 'Retrieve Stripe gross revenue, MRR, and refund statistics. Uses simulated live telemetry if STRIPE_SECRET_KEY is a placeholder.',
            inputSchema: { type: 'object', properties: {} }
          }
        ]
      }
    };
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params;
    try {
      let result;
      switch (name) {
        case 'beta_list_prospects':
          result = await listProspects();
          break;
        case 'beta_send_outreach':
          result = await sendOutreach(args.companyName);
          break;
        case 'beta_log_response':
          result = await logResponse(args.companyName, args.responseType);
          break;
        case 'beta_deliver':
          result = await deliverDiagnostic(args.companyName, args.loomUrl, args.figmaUrl);
          break;
        case 'beta_insights':
          result = await generateInsights();
          break;
        case 'beta_portfolio_publish':
          result = await publishPortfolio(args.companyName, args.oneLinePain, args.oneLineSolution, args.keyMetricResult);
          break;
        case 'beta_log_incident':
          result = await logIncident(args);
          break;
        case 'beta_resolve_incident':
          result = await resolveIncident(args);
          break;
        case 'beta_open_incidents':
          result = await openIncidents();
          break;
        case 'beta_incident_insights':
          result = await incidentInsights();
          break;
        case 'beta_iterate_from_incidents':
          result = await iterateFromIncidents();
          break;
        case 'finance_add_transaction':
          result = await addTransaction(args);
          break;
        case 'finance_net_worth':
          result = await netWorth();
          break;
        case 'finance_retire_project':
          result = await retireProject(args);
          break;
        case 'finance_learn':
          result = await learnFinance(args);
          break;
        case 'finance_incident':
          result = await logFinancialIncident(args);
          break;
        case 'finance_advice':
          result = await getFinanceAdvice(args);
          break;
        case 'priorities_next':
          result = await prioritiesNext();
          break;
        case 'priorities_add_task':
          result = await prioritiesAddTask(args);
          break;
        case 'priorities_matrix':
          result = await prioritiesMatrix();
          break;
        case 'priorities_auto_pilot':
          result = await prioritiesAutoPilot(args);
          break;
        case 'priorities_explain':
          result = await prioritiesExplain(args);
          break;
        case 'priorities_day_plan':
          result = await prioritiesDayPlan();
          break;
        case 'client_set_segment':
          result = await clientSetSegment(args);
          break;
        case 'learning_get_drafts':
          result = await learningGetDrafts(args);
          break;
        case 'learning_rate_draft':
          result = await learningRateDraft(args);
          break;
        case 'message_humanize':
          result = await messageHumanize(args);
          break;
        case 'certification_list':
          result = await certificationList();
          break;
        case 'certification_audit':
          result = await certificationAudit(args);
          break;
        case 'guarantee_status':
          result = await guaranteeStatus();
          break;
        case 'learning_hyper_leap_challenge':
          result = await learningHyperLeapChallenge(args);
          break;
        case 'stripe_list_products':
          result = await stripeListProducts();
          break;
        case 'stripe_create_payment_link':
          result = await stripeCreatePaymentLink(args);
          break;
        case 'stripe_get_revenue':
          result = await stripeGetRevenue();
          break;
        default:
          throw new Error(`Tool not found: ${name}`);
      }
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: result }] } };
    } catch (e) {
      return { jsonrpc: '2.0', id, error: { code: -32000, message: e.message } };
    }
  }

  return { jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } };
}

// ── TOOL IMPLEMENTATIONS ──

async function listProspects() {
  const { data, error } = await supabase
    .from('clients')
    .select('company_name, contact_name, beta_projects(status, payment_status)')
    .order('company_name');
  if (error) throw error;
  
  if (!data || data.length === 0) return 'No prospects found in database.';
  
  return data.map(c => {
    const proj = c.beta_projects?.[0] || { status: 'none', payment_status: 'none' };
    return `• ${c.company_name} (${c.contact_name}) — Status: [${proj.status.toUpperCase()}] | Billing: [${proj.payment_status}]`;
  }).join('\n');
}

async function sendOutreach(companyName) {
  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('id, contact_name')
    .ilike('company_name', `%${companyName}%`)
    .single();
    
  if (fetchError || !client) throw new Error(`Client "${companyName}" not found.`);
  
  const { error: updateError } = await supabase
    .from('beta_projects')
    .update({ status: 'outreach_sent', updated_at: new Date().toISOString() })
    .eq('client_id', client.id);
    
  if (updateError) throw updateError;
  
  return `✓ Success: Updated "${companyName}" pipeline status to outreach_sent. Outreach logged for ${client.contact_name}.`;
}

async function logResponse(companyName, responseType) {
  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('id')
    .ilike('company_name', `%${companyName}%`)
    .single();
    
  if (fetchError || !client) throw new Error(`Client "${companyName}" not found.`);
  
  let targetStatus = 'diagnostic_in_progress';
  if (responseType === 'rejected') targetStatus = 'closed_lost';
  if (responseType === 'followup_sent') targetStatus = 'followup_sent';

  const { error: updateError } = await supabase
    .from('beta_projects')
    .update({ status: targetStatus, updated_at: new Date().toISOString() })
    .eq('client_id', client.id);
    
  if (updateError) throw updateError;
  
  return `✓ Success: Logged response for "${companyName}". Status updated to: ${targetStatus.toUpperCase()}.`;
}

async function deliverDiagnostic(companyName, loomUrl, figmaUrl) {
  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('id')
    .ilike('company_name', `%${companyName}%`)
    .single();
    
  if (fetchError || !client) throw new Error(`Client "${companyName}" not found.`);
  
  // 1. Insert interaction
  const { error: insertError } = await supabase
    .from('interactions')
    .insert({
      client_id: client.id,
      diagnostic_loom_url: loomUrl,
      figma_annotated_url: figmaUrl || ''
    });
  if (insertError) throw insertError;
  
  // 2. Update status to trigger Stripe Invoice function
  const { error: updateError } = await supabase
    .from('beta_projects')
    .update({ status: 'delivered', updated_at: new Date().toISOString() })
    .eq('client_id', client.id);
  if (updateError) throw updateError;
  
  return `✓ Success: Diagnostic delivered to "${companyName}". Stripe invoice draft triggered automatically.`;
}

async function generateInsights() {
  const { data: projects, error } = await supabase
    .from('beta_projects')
    .select('status, clients(industry)');
  if (error) throw error;
  
  const total = projects.length;
  const byStatus = {};
  const byIndustry = {};
  
  projects.forEach(p => {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    const ind = p.clients?.industry || 'Unknown';
    byIndustry[ind] = (byIndustry[ind] || 0) + 1;
  });
  
  let report = `# Signal & Friction Pipeline Insights\n`;
  report += `Total Leads: ${total}\n\n`;
  
  report += `## Pipeline Funnel Distribution\n`;
  Object.keys(byStatus).forEach(s => {
    report += `- **${s.toUpperCase()}**: ${byStatus[s]} (${((byStatus[s] / total) * 100).toFixed(1)}%)\n`;
  });
  
  report += `\n## Industry Heatmap\n`;
  Object.keys(byIndustry).forEach(i => {
    report += `- **${i}**: ${byIndustry[i]}\n`;
  });
  
  return report;
}

async function publishPortfolio(companyName, oneLinePain, oneLineSolution, keyMetricResult) {
  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('id')
    .ilike('company_name', `%${companyName}%`)
    .single();
    
  if (fetchError || !client) throw new Error(`Client "${companyName}" not found.`);
  
  // Update/Insert portfolio case study
  const { error: upsertError } = await supabase
    .from('portfolio')
    .upsert({
      client_id: client.id,
      one_line_pain: oneLinePain,
      one_line_solution: oneLineSolution,
      key_metric_result: keyMetricResult,
      is_live: true,
      updated_at: new Date().toISOString()
    });
    
  if (upsertError) throw upsertError;
  
  return `✓ Success: Portfolio case study published for "${companyName}". live status = TRUE.`;
}

async function logIncident(args) {
  let clientId = null;
  let projectId = null;

  if (args.affectedCompanyName) {
    const { data: client } = await supabase
      .from('clients')
      .select('id, beta_projects(id)')
      .ilike('company_name', `%${args.affectedCompanyName}%`)
      .limit(1)
      .maybeSingle();

    if (client) {
      clientId = client.id;
      if (client.beta_projects && client.beta_projects.length > 0) {
        projectId = client.beta_projects[0].id;
      }
    }
  }

  const { data, error } = await supabase
    .from('ai_incidents')
    .insert({
      incident_type: args.incidentType,
      severity: args.severity,
      phase: args.phase,
      description: args.description,
      root_cause: args.rootCause || null,
      hallucination_snippet: args.hallucinationSnippet || null,
      affected_client_id: clientId,
      affected_project_id: projectId
    })
    .select('id')
    .single();

  if (error) throw error;
  return `✓ Success: Incident logged. ID: ${data.id}`;
}

async function resolveIncident(args) {
  const { data: incident, error: getError } = await supabase
    .from('ai_incidents')
    .select('*')
    .eq('id', args.incidentId)
    .single();

  if (getError || !incident) throw new Error(`Incident not found: ${args.incidentId}`);

  let newVersion = incident.iteration_version || 'v1.0.0';

  const isAILearningType = ['ai_hallucination', 'prompt_improvement', 'tool_misuse'].includes(incident.incident_type);
  if (isAILearningType && args.improvementType === 'prompt_updated' && args.improvedPrompt) {
    const { data: latestVersionObj } = await supabase
      .from('prompt_versions')
      .select('iteration_version')
      .eq('phase', incident.phase)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentVersion = latestVersionObj ? latestVersionObj.iteration_version : 'v1.0.0';
    const versionParts = currentVersion.replace('v', '').split('.').map(Number);
    
    if (versionParts.length === 3 && !versionParts.some(isNaN)) {
      versionParts[2] += 1;
      newVersion = `v${versionParts.join('.')}`;
    } else {
      newVersion = 'v1.0.1';
    }

    const { error: pvError } = await supabase
      .from('prompt_versions')
      .insert({
        phase: incident.phase,
        prompt_text: args.improvedPrompt,
        iteration_version: newVersion
      });

    if (pvError) throw pvError;
  }

  const { error: updateError } = await supabase
    .from('ai_incidents')
    .update({
      resolution: args.resolution,
      lesson_learned: args.lessonLearned,
      applied_improvement: args.appliedImprovement,
      improvement_type: args.improvementType,
      iteration_version: newVersion,
      improved_prompt: args.improvedPrompt || null,
      resolved_at: new Date().toISOString()
    })
    .eq('id', args.incidentId);

  if (updateError) throw updateError;
  return `✓ Success: Resolved incident "${args.incidentId}". System iteration version updated to ${newVersion}.`;
}

async function openIncidents() {
  const { data, error } = await supabase
    .from('ai_incidents')
    .select('id, incident_type, severity, phase, description, created_at')
    .is('resolved_at', null);

  if (error) throw error;
  if (!data || data.length === 0) return 'No unresolved AI incidents found.';

  const severityWeights = { critical: 1, high: 2, medium: 3, low: 4 };
  data.sort((a, b) => (severityWeights[a.severity] || 5) - (severityWeights[b.severity] || 5));

  return data.map(inc => {
    const dateStr = new Date(inc.created_at).toLocaleDateString();
    return `• [${inc.severity.toUpperCase()}] ${inc.incident_type} (Phase: ${inc.phase}) — ID: ${inc.id} | Created: ${dateStr}\n  Desc: "${inc.description}"`;
  }).join('\n\n');
}

async function incidentInsights() {
  const { data, error } = await supabase
    .from('ai_incidents')
    .select('*');

  if (error) throw error;
  if (!data || data.length === 0) return 'No incidents recorded yet.';

  const totalIncidents = data.length;
  const resolvedIncidents = data.filter(i => i.resolved_at).length;
  const unresolvedIncidents = totalIncidents - resolvedIncidents;

  const typeCounts = {};
  const phaseCounts = {};
  const severityCounts = {};
  let totalResolutionTime = 0;
  let resolvedWithTimeCount = 0;

  data.forEach(inc => {
    typeCounts[inc.incident_type] = (typeCounts[inc.incident_type] || 0) + 1;
    phaseCounts[inc.phase] = (phaseCounts[inc.phase] || 0) + 1;
    severityCounts[inc.severity] = (severityCounts[inc.severity] || 0) + 1;

    if (inc.resolved_at && inc.created_at) {
      const t = new Date(inc.resolved_at).getTime() - new Date(inc.created_at).getTime();
      totalResolutionTime += t;
      resolvedWithTimeCount++;
    }
  });

  const avgResHours = resolvedWithTimeCount > 0 
    ? (totalResolutionTime / resolvedWithTimeCount / (1000 * 60 * 60)).toFixed(1) 
    : 'N/A';

  const topTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topPhases = Object.entries(phaseCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  let report = `# Signal & Friction AI Incident Insights\n\n`;
  report += `* **Total Incidents Recorded:** ${totalIncidents}\n`;
  report += `* **Mitigation Status:** ${resolvedIncidents} Resolved | ${unresolvedIncidents} Unresolved\n`;
  report += `* **Average Resolution Time:** ${avgResHours} hours\n\n`;

  report += `## Top Incident Patterns\n`;
  topTypes.forEach(([type, count]) => {
    report += `- **${type}**: ${count} incidents (${((count/totalIncidents)*100).toFixed(0)}%)\n`;
  });

  report += `\n## Most Affected Phases\n`;
  topPhases.forEach(([phase, count]) => {
    report += `- **${phase}**: ${count} incidents\n`;
  });

  report += `\n## Suggested Systemic Improvements\n`;
  if (typeCounts['ai_hallucination'] > 1 || phaseCounts['outreach'] > 1) {
    report += `* ⚠️ **High Prompt Drift detected in outreach:** Recommend refining prompt guidelines for client persona mapping in \`prompt_versions\`.\n`;
  }
  if (typeCounts['tool_misuse'] > 0) {
    report += `* 🛠️ **Tool Misuse pattern:** Recommend setting tighter parameter validations in MCP tool definitions.\n`;
  }
  if (typeCounts['process_error'] > 0) {
    report += `* ⚙️ **Process Reliability:** Review CLI script logs and introduce automated retry limits for API hooks.\n`;
  }
  if (report.endsWith('Improvements\n')) {
    report += `* No critical failure patterns observed. Keep registering incidents to enable deep pattern matching.\n`;
  }

  return report;
}

async function iterateFromIncidents() {
  const { data, error } = await supabase
    .from('ai_incidents')
    .select('*')
    .is('resolved_at', null)
    .in('severity', ['high', 'critical']);

  if (error) throw error;
  if (!data || data.length === 0) return 'No unresolved High/Critical incidents requiring prompt iteration.';

  let report = `# Proposed System Iterations from Outstanding Incidents\n\n`;
  report += `Found **${data.length}** high/critical unresolved incidents. Below are the recommended fixes:\n\n`;

  data.forEach((inc, idx) => {
    report += `### ${idx+1}. Incident [${inc.severity.toUpperCase()}] — ${inc.incident_type} (${inc.phase})\n`;
    report += `- **Description:** ${inc.description}\n`;
    if (inc.root_cause) {
      report += `- **Root Cause:** ${inc.root_cause}\n`;
    }
    if (inc.hallucination_snippet) {
      report += `- **Anomalous Output:** \`\`\`${inc.hallucination_snippet}\`\`\`\n`;
    }
    report += `- **Recommended Action:**\n`;
    if (inc.incident_type === 'ai_hallucination') {
      report += `  - Update the prompt for the \`${inc.phase}\` phase in \`prompt_versions\` to explicitly forbid this output format.\n`;
    } else if (inc.incident_type === 'process_error') {
      report += `  - Add automated sanity checks / script validation to prevent this state.\n`;
    } else {
      report += `  - Reconfigure MCP tool boundaries / input validation criteria.\n`;
    }
    report += `\n`;
  });

  return report;
}

async function addTransaction(args) {
  // 1. Fetch category details
  const { data: category, error: catErr } = await supabase
    .from('categories')
    .select('*')
    .eq('name', args.categoryName)
    .single();
  if (catErr || !category) throw new Error(`Category not found: ${args.categoryName}`);

  // 2. Fetch checking/asset account
  const { data: assetAccount, error: accErr } = await supabase
    .from('accounts')
    .select('*')
    .eq('name', args.accountName)
    .single();
  if (accErr || !assetAccount) throw new Error(`Account not found: ${args.accountName}`);

  // 3. Resolve the offset account based on category name & type
  let offsetAccountName = 'Software Subscription Expenses';
  if (category.name === 'hardware_upgrade') offsetAccountName = 'Hardware Assets';
  else if (category.name === 'retirement_savings') offsetAccountName = 'Roth IRA Account';
  else if (category.name === 'ai_credits') offsetAccountName = 'AI API & Platform Expenses';
  else if (category.name === 'software_licenses') offsetAccountName = 'Software Subscription Expenses';
  else if (category.name === 'education_books') offsetAccountName = 'Education Expenses';
  else if (category.name === 'consulting_income') offsetAccountName = 'Consulting Revenue';
  else if (category.name === 'investment_return') offsetAccountName = 'Consulting Revenue';

  const { data: offsetAccount, error: offErr } = await supabase
    .from('accounts')
    .select('*')
    .eq('name', offsetAccountName)
    .single();
  if (offErr || !offsetAccount) throw new Error(`Offset account not found: ${offsetAccountName}`);

  const amountCents = Math.round(args.amount * 100);
  let debitAccountId, creditAccountId;

  if (category.type === 'expense') {
    // Expense increases (debit offset), Checking decreases (credit asset)
    debitAccountId = offsetAccount.id;
    creditAccountId = assetAccount.id;
  } else {
    // Checking increases (debit asset), Income increases (credit offset)
    debitAccountId = assetAccount.id;
    creditAccountId = offsetAccount.id;
  }

  // 4. Insert Transaction Header
  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .insert({ description: args.description })
    .select('id')
    .single();
  if (txError) throw txError;

  // 5. Insert double-entry entries
  const { error: entriesError } = await supabase
    .from('transaction_entries')
    .insert([
      { transaction_id: tx.id, account_id: debitAccountId, category_id: category.id, amount: amountCents },
      { transaction_id: tx.id, account_id: creditAccountId, category_id: category.id, amount: -amountCents }
    ]);
  if (entriesError) throw entriesError;

  return `✓ Success: Added double-entry transaction. Debited ${offsetAccountName === 'Hardware Assets' || offsetAccountName === 'Roth IRA Account' ? offsetAccountName : offsetAccountName + ' (debit)'}, Credited ${assetAccount.name === offsetAccountName ? 'checking' : assetAccount.name}. Amount: $${args.amount.toFixed(2)}`;
}

async function netWorth() {
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('id, name, type');
  if (error) throw error;

  const { data: entries, error: entriesError } = await supabase
    .from('transaction_entries')
    .select('account_id, amount');
  if (entriesError) throw entriesError;

  const balances = {};
  accounts.forEach(acc => {
    balances[acc.id] = { name: acc.name, type: acc.type, balance: 0 };
  });

  entries.forEach(e => {
    if (balances[e.account_id]) {
      balances[e.account_id].balance += Number(e.amount);
    }
  });

  let totalAssets = 0;
  let totalLiabilities = 0;

  let report = `# Net Worth Breakdown\n\n`;
  report += `### Assets\n`;
  Object.values(balances).forEach(b => {
    if (b.type === 'asset') {
      const val = b.balance / 100;
      totalAssets += val;
      report += `- **${b.name}**: $${val.toFixed(2)}\n`;
    }
  });

  report += `\n### Liabilities\n`;
  Object.values(balances).forEach(b => {
    if (b.type === 'liability') {
      const val = Math.abs(b.balance) / 100;
      totalLiabilities += val;
      report += `- **${b.name}**: $${val.toFixed(2)}\n`;
    }
  });

  const netVal = totalAssets - totalLiabilities;
  report += `\n**Total Assets:** $${totalAssets.toFixed(2)}\n`;
  report += `**Total Liabilities:** $${totalLiabilities.toFixed(2)}\n`;
  report += `## 💳 Net Worth: $${netVal.toFixed(2)}\n`;

  return report;
}

async function retireProject(args) {
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('id, name')
    .in('name', ['Roth IRA Account', 'Investment Account', 'Signal & Friction Checking']);
  if (error) throw error;

  const checkingAcc = accounts.find(a => a.name === 'Signal & Friction Checking');
  const rothAcc = accounts.find(a => a.name === 'Roth IRA Account');
  const invAcc = accounts.find(a => a.name === 'Investment Account');

  const accountIds = [rothAcc?.id, invAcc?.id].filter(Boolean);
  const checkingId = checkingAcc?.id;

  const { data: entries, error: entriesError } = await supabase
    .from('transaction_entries')
    .select('account_id, amount');
  if (entriesError) throw entriesError;

  let currentBalanceCents = 0;
  let checkingBalanceCents = 0;

  entries.forEach(e => {
    if (accountIds.includes(e.account_id)) {
      currentBalanceCents += Number(e.amount);
    }
    if (e.account_id === checkingId) {
      checkingBalanceCents += Number(e.amount);
    }
  });

  const currentBalance = currentBalanceCents / 100;
  const checkingBalance = checkingBalanceCents / 100;

  const monthlyContrib = args.monthlyContribution !== undefined ? args.monthlyContribution : 1000;
  const annualRate = args.annualReturnRate !== undefined ? args.annualReturnRate : 8;
  const years = args.years !== undefined ? args.years : 30;

  const p = currentBalance;
  const r = annualRate / 100;
  const n = 12;
  const t = years;
  const pmt = monthlyContrib;

  const nt = n * t;
  const rn = r / n;
  const compoundPrincipal = p * Math.pow(1 + rn, nt);
  const compoundContributions = pmt * ((Math.pow(1 + rn, nt) - 1) / rn) * (1 + rn);
  const totalAccumulated = compoundPrincipal + compoundContributions;
  const totalContributed = pmt * 12 * t;
  const totalInterest = totalAccumulated - p - totalContributed;

  // Calculate projected retirement age or FI number
  const annualExpenses = monthlyContrib * 12; // assume expenses equal contributions for simulation
  const fiNumber = annualExpenses * 25;
  const yearsToFi = totalAccumulated >= fiNumber ? 'Achieved' : 'In Progress';

  let report = `# Retirement & FIRE Projections\n\n`;
  report += `* **Initial Investments:** $${currentBalance.toFixed(2)}\n`;
  report += `* **Cash Reserves (Checking):** $${checkingBalance.toFixed(2)}\n`;
  report += `* **Monthly Contribution:** $${monthlyContrib.toFixed(2)}\n`;
  report += `* **Projected Annual Yield:** ${annualRate}%\n`;
  report += `* **Timeframe:** ${years} years\n\n`;
  report += `## Accumulation Results:\n`;
  report += `- **Total Contributed (new cash):** $${totalContributed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
  report += `- **Total Compound Interest Earned:** $${totalInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
  report += `### 💰 Final Projected Balance: $${totalAccumulated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n`;
  report += `*Note: Calculations assume monthly contributions and compounding. Index fund yield is not guaranteed.*`;

  return report;
}

async function learnFinance(args) {
  const topic = args.topic || '';
  const { data, error } = await supabase
    .from('education_content')
    .select('*')
    .or(`title.ilike.%${topic}%,category.ilike.%${topic}%`);

  if (error) throw error;
  if (!data || data.length === 0) return `No financial education articles found for topic: "${topic}".`;

  return data.map(art => {
    return `# ${art.title} (${art.category})\n*Read Time: ${art.read_time_mins} mins*\n\n**Summary:** ${art.summary}\n\n${art.body}`;
  }).join('\n\n---\n\n');
}

async function logFinancialIncident(args) {
  const { data: incident, error: incError } = await supabase
    .from('ai_incidents')
    .insert({
      incident_type: 'data_quality_issue',
      severity: 'medium',
      phase: 'backend',
      description: args.description,
      root_cause: 'Financial balance or projection mismatch logged via CLI/finance tool.'
    })
    .select('id')
    .single();

  if (incError) throw incError;

  const discrepancyCents = Math.round((args.discrepancyAmount || 0) * 100);
  const expectedCents = Math.round((args.expectedAmount || 0) * 100);
  const actualCents = Math.round((args.actualAmount || 0) * 100);

  const { error: finError } = await supabase
    .from('financial_incidents')
    .insert({
      incident_id: incident.id,
      discrepancy_amount: discrepancyCents,
      expected_amount: expectedCents,
      actual_amount: actualCents
    });

  if (finError) throw finError;

  return `✓ Success: Financial incident logged. AI Incident ID: ${incident.id}`;
}

async function getFinanceAdvice(args) {
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('id, name, type');
  if (error) throw error;

  const { data: entries, error: entriesError } = await supabase
    .from('transaction_entries')
    .select('account_id, amount');
  if (entriesError) throw entriesError;

  const balances = {};
  accounts.forEach(acc => {
    balances[acc.id] = { name: acc.name, type: acc.type, balance: 0 };
  });

  entries.forEach(e => {
    if (balances[e.account_id]) {
      balances[e.account_id].balance += Number(e.amount);
    }
  });

  let checkingBalance = 0;
  let investmentBalance = 0;
  let rothIraBalance = 0;

  Object.values(balances).forEach(b => {
    const usd = b.balance / 100;
    if (b.name === 'Signal & Friction Checking') checkingBalance = usd;
    if (b.name === 'Investment Account') investmentBalance = usd;
    if (b.name === 'Roth IRA Account') rothIraBalance = usd;
  });

  const costMacBook = 3500;
  const indexFundReturn5Years = costMacBook * Math.pow(1 + 0.08, 5);
  const indexFundYield = indexFundReturn5Years - costMacBook;

  const hardwareValue5Years = costMacBook * Math.pow(1 - 0.25, 5);
  const hardwareLoss = costMacBook - hardwareValue5Years;

  let report = `### FINANCIAL ADVISOR CONTEXT METRICS\n\n`;
  report += `**Accounts Balances:**\n`;
  report += `- Signal & Friction Checking: $${checkingBalance.toFixed(2)}\n`;
  report += `- Investment Account (Index Funds): $${investmentBalance.toFixed(2)}\n`;
  report += `- Roth IRA Account: $${rothIraBalance.toFixed(2)}\n\n`;

  report += `**Comparative Investment Scenarios (5-Year Opportunity Cost):**\n`;
  report += `1. **S&P 500 Index Fund ($3,500 outlay):**\n`;
  report += `   - Cost Basis: $${costMacBook.toFixed(2)}\n`;
  report += `   - Estimated Value in 5 years (at 8%): $${indexFundReturn5Years.toFixed(2)}\n`;
  report += `   - Net Return: +$${indexFundYield.toFixed(2)}\n`;
  report += `2. **MacBook Pro Upgrade ($3,500 outlay):**\n`;
  report += `   - Cost Basis: $${costMacBook.toFixed(2)}\n`;
  report += `   - Estimated Residual Value in 5 years (at 25% depreciation): $${hardwareValue5Years.toFixed(2)}\n`;
  report += `   - Net Asset Loss: -$${hardwareLoss.toFixed(2)}\n`;
  report += `3. **AI Subscription Scale ($3,500 outlay on credits/licenses):**\n`;
  report += `   - Estimated return is based on output scale. If 1 extra diagnostic is generated monthly (valued at $350), annual yield = $4,200. Over 5 years = $21,000.\n\n`;

  report += `**Ernesto's Question:** "${args.question}"\n\n`;
  report += `Please evaluate these scenarios, calculate the net wealth delta, and make a firm strategic recommendation. Use high-status async advisory tone.`;

  return report;
}

// ── PRIORITY ENGINE IMPLEMENTATIONS ──

async function prioritiesNext() {
  // First recalculate all priorities
  await supabase.rpc('recalculate_all_priorities');
  
  const { data, error } = await supabase
    .from('priority_tasks')
    .select('*')
    .in('status', ['pending', 'in_progress'])
    .order('priority_score', { ascending: false })
    .limit(3);
  if (error) throw error;
  if (!data || data.length === 0) return 'No pending tasks found. All clear!';

  let report = `# 🎯 Your Next 3 — Maximum Value Actions\n\n`;
  data.forEach((task, idx) => {
    const emoji = idx === 0 ? '🔥' : idx === 1 ? '⚡' : '📋';
    report += `### ${emoji} ${idx + 1}. ${task.title}\n`;
    report += `- **Priority Score:** ${Number(task.priority_score).toFixed(1)}/100 | **Quadrant:** ${task.quadrant.replace('_', ' ').toUpperCase()}\n`;
    report += `- **Category:** ${task.category} | **Energy:** ${task.energy_required} | **Effort:** ${task.effort_minutes} min\n`;
    if (task.deadline) report += `- **Deadline:** ${new Date(task.deadline).toLocaleString()}\n`;
    if (task.revenue_impact > 0) report += `- **Revenue at Risk:** $${(task.revenue_impact / 100).toFixed(2)}\n`;
    if (task.description) report += `- *${task.description}*\n`;
    report += `\n`;
  });
  return report;
}

async function prioritiesAddTask(args) {
  const { data, error } = await supabase
    .from('priority_tasks')
    .insert({
      title: args.title,
      description: args.description || null,
      category: args.category || 'manual',
      effort_minutes: args.effort_minutes || 30,
      energy_required: args.energy_required || 'shallow',
      deadline: args.deadline || null,
      revenue_impact: args.revenue_impact ? Math.round(args.revenue_impact * 100) : 0,
      learning_multiplier: args.learning_multiplier || 3,
      source_table: 'manual',
      auto_generated: false
    })
    .select('id')
    .single();
  if (error) throw error;

  await supabase.rpc('calculate_priority_score', { p_task_id: data.id });
  
  const { data: scored } = await supabase.from('priority_tasks').select('priority_score, quadrant').eq('id', data.id).single();
  
  return `✓ Task created: "${args.title}"\n  ID: ${data.id}\n  Score: ${Number(scored?.priority_score || 50).toFixed(1)}/100\n  Quadrant: ${scored?.quadrant || 'schedule'}`;
}

async function prioritiesMatrix() {
  await supabase.rpc('recalculate_all_priorities');
  
  const { data, error } = await supabase
    .from('priority_tasks')
    .select('*')
    .in('status', ['pending', 'in_progress'])
    .order('priority_score', { ascending: false });
  if (error) throw error;
  if (!data || data.length === 0) return 'No pending tasks in the matrix.';

  const quadrants = {
    do_now: { label: '🔥 DO NOW', items: [] },
    schedule: { label: '📅 SCHEDULE', items: [] },
    delegate: { label: '🤖 DELEGATE/AUTOMATE', items: [] },
    eliminate: { label: '🗑️ ELIMINATE', items: [] },
    learn: { label: '🧠 LEARN/EXPERIMENT', items: [] }
  };

  data.forEach(task => {
    const q = quadrants[task.quadrant] || quadrants.schedule;
    q.items.push(task);
  });

  let report = `# Priority Matrix — Decision Command Center\n\n`;
  for (const [key, q] of Object.entries(quadrants)) {
    report += `## ${q.label} (${q.items.length})\n`;
    if (q.items.length === 0) {
      report += `*Empty*\n\n`;
    } else {
      q.items.forEach(t => {
        report += `- [${Number(t.priority_score).toFixed(0)}] **${t.title}** — ${t.effort_minutes}min, ${t.energy_required}`;
        if (t.revenue_impact > 0) report += `, $${(t.revenue_impact / 100).toFixed(0)} at risk`;
        report += `\n`;
      });
      report += `\n`;
    }
  }
  return report;
}

async function prioritiesAutoPilot(args) {
  const availableMinutes = args.available_minutes || 60;
  
  const { data, error } = await supabase
    .from('priority_tasks')
    .select('*')
    .in('status', ['pending', 'in_progress'])
    .order('priority_score', { ascending: false });
  if (error) throw error;
  if (!data || data.length === 0) return 'No pending tasks. You are free!';

  // Greedy knapsack: pick highest-score tasks that fit in the time budget
  const selected = [];
  let remainingMinutes = availableMinutes;
  
  for (const task of data) {
    if (task.effort_minutes <= remainingMinutes) {
      selected.push(task);
      remainingMinutes -= task.effort_minutes;
    }
  }

  if (selected.length === 0) return `No tasks fit within ${availableMinutes} minutes. Try a larger time block.`;

  const totalScore = selected.reduce((s, t) => s + Number(t.priority_score), 0);
  const totalMinutes = selected.reduce((s, t) => s + t.effort_minutes, 0);

  let report = `# ⚡ Auto-Pilot Mode — ${availableMinutes} Minutes Available\n\n`;
  report += `**Optimal Selection:** ${selected.length} tasks | ${totalMinutes} min used | ${remainingMinutes} min buffer\n`;
  report += `**Combined Priority Value:** ${totalScore.toFixed(0)} points\n\n`;
  
  selected.forEach((t, idx) => {
    report += `### ${idx + 1}. ${t.title}\n`;
    report += `- Score: ${Number(t.priority_score).toFixed(1)} | Effort: ${t.effort_minutes} min | Energy: ${t.energy_required}\n`;
    if (t.description) report += `- *${t.description}*\n`;
    report += `\n`;
  });

  return report;
}

async function prioritiesExplain(args) {
  const taskId = args.task_id;
  
  const { data: task, error: taskErr } = await supabase
    .from('priority_tasks')
    .select('*')
    .eq('id', taskId)
    .single();
  if (taskErr || !task) throw new Error(`Task not found: ${taskId}`);

  const { data: log, error: logErr } = await supabase
    .from('priority_scores_log')
    .select('*')
    .eq('task_id', taskId)
    .order('snapshot_at', { ascending: false })
    .limit(1)
    .single();

  let report = `# Priority Explanation: ${task.title}\n\n`;
  report += `**Final Score:** ${Number(task.priority_score).toFixed(1)}/100\n`;
  report += `**Quadrant:** ${task.quadrant.replace('_', ' ').toUpperCase()}\n`;
  report += `**Category:** ${task.category} | **Status:** ${task.status}\n\n`;

  if (log) {
    report += `## Score Components\n`;
    report += `| Component | Raw Score | Weight | Contribution |\n`;
    report += `|-----------|-----------|--------|--------------|\n`;
    const components = [
      { name: 'Urgency', raw: log.urgency_component, weight: 30 },
      { name: 'Importance', raw: log.importance_component, weight: 25 },
      { name: 'Learning', raw: log.learning_component, weight: 15 },
      { name: 'Effort (inv)', raw: log.effort_component, weight: 10 },
      { name: 'Age', raw: log.age_component, weight: 10 },
      { name: 'Energy Match', raw: log.energy_component, weight: 10 }
    ];
    components.forEach(c => {
      const contribution = (Number(c.raw) * c.weight / 100).toFixed(1);
      report += `| ${c.name} | ${Number(c.raw).toFixed(0)}/100 | ${c.weight}% | ${contribution} |\n`;
    });
    report += `\n`;
  }

  report += `## Context\n`;
  if (task.deadline) report += `- **Deadline:** ${new Date(task.deadline).toLocaleString()}\n`;
  report += `- **Effort:** ${task.effort_minutes} minutes\n`;
  report += `- **Energy Mode:** ${task.energy_required}\n`;
  if (task.revenue_impact > 0) report += `- **Revenue Impact:** $${(task.revenue_impact / 100).toFixed(2)}\n`;
  report += `- **Learning Multiplier:** ${task.learning_multiplier}/10\n`;
  if (task.source_table) report += `- **Source:** ${task.source_table} → ${task.source_id}\n`;
  if (task.description) report += `\n*${task.description}*\n`;

  return report;
}

async function prioritiesDayPlan() {
  await supabase.rpc('recalculate_all_priorities');
  
  const { data, error } = await supabase
    .from('priority_tasks')
    .select('*')
    .in('status', ['pending', 'in_progress'])
    .order('priority_score', { ascending: false });
  if (error) throw error;
  if (!data || data.length === 0) return 'No pending tasks for the day plan.';

  // Group by energy blocks
  const blocks = {
    deep: { label: '🌅 Deep Work Block (6:00–12:00)', tasks: [], hours: '06:00' },
    analytical: { label: '🔬 Analytical Block (10:00–12:00)', tasks: [], hours: '10:00' },
    shallow: { label: '☀️ Shallow Work Block (14:00–16:00)', tasks: [], hours: '14:00' },
    admin: { label: '📋 Admin Block (16:00–18:00)', tasks: [], hours: '16:00' },
    creative: { label: '🌙 Creative Block (20:00–23:00)', tasks: [], hours: '20:00' }
  };

  data.forEach(task => {
    const b = blocks[task.energy_required] || blocks.shallow;
    b.tasks.push(task);
  });

  let totalMinutes = 0;
  let report = `# 📅 Daily Priority Plan — ${new Date().toLocaleDateString()}\n\n`;
  
  for (const [, block] of Object.entries(blocks)) {
    if (block.tasks.length === 0) continue;
    const blockMinutes = block.tasks.reduce((s, t) => s + t.effort_minutes, 0);
    totalMinutes += blockMinutes;
    report += `## ${block.label}\n`;
    report += `*${block.tasks.length} tasks — ${blockMinutes} min total*\n\n`;
    block.tasks.forEach((t, idx) => {
      report += `${idx + 1}. **${t.title}** — ${t.effort_minutes} min [Score: ${Number(t.priority_score).toFixed(0)}]\n`;
    });
    report += `\n`;
  }

  report += `---\n**Total Planned:** ${totalMinutes} min (${(totalMinutes / 60).toFixed(1)} hours)\n`;
  return report;
}

// ── TRANSFORMATION ENGINE IMPLEMENTATIONS ──

async function clientSetSegment(args) {
  const { clientId, segment } = args;
  if (!['high_ticket', 'microdosing'].includes(segment)) {
    throw new Error('Invalid segment value. Must be high_ticket or microdosing.');
  }

  const { error: clientErr } = await supabase
    .from('clients')
    .update({ segment })
    .eq('id', clientId);
  if (clientErr) throw clientErr;

  const price = segment === 'microdosing' ? 350.00 : 2000.00;
  const { error: projErr } = await supabase
    .from('beta_projects')
    .update({ symbolic_price_charged: price })
    .eq('client_id', clientId);
  if (projErr) throw projErr;

  return `✓ Client ${clientId} segment set to ${segment}. Billing price updated to $${price}.`;
}

async function learningGetDrafts(args) {
  const { articleSlug } = args;
  const { data, error } = await supabase
    .from('education_drafts')
    .select('*')
    .eq('article_slug', articleSlug)
    .order('draft_number', { ascending: true });
  if (error) throw error;
  if (!data || data.length === 0) return `No drafts found for article slug: ${articleSlug}`;

  let report = `# Socratic Drafts for: ${articleSlug}\n\n`;
  data.forEach(d => {
    report += `### 📝 Draft ${d.draft_number} (ID: ${d.id})\n`;
    report += `**Content:**\n${d.content}\n\n`;
    if (d.rating) report += `- **Rating:** ${d.rating}/5 | **Feedback:** ${d.feedback || 'None'}\n\n`;
  });
  return report;
}

async function learningRateDraft(args) {
  const { draftId, rating, feedback } = args;
  const { error } = await supabase
    .from('education_drafts')
    .update({ rating, feedback })
    .eq('id', draftId);
  if (error) throw error;

  return `✓ Draft ${draftId} rated ${rating}/5. Socratic learning preferences recorded.`;
}

async function messageHumanize(args) {
  const { messageText } = args;
  let text = messageText;
  
  text = text.replace(/Dear (.*?),/g, 'Hey $1 -');
  text = text.replace(/I am writing to you because/g, 'saw');
  text = text.replace(/Please find attached the/g, 'here is the');
  text = text.replace(/Should you have any questions/g, 'let me know if you want to chat');
  text = text.replace(/Sincerely,/g, 'Best,');
  text = text.replace(/Respectfully,/g, 'Thanks,');
  text = text.replace(/utilize/g, 'use');
  text = text.replace(/optimize/g, 'fix');
  text = text.replace(/demonstrate/g, 'show');
  
  return `# 🤖 Humanized Message Draft\n\n${text}`;
}

async function certificationList() {
  const { data, error } = await supabase
    .from('certified_practitioners')
    .select('id, certified_at, satisfaction_score, status, clients(company_name, contact_name), certification_programs(name)');
  if (error) throw error;
  if (!data || data.length === 0) return 'No certified practitioners found in database.';

  return data.map(p => {
    return `• Practitioner ID: ${p.id}\n  Client: ${p.clients?.company_name || 'N/A'} (${p.clients?.contact_name || 'N/A'})\n  Program: ${p.certification_programs?.name || 'N/A'}\n  Certified At: ${new Date(p.certified_at).toLocaleDateString()}\n  Status: [${p.status.toUpperCase()}] | CSAT: ${p.satisfaction_score || 0}%`;
  }).join('\n\n');
}

async function certificationAudit(args) {
  const { practitionerId, satisfactionScore, status } = args;
  const updates = {};
  if (satisfactionScore !== undefined) updates.satisfaction_score = satisfactionScore;
  if (status !== undefined) updates.status = status;
  updates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('certified_practitioners')
    .update(updates)
    .eq('id', practitionerId);
  if (error) throw error;

  return `✓ Success: Audited practitioner ${practitionerId}. Updated values: ${JSON.stringify(updates)}`;
}

async function guaranteeStatus() {
  const { data, error } = await supabase
    .from('performance_guarantees')
    .select('id, target_improvement_pct, timeframe_days, traffic_gate_met, sla_gate_met, isolation_gate_met, telemetry_gate_met, baseline_conversion_rate, current_conversion_rate, guarantee_status, started_at, expires_at, beta_projects(clients(company_name))');
  if (error) throw error;
  if (!data || data.length === 0) return 'No active performance guarantees found in database.';

  return data.map(g => {
    return `• Guarantee ID: ${g.id}\n  Project Client: ${g.beta_projects?.clients?.company_name || 'N/A'}\n  Status: [${g.guarantee_status.toUpperCase()}]\n  Target Improvement: ${g.target_improvement_pct}% | Current: ${g.current_conversion_rate}%\n  Gates Met: Traffic (${g.traffic_gate_met ? 'YES' : 'NO'}), SLA (${g.sla_gate_met ? 'YES' : 'NO'}), Isolation (${g.isolation_gate_met ? 'YES' : 'NO'}), Telemetry (${g.telemetry_gate_met ? 'YES' : 'NO'})\n  Started At: ${new Date(g.started_at).toLocaleDateString()} | Expires: ${new Date(g.expires_at).toLocaleDateString()}`;
  }).join('\n\n');
}

async function learningHyperLeapChallenge(args) {
  const category = args.category || 'all';
  const challenges = [
    {
      title: "TikTok India Onboarding Collapse",
      category: "Technical & Behavioral",
      description: "Conversion from install to signup plummeted by 45%. Average time spent on registration form: 4.8 minutes. High packet loss on 3G and SMS OTP delay.",
      correctOption: "Trust Deficit or Sequence Order (SMS OTP delay during onboarding)"
    },
    {
      title: "Figma Enterprise Paywall Anxiety",
      category: "UX & Pricing",
      description: "Enterprise users navigate to payment page but exit within 15 seconds. High click-through on upgrade trigger, but zero purchases. Self-serve plan.",
      correctOption: "Cognitive Load (too many payment fields and undefined security indicators)"
    },
    {
      title: "Vercel Analytics Opt-in Drop",
      category: "Privacy & Conversions",
      description: "Popup asking for telemetry consent triggers 70% bounce rate on first visit. The message focuses on 'Usage optimization data sharing'.",
      correctOption: "Trust Deficit (Lacks value offset for sharing analytics)"
    },
    {
      title: "$50M SaaS Company Asian Expansion Collapse",
      category: "Cross-Border Tax & Payment",
      description: "Conversion drops by 60% on Singapore/Japan local checkouts. User dropoff occurs at pricing plan confirmation (4.2 minutes average latency). Payments are settled in USD with US gateway routing.",
      correctOption: "Trust & Cognitive (Lack of local payment channels JPY/JCB/PayNow and USD billing discrepancy)"
    }
  ];

  const filtered = category === 'all' 
    ? challenges 
    : challenges.filter(c => c.category.toLowerCase().includes(category.toLowerCase()));

  return `# 🧠 Socratic Hyper-Leap Challenges\n\n` + filtered.map((c, idx) => {
    return `### Challenge ${idx + 1}: ${c.title} (${c.category})\n- **Scenario:** ${c.description}\n- **Hint:** Focus on Fogg Behavioral Model criteria (Motivation vs. Ability).`;
  }).join('\n\n');
}

// ── STRIPE INTEGRATION IMPLEMENTATIONS ──

async function stripeListProducts() {
  const stripeApiKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
  const isMock = !stripeApiKey || stripeApiKey === 'sk_test_placeholder';

  let products = [];
  let modeMessage = "";

  if (isMock) {
    modeMessage = "⚠️ [SANDBOX MODE] Using database mock payment links (STRIPE_SECRET_KEY is a placeholder)";
    const { data, error } = await supabase
      .from('stripe_payment_links')
      .select('*');
    if (error) {
      products = [
        { product_name: 'DFY Beta Diagnostic', price_id: 'price_dfy_beta_diagnostic', amount: 200000, payment_link_url: 'https://buy.stripe.com/mock_dfy_beta_diagnostic', segment: 'high_ticket' },
        { product_name: 'DWY Beta Diagnostic', price_id: 'price_dwy_beta_diagnostic', amount: 35000, payment_link_url: 'https://buy.stripe.com/mock_dwy_beta_diagnostic', segment: 'microdosing' }
      ];
    } else {
      products = data;
    }
  } else {
    modeMessage = "🟢 [LIVE MODE] Fetching products and prices directly from Stripe API";
    try {
      const res = await fetch('https://api.stripe.com/v1/prices?active=true&expand[]=product', {
        headers: {
          'Authorization': `Bearer ${stripeApiKey}`
        }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || `HTTP error ${res.status}`);
      }
      const data = await res.json();
      products = data.data.map(p => ({
        product_name: p.product?.name || 'Unknown Product',
        price_id: p.id,
        amount: p.unit_amount,
        payment_link_url: `https://dashboard.stripe.com/prices/${p.id}`,
        segment: p.product?.metadata?.segment || 'general'
      }));
    } catch (err) {
      modeMessage = `⚠️ [STRIPE API ERROR] Fallback to database mock payment links. Error: ${err.message}`;
      const { data } = await supabase.from('stripe_payment_links').select('*');
      products = data || [];
    }
  }

  let report = `# 📦 Stripe Products & Pricing Plan\n\n`;
  report += `**Status:** ${modeMessage}\n\n`;
  report += `| Product Name | Price ID | Amount | Segment | Payment Link |\n`;
  report += `|--------------|----------|--------|---------|--------------|\n`;
  products.forEach(p => {
    const formattedAmount = p.amount ? `$${(p.amount / 100).toFixed(2)}` : 'N/A';
    report += `| ${p.product_name} | \`${p.price_id}\` | ${formattedAmount} | \`${p.segment}\` | [Link](${p.payment_link_url}) |\n`;
  });
  
  return report;
}

async function stripeCreatePaymentLink(args) {
  const { priceId, clientId } = args;
  const stripeApiKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
  const isMock = !stripeApiKey || stripeApiKey === 'sk_test_placeholder';

  let paymentLinkUrl = "";
  let modeMessage = "";

  if (isMock) {
    modeMessage = "⚠️ [SANDBOX MODE] Generated simulated payment link (STRIPE_SECRET_KEY is placeholder)";
    const { data } = await supabase
      .from('stripe_payment_links')
      .select('payment_link_url')
      .eq('price_id', priceId)
      .maybeSingle();
    if (data && data.payment_link_url) {
      paymentLinkUrl = data.payment_link_url;
    } else {
      paymentLinkUrl = `https://buy.stripe.com/mock_${priceId}`;
    }
    if (clientId) {
      paymentLinkUrl += `?client_id=${encodeURIComponent(clientId)}`;
    }
  } else {
    try {
      const body = new URLSearchParams();
      body.append('line_items[0][price]', priceId);
      body.append('line_items[0][quantity]', '1');
      if (clientId) {
        body.append('metadata[client_id]', clientId);
      }

      const res = await fetch('https://api.stripe.com/v1/payment_links', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeApiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || `HTTP error ${res.status}`);
      }

      const data = await res.json();
      paymentLinkUrl = data.url;
      modeMessage = "🟢 [LIVE MODE] Stripe payment link created successfully";

      await supabase
        .from('stripe_payment_links')
        .upsert({
          price_id: priceId,
          payment_link_url: paymentLinkUrl,
          amount: data.line_items?.data?.[0]?.price?.unit_amount || null
        }, { onConflict: 'price_id' });

    } catch (err) {
      modeMessage = `⚠️ [STRIPE API ERROR] Fallback to simulated payment link. Error: ${err.message}`;
      const { data } = await supabase
        .from('stripe_payment_links')
        .select('payment_link_url')
        .eq('price_id', priceId)
        .maybeSingle();
      paymentLinkUrl = data?.payment_link_url || `https://buy.stripe.com/mock_${priceId}`;
      if (clientId) {
        paymentLinkUrl += `?client_id=${encodeURIComponent(clientId)}`;
      }
    }
  }

  let report = `# 🔗 Stripe Payment Link Generated\n\n`;
  report += `**Status:** ${modeMessage}\n`;
  report += `- **Price ID:** \`${priceId}\`\n`;
  if (clientId) {
    report += `- **Client ID:** \`${clientId}\`\n`;
  }
  report += `- **Checkout URL:** [Open Checkout Link](${paymentLinkUrl})\n\n`;
  report += `*Copy the URL above to send directly to the client or embed in confirmation workflows.*`;

  return report;
}

async function stripeGetRevenue() {
  const stripeApiKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
  const isMock = !stripeApiKey || stripeApiKey === 'sk_test_placeholder';

  let grossVolumeCents = 14585000;
  let mrrCents = 1250000;
  let refundsCents = 105000;
  let activeSubscriptionsCount = 5;
  let refundsCount = 3;
  let modeMessage = "";

  if (isMock) {
    modeMessage = "⚠️ [SANDBOX MODE] Providing simulated/cached telemetry stats (STRIPE_SECRET_KEY is a placeholder)";
    
    try {
      const { count: clientCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });
      
      const { data: dbTransactions } = await supabase
        .from('transactions')
        .select('*, transaction_entries(*, accounts(*))')
        .order('created_at', { ascending: false });

      let dynamicRevenue = 0;
      if (dbTransactions) {
        dbTransactions.forEach(tx => {
          tx.transaction_entries?.forEach(entry => {
            if (entry.accounts?.name === 'Consulting Revenue') {
              dynamicRevenue += entry.amount;
            }
          });
        });
      }
      if (dynamicRevenue > 0) {
        grossVolumeCents = dynamicRevenue;
      }
    } catch (e) {
      // Ignore database errors
    }
  } else {
    modeMessage = "🟢 [LIVE MODE] Fetching real-time telemetry stats from Stripe API";
    try {
      const chargesRes = await fetch('https://api.stripe.com/v1/charges?limit=100', {
        headers: { 'Authorization': `Bearer ${stripeApiKey}` }
      });
      if (chargesRes.ok) {
        const chargesData = await chargesRes.json();
        const paidCharges = chargesData.data?.filter(c => c.paid && !c.refunded) || [];
        grossVolumeCents = paidCharges.reduce((sum, c) => sum + (c.amount || 0), 0);
      }

      const subsRes = await fetch('https://api.stripe.com/v1/subscriptions?status=active&limit=100', {
        headers: { 'Authorization': `Bearer ${stripeApiKey}` }
      });
      if (subsRes.ok) {
        const subsData = await subsRes.json();
        activeSubscriptionsCount = subsData.data?.length || 0;
        mrrCents = subsData.data?.reduce((sum, sub) => {
          const price = sub.items?.data?.[0]?.price;
          if (price && price.unit_amount) {
            const period = price.recurring?.interval || 'month';
            let amount = price.unit_amount;
            if (period === 'year') amount = Math.round(amount / 12);
            else if (period === 'week') amount = amount * 4;
            return sum + amount;
          }
          return sum;
        }, 0) || 0;
      }

      const refundsRes = await fetch('https://api.stripe.com/v1/refunds?limit=100', {
        headers: { 'Authorization': `Bearer ${stripeApiKey}` }
      });
      if (refundsRes.ok) {
        const refundsData = await refundsRes.json();
        refundsCount = refundsData.data?.length || 0;
        refundsCents = refundsData.data?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
      }
    } catch (err) {
      modeMessage = `⚠️ [STRIPE API ERROR] Fallback to simulated/cached stats. Error: ${err.message}`;
    }
  }

  const grossUSD = (grossVolumeCents / 100).toFixed(2);
  const mrrUSD = (mrrCents / 100).toFixed(2);
  const refundsUSD = (refundsCents / 100).toFixed(2);

  let report = `# 📊 Stripe Telemetry & Revenue Report\n\n`;
  report += `**Status:** ${modeMessage}\n\n`;
  report += `## Key Metrics\n`;
  report += `- **Gross Transaction Volume:** **$${grossUSD}**\n`;
  report += `- **Active MRR (Monthly Recurring):** **$${mrrUSD}** (from ${activeSubscriptionsCount} active subscriptions)\n`;
  report += `- **Total Refunds Processed:** **$${refundsUSD}** (${refundsCount} refund events)\n\n`;
  report += `## Revenue Quality Index\n`;
  
  const refundRate = grossVolumeCents > 0 ? (refundsCents / grossVolumeCents) * 100 : 0;
  let rqi = 100 - refundRate;
  if (rqi < 0) rqi = 0;
  
  report += `- **Refund/Loss Rate:** ${refundRate.toFixed(2)}%\n`;
  report += `- **Revenue Retention Score (RQI):** ${rqi.toFixed(1)}/100\n\n`;
  report += `*Telemetry compiled on: ${new Date().toISOString()}*`;

  return report;
}
