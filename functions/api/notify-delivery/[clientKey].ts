import { requireAdmin } from "../_admin-auth";
import { getSupabaseUrl, getServiceRoleKey } from "../_env";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

export const onRequestPost = async ({
  params,
  request,
  env,
}: {
  params: { clientKey: string };
  request: Request;
  env: Record<string, string>;
}) => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) {
    const body = await admin.json().catch(() => ({}));
    return Response.json(body, { status: admin.status, headers: CORS });
  }

  const { clientKey } = params;
  const supabaseUrl = getSupabaseUrl(env);
  const serviceKey = getServiceRoleKey(env);
  const resendKey = env.RESEND_API_KEY;

  if (!resendKey) {
    return Response.json(
      { error: "RESEND_API_KEY not configured" },
      { status: 500, headers: CORS }
    );
  }
  if (!serviceKey) {
    return Response.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not configured" },
      { status: 500, headers: CORS }
    );
  }

  const sbHeaders = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  let clientId: string;

  try {
    const body: Record<string, string> = await request.json();
    clientId = body.clientId;
  } catch {
    return Response.json(
      { error: "Invalid request body" },
      { status: 400, headers: CORS }
    );
  }

  if (!clientId) {
    return Response.json(
      { error: "clientId is required" },
      { status: 400, headers: CORS }
    );
  }

  // The recipient always comes from the DB record for clientId — never
  // from the request body. A caller could otherwise supply any clientId
  // (even a real one) alongside an attacker-controlled clientEmail and get
  // this endpoint to send a legitimate-looking "diagnostic ready" email,
  // from our domain, to an address that has nothing to do with the client.
  const clientRes = await fetch(
    `${supabaseUrl}/rest/v1/clients?id=eq.${encodeURIComponent(clientId)}&select=contact_email,contact_name,company_name`,
    { headers: sbHeaders }
  );
  if (!clientRes.ok) {
    return Response.json(
      { error: "Failed to look up client" },
      { status: 502, headers: CORS }
    );
  }
  const clientRows: Array<{ contact_email: string; contact_name?: string; company_name?: string }> =
    await clientRes.json();
  const client = clientRows[0];
  if (!client?.contact_email) {
    return Response.json(
      { error: "Client not found" },
      { status: 404, headers: CORS }
    );
  }

  const clientEmail = client.contact_email;
  const clientName = client.contact_name || client.company_name || "";

  // Idempotency: check if notification already sent for this client
  try {
    const resCheck = await fetch(
      `${supabaseUrl}/rest/v1/activity_log?client_id=eq.${encodeURIComponent(clientId)}&message=like.*delivery_notification_sent*&limit=1`,
      { headers: sbHeaders }
    );
    if (resCheck.ok) {
      const existing: unknown[] = await resCheck.json();
      if (existing.length > 0) {
        return Response.json(
          { skipped: true, reason: "Notification already sent" },
          { headers: CORS }
        );
      }
    }
  } catch {
    // non-fatal — proceed with send
  }

  const deliverableUrl = `https://signal-and-friction.com/deliverable/${clientKey}?cid=${encodeURIComponent(clientId)}`;

  // Send via Resend REST API (no SDK — native fetch, CF Worker compatible)
  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Signal & Friction <hello@signal-and-friction.com>",
      to: [clientEmail],
      subject: "Your Signal & Friction Diagnostic Is Ready",
      html: buildEmail(clientName, deliverableUrl),
    }),
  });

  if (!resendRes.ok) {
    const detail = await resendRes.text();
    return Response.json(
      { error: "Resend API error", detail },
      { status: 502, headers: CORS }
    );
  }

  // Log to activity_log — idempotency anchor
  await fetch(`${supabaseUrl}/rest/v1/activity_log`, {
    method: "POST",
    headers: sbHeaders,
    body: JSON.stringify({
      client_id: clientId,
      message: `delivery_notification_sent — Email dispatched to ${clientEmail} · ${deliverableUrl}`,
      created_at: new Date().toISOString(),
    }),
  }).catch(() => {});

  return Response.json({ sent: true, to: clientEmail }, { headers: CORS });
};

