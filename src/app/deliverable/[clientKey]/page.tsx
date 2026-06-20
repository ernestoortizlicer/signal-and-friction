import fs from "fs";
import path from "path";
import { ACME_FALLBACK, DeliverableData } from "../fallback";
import DeliverableClientView from "./DeliverableClientView";

export async function generateStaticParams() {
  const paramsList = [{ clientKey: "acme-corp" }];
  
  // Try scanning db/leads
  try {
    const LEADS_DIR = '/Users/ernestoortiz/Downloads/Claude/db/leads';
    if (fs.existsSync(LEADS_DIR)) {
      const files = fs.readdirSync(LEADS_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const clientKey = file.replace('.json', '');
          if (!paramsList.some(p => p.clientKey === clientKey)) {
            paramsList.push({ clientKey });
          }
        }
      }
    }
  } catch (e) {
    console.error("Error reading LEADS_DIR in generateStaticParams", e);
  }

  // Try scanning public/deliverables
  try {
    const DELIVERABLES_DIR = '/Users/ernestoortiz/Downloads/Claude/signal-and-friction-app/public/deliverables';
    if (fs.existsSync(DELIVERABLES_DIR)) {
      const files = fs.readdirSync(DELIVERABLES_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const clientKey = file.replace('.json', '');
          if (!paramsList.some(p => p.clientKey === clientKey)) {
            paramsList.push({ clientKey });
          }
        }
      }
    }
  } catch (e) {
    console.error("Error reading DELIVERABLES_DIR in generateStaticParams", e);
  }

  return paramsList;
}

export default async function Page({ params }: { params: Promise<{ clientKey: string }> }) {
  const { clientKey } = await params;
  
  let data: DeliverableData = ACME_FALLBACK;
  
  // Try to load from deliverables directory
  const DELIVERABLES_DIR = '/Users/ernestoortiz/Downloads/Claude/signal-and-friction-app/public/deliverables';
  const filePath = path.join(DELIVERABLES_DIR, `${clientKey}.json`);
  
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      data = JSON.parse(content);
    } catch (e) {
      console.error("Error parsing deliverable JSON", e);
    }
  } else if (clientKey !== "acme-corp") {
    // If it's not acme-corp and file doesn't exist, we try reading db/leads to build a dynamic view
    const LEADS_DIR = '/Users/ernestoortiz/Downloads/Claude/db/leads';
    const leadFilePath = path.join(LEADS_DIR, `${clientKey}.json`);
    if (fs.existsSync(leadFilePath)) {
      try {
        const content = fs.readFileSync(leadFilePath, "utf-8");
        const lead = JSON.parse(content);
        data = {
          clientName: lead.companyName,
          date: new Date(lead.submittedAt || "2026-06-17T12:00:00Z").toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          consultant: "Signal & Friction",
          loomUrl: "",
          diagnosis: {
            signal: lead.intakeData?.problemStatement || "Diagnostics assessment in progress.",
            friction: {
              mechanism: "Cognitive Load",
              rootCause: "Underlying friction vectors are currently being mathematically isolated."
            },
            decisions: [
              {
                type: "A — Progressive",
                label: "Strategic optimization under review",
                action: "High-status outcome strategic plays are currently being formulated.",
                reasoning: "Reasoning and choice architecture models are being simulated.",
                tradeoff: "ROI and pipeline trade-offs are being estimated under private local hardware sandboxing."
              }
            ]
          }
        };
      } catch (e) {
        console.error("Error parsing lead JSON", e);
      }
    }
  }

  return <DeliverableClientView data={data} />;
}
