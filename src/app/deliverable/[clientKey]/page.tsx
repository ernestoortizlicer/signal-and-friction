import fs from "fs";
import path from "path";
import { ACME_FALLBACK, DeliverableData } from "../fallback";
import DeliverableClientView from "./DeliverableClientView";

export async function generateStaticParams() {
  // Hardcoded baseline — guaranteed regardless of filesystem availability during build.
  // Add new clientKeys here when creating new deliverable JSON files.
  const known = new Set(["acme-corp", "command-center-guide"]);

  try {
    const DELIVERABLES_DIR = path.join(process.cwd(), 'public', 'deliverables');
    if (fs.existsSync(DELIVERABLES_DIR)) {
      for (const file of fs.readdirSync(DELIVERABLES_DIR)) {
        if (file.endsWith('.json')) known.add(file.replace('.json', ''));
      }
    }
  } catch (e) {
    console.error("generateStaticParams: filesystem scan failed, using hardcoded list", e);
  }

  return Array.from(known).map((clientKey) => ({ clientKey }));
}

export default async function Page({ params }: { params: Promise<{ clientKey: string }> }) {
  const { clientKey } = await params;
  
  let data: DeliverableData = ACME_FALLBACK;

  const DELIVERABLES_DIR = path.join(process.cwd(), 'public', 'deliverables');
  const filePath = path.join(DELIVERABLES_DIR, `${clientKey}.json`);

  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      data = JSON.parse(content);
    } catch (e) {
      console.error("Error parsing deliverable JSON", e);
    }
  }

  return <DeliverableClientView data={data} staticClientKey={clientKey} />;
}