export const onRequestOptions = () =>
  new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });

function buildEmail(clientName: string, deliverableUrl: string): string {
  const greeting = clientName ? `${clientName}` : "there";

  const items: [string, string, string][] = [
    [
      "🎬",
      "Loom Video Walkthrough",
      "A full screen-recorded breakdown of your funnel — annotated, precise, and actionable.",
    ],
    [
      "⚡",
      "One Recommendation, With a Range",
      "A single evidence-grounded decision and a projected impact range — not three options, not a fixed promise.",
    ],
    [
      "📊",
      "Evidence, Tiered by Confidence",
      "Every claim marked measured, modeled, or pending — plus a stated confidence level for the diagnosis as a whole.",
    ],
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Your Signal &amp; Friction Diagnostic Is Ready</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0908;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0A0908;">
  <tr>
    <td align="center" style="padding:48px 16px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"
        style="max-width:600px;width:100%;background-color:#110F0D;border:1px solid rgba(212,168,83,0.2);border-radius:16px;overflow:hidden;">

        <!-- Logo / Header -->
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid rgba(212,168,83,0.1);">
            <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:rgba(212,168,83,0.5);font-family:monospace;">
              Signal &amp; Friction · 72h Protocol
            </p>
            <p style="margin:0;font-size:22px;font-weight:700;color:#D4A853;letter-spacing:-0.5px;">
              Signal &amp; Friction
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <p style="margin:0 0 6px;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(212,168,83,0.5);font-family:monospace;">
              Deliverable ready
            </p>
            <h1 style="margin:0 0 28px;font-size:28px;font-weight:700;color:#F5F0EB;line-height:1.25;letter-spacing:-0.5px;">
              Your diagnostic is<br>waiting for you.
            </h1>

            <p style="margin:0 0 16px;font-size:15px;color:#9A8F82;line-height:1.7;">
              Hi ${greeting} —
            </p>
            <p style="margin:0 0 16px;font-size:15px;color:#9A8F82;line-height:1.7;">
              Your friction diagnostic is complete. We've analyzed your funnel,
              isolated the friction mechanism, and produced one evidence-grounded
              recommendation — Loom walkthrough included.
            </p>
            <p style="margin:0 0 32px;font-size:15px;color:#9A8F82;line-height:1.7;">
              The 72-hour protocol has been fulfilled. Everything is waiting in your
              diagnostic portal.
            </p>

            <!-- CTA -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
              <tr>
                <td style="background-color:#D4A853;border-radius:8px;">
                  <a href="${deliverableUrl}" target="_blank"
                    style="display:inline-block;padding:14px 36px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#0A0908;text-decoration:none;font-family:monospace;">
                    View My Diagnostic →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 32px;font-size:11px;color:rgba(212,168,83,0.35);font-family:monospace;word-break:break-all;">
              ${deliverableUrl}
            </p>

            <hr style="border:none;border-top:1px solid rgba(212,168,83,0.08);margin:0 0 32px;">

            <!-- What's inside -->
            <p style="margin:0 0 16px;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(212,168,83,0.5);font-family:monospace;">
              What's inside
            </p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              ${items
                .map(
                  ([icon, title, desc]) => `
              <tr>
                <td style="padding:14px 0;border-bottom:1px solid rgba(212,168,83,0.06);">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td style="font-size:20px;padding-right:16px;vertical-align:top;padding-top:2px;">${icon}</td>
                      <td>
                        <p style="margin:0 0 3px;font-size:13px;font-weight:700;color:#F5F0EB;">${title}</p>
                        <p style="margin:0;font-size:12px;color:#7A6F65;line-height:1.55;">${desc}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`
                )
                .join("")}
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;border-top:1px solid rgba(212,168,83,0.08);">
            <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(212,168,83,0.25);font-family:monospace;">
              Signal &amp; Friction · signal-and-friction.com
            </p>
            <p style="margin:0;font-size:11px;color:rgba(154,143,130,0.4);line-height:1.55;">
              This message was sent automatically by the Signal &amp; Friction 72h Protocol.
              Reply to this email if you have any questions.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
