import fs from "fs";
import path from "path";
import { ACME_FALLBACK, COMMAND_CENTER_GUIDE, DeliverableData } from "../fallback";
import DeliverableClientView from "./DeliverableClientView";

// Bundled deliverables — data compiled into the build, no filesystem dependency.
// Add new entries here when creating a new client deliverable.
const BUNDLED: Record<string, DeliverableData> = {
  "command-center-guide": COMMAND_CENTER_GUIDE,
};

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

  // 1. Bundled constant (compiled into build — always available)
  if (BUNDLED[clientKey]) {
    return <DeliverableClientView data={BUNDLED[clientKey]} staticClientKey={clientKey} />;
  }

  // 2. JSON file in public/deliverables/ (for dynamically added clients)
  let data: DeliverableData = ACME_FALLBACK;
  try {
    const filePath = path.join(process.cwd(), 'public', 'deliverables', `${clientKey}.json`);
    if (fs.existsSync(filePath)) {
      data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  } catch (e) {
    console.error("Error loading deliverable JSON", e);
  }

  return <DeliverableClientView data={data} staticClientKey={clientKey} />;
}
