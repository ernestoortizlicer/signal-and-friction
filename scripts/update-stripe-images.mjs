/**
 * Sync all 13 Stripe Product image URLs to the immutable V2 identity assets.
 * Run only after the production asset URLs have been verified.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) { console.error("Missing STRIPE_SECRET_KEY"); process.exit(1); }

const BASE_URL = "https://signal-and-friction.com/product-icons-v2";

const PRODUCTS = [
  { prodId: "prod_UjbGk6uJJuhmc8", slug: "dfy-beta-diagnostic" },
  { prodId: "prod_UjbGqIkzB3aNhx", slug: "dfy-intervention" },
  { prodId: "prod_UjbG5z0DfYaKPu", slug: "dfy-monitoring" },
  { prodId: "prod_UjbGCCliLjOqaE", slug: "dfy-expansion" },
  { prodId: "prod_UjbGq5PkwVo0NS", slug: "dfy-autonomy-kit" },
  { prodId: "prod_UjbGLyDDRfTkuA", slug: "dwy-beta-diagnostic" },
  { prodId: "prod_UjbGpve3RwaDPD", slug: "dwy-intervention" },
  { prodId: "prod_UjbGARVc0TJdB7", slug: "dwy-monitoring" },
  { prodId: "prod_UjbGviam3N3Cex", slug: "dwy-expansion" },
  { prodId: "prod_UjbGzWObnAiN08", slug: "dwy-autonomy-kit" },
  { prodId: "prod_UjbG8khYzoP8HC", slug: "certified-practitioner" },
  { prodId: "prod_UjbGRMSWIhNXma", slug: "certified-agency" },
  { prodId: "prod_UkLWeJD32pT2ej", slug: "certified-renewal" },
];

async function run() {
  for (const { prodId, slug } of PRODUCTS) {
    const imageUrl = `${BASE_URL}/${slug}.png`;
    const params = new URLSearchParams();
    params.append("images[]", imageUrl);
    const res = await fetch(`https://api.stripe.com/v1/products/${prodId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`${slug}: ${data.error?.message || res.status}`);
    console.log(`✓ ${data.name} → ${data.images[0]}`);
  }
  console.log("Stripe product imagery V2 synchronized across all 13 Products.");
}

run().catch(err => { console.error(err.message); process.exit(1); });
