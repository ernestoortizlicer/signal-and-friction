import fs from "fs";
import path from "path";
import { ACME_FALLBACK, DeliverableData } from "../fallback";
import DeliverableClientView from "./DeliverableClientView";

export async function generateStaticParams() {
  const paramsList = [{ clientKey: "acme-corp" }];

  try {
    const DELIVERABLES_DIR = path.join(process.cwd(), 'public', 'deliverables');
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

  return <DeliverableClientView data={data} />;
}
