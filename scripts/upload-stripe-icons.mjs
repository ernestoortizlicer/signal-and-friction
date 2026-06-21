/**
 * upload-stripe-icons.mjs
 * Uploads product PNG icons to Stripe as product images.
 * Usage: node scripts/upload-stripe-icons.mjs
 */
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.join(__dirname, "../public/product-icons");
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_KEY) { console.error("Missing STRIPE_SECRET_KEY"); process.exit(1); }

const PRODUCT_MAP = [
  { slug: "dfy-beta-diagnostic",   prodId: "prod_UjbGk6uJJuhmc8" },
  { slug: "dfy-intervention",      prodId: "prod_UjbGqIkzB3aNhx" },
  { slug: "dfy-monitoring",        prodId: "prod_UjbG5z0DfYaKPu" },
  { slug: "dfy-expansion",         prodId: "prod_UjbGCCliLjOqaE" },
  { slug: "dfy-autonomy-kit",      prodId: "prod_UjbGq5PkwVo0NS" },
  { slug: "dwy-beta-diagnostic",   prodId: "prod_UjbGLyDDRfTkuA" },
  { slug: "dwy-intervention",      prodId: "prod_UjbGpve3RwaDPD" },
  { slug: "dwy-monitoring",        prodId: "prod_UjbGARVc0TJdB7" },
  { slug: "dwy-expansion",         prodId: "prod_UjbGviam3N3Cex" },
  { slug: "dwy-autonomy-kit",      prodId: "prod_UjbGzWObnAiN08" },
  { slug: "certified-practitioner",prodId: "prod_UjbG8khYzoP8HC" },
  { slug: "certified-agency",      prodId: "prod_UjbGRMSWIhNXma" },
];

async function uploadFile(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const formData = new FormData();
  formData.append("purpose", "product_image");
  formData.append("file", new Blob([fileBuffer], { type: "image/png" }), fileName);

  const res = await fetch("https://files.stripe.com/v1/files", {
    method: "POST",
    headers: { "Authorization": `Bearer ${STRIPE_KEY}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Upload failed");
  return data.id;
}

async function attachImageToProduct(productId, fileId) {
  const params = new URLSearchParams();
  params.append("images[]", `https://files.stripe.com/v1/files/${fileId}/contents`);
  const res = await fetch(`https://api.stripe.com/v1/products/${productId}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${STRIPE_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Product update failed");
  return data;
}

async function run() {
  console.log("Uploading product icons to Stripe...\n");
  for (const { slug, prodId } of PRODUCT_MAP) {
    const filePath = path.join(ICONS_DIR, `${slug}.png`);
    if (!fs.existsSync(filePath)) { console.log(`⚠  ${slug}.png not found — skipped`); continue; }
    try {
      const fileId = await uploadFile(filePath);
      await attachImageToProduct(prodId, fileId);
      console.log(`✅  ${slug} → ${prodId}`);
    } catch (err) {
      console.log(`❌  ${slug}: ${err.message}`);
    }
  }
  console.log("\nDone.");
}

run().catch(err => { console.error(err.message); process.exit(1); });
