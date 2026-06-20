// ════════════════════════════════════════════════════════════
// SUPABASE EDGE FUNCTION: OUTREACH SCANNER
// Path: supabase/functions/outreach-scanner/index.ts
// Description: Hourly cron job to detect stale outreach (>72h)
// ════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

interface StaleProject {
  id: string;
  status: string;
  outreach_sent_at: string;
  client_id: string;
  clients: {
    company_name: string;
    contact_name: string;
  } | null;
}

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const slackWebhookUrl = Deno.env.get("SLACK_WEBHOOK_URL") ?? "";
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Calculate the threshold timestamp (72 hours ago)
    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() - 72);
    
    // 1. Fetch outreach_sent projects older than 72 hours with no update
    const { data: staleProjects, error: fetchError } = await supabase
      .from("beta_projects")
      .select(`
        id,
        status,
        outreach_sent_at,
        client_id,
        clients (
          company_name,
          contact_name
        )
      `)
      .eq("status", "outreach_sent")
      .lt("outreach_sent_at", thresholdDate.toISOString());
      
    if (fetchError) throw fetchError;
    
    if (!staleProjects || staleProjects.length === 0) {
      return new Response(JSON.stringify({ status: "success", message: "No stale outreach detected." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    const alerts = [];
    
    for (const project of staleProjects as StaleProject[]) {
      const client = project.clients;
      if (!client) continue;
      const title = `Follow-up Required: ${client.company_name}`;
      const description = `Outreach sent to ${client.contact_name} has exceeded 72 hours with no response. Send follow-up.`;
      
      // 2. Insert follow-up reminder task (idempotent check)
      const { data: existingTasks } = await supabase
        .from("tasks")
        .select("id")
        .eq("client_id", project.client_id)
        .eq("title", title)
        .eq("is_completed", false);
        
      if (!existingTasks || existingTasks.length === 0) {
        const due = new Date();
        due.setHours(due.getHours() + 24); // Due tomorrow
        
        await supabase.from("tasks").insert({
          client_id: project.client_id,
          title,
          description,
          due_date: due.toISOString()
        });
        
        // 3. Optional: Trigger webhook alert
        if (slackWebhookUrl) {
          await fetch(slackWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: `⚠️ *STALE OUTREACH ALERT* ⚠️\n*Client:* ${client.company_name} (${client.contact_name})\n*Sent At:* ${project.outreach_sent_at}\n👉 Please trigger custom command \`/beta:request-testimonial\` or send follow-up.`
            })
          });
        }
        
        alerts.push({ client: client.company_name, action: "task_created" });
      }
    }
    
    return new Response(JSON.stringify({ status: "success", processed: alerts }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    return new Response(JSON.stringify({ status: "error", message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
