# ACTIVATION GUIDE — Signal & Friction
**Step-by-step instructions to go live with real revenue** | 2026-06-19

This document contains the exact steps to activate the 3 blockers currently preventing real revenue: the Stripe secret key, the admin password, and the 12 payment links.

---

## STEP 1: STRIPE SECRET KEY (CRITICAL — without this, all payments are simulated)

### 1.1 — Obtain the Real Secret Key

1. Open https://dashboard.stripe.com
2. Log in to your Stripe account
3. Click **Developers** in the top menu
4. Click **API Keys**
5. Under "Secret key", click **Reveal live key**
6. Copy the key — it starts with `sk_live_...`

> If you want to test first (recommended), use the **Test mode** toggle and copy the `sk_test_...` key to run dry-run tests without real charges.

### 1.2 — Replace the Key in the Project

Open the file:
```
/Users/ernestoortiz/Downloads/Claude/signal-and-friction-app/.env.local
```

Find this line:
```
STRIPE_SECRET_KEY=sk_test_placeholder
```

Replace with your real key:
```
STRIPE_SECRET_KEY=sk_live_YOUR_REAL_KEY_HERE
```

Save the file.

### 1.3 — Rebuild and Redeploy

Run these commands in Terminal from the project directory:

```bash
cd /Users/ernestoortiz/Downloads/Claude/signal-and-friction-app

# Clean build
rm -rf out .next && npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy out/ --project-name signal-and-friction --branch main
```

Copy the deployment URL that appears at the end (e.g., `https://XXXXXXXX.signal-and-friction.pages.dev`).

### 1.4 — Update Supabase Edge Function Secrets

The Stripe key is also used by the Edge Functions. Update it in Supabase:

1. Open https://supabase.com/dashboard/project/tsaarsuuclvkjsgjcmoj/functions
2. For each function (`stripe-refund`, `stripe-invoice`, `certification-onboarding`):
   - Click the function name
   - Click **Secrets** tab
   - Set `STRIPE_SECRET_KEY` = your `sk_live_...` key
   - Click **Save**

---

## STEP 2: ADMIN PASSWORD (CRITICAL — without this, you cannot access the dashboard)

### 2.1 — Set Password via Supabase Auth

1. Open https://supabase.com/dashboard/project/tsaarsuuclvkjsgjcmoj/auth/users
2. Find the user `ernestoortizlicer@gmail.com`
   - If the user does NOT exist yet: click **Add user** → enter your email + a strong password
   - If the user EXISTS: click the three-dot menu → **Reset password** or **Edit user** → set a new password

> **Password requirements:** Minimum 12 characters. Use a mix of uppercase, lowercase, numbers, and symbols. Store it in your password manager (1Password, Bitwarden) immediately.

### 2.2 — Verify Admin Login

1. Open https://signal-and-friction.com/admin/login
2. Select **Access Key** mode
3. Enter `ernestoortizlicer@gmail.com` and your new password
4. You should be redirected to `/admin`
5. Test navigation to `/admin/dashboard`, `/admin/finance`, `/admin/guarantees`

**Alternative: Magic Link mode**
1. Select **Magic Link** mode at `/admin/login`
2. Enter your email
3. Check your inbox — click the magic link
4. You will be logged in without a password (ideal for tablet use)

### 2.3 — Test Auth Gate

Verify that unauthenticated access is blocked:
1. Open a private/incognito browser window
2. Navigate to https://signal-and-friction.com/admin/dashboard
3. You should be redirected to `/admin/login` — if yes, the security gate is working

---

## STEP 3: 12 STRIPE PAYMENT LINKS (REVENUE — without this, clients see mock URLs)

### 3.1 — Create the 12 Products in Stripe

Go to https://dashboard.stripe.com/products and create these 12 products (or activate test mode first):

**Done-For-You (DFY) Segment:**

| Product Name | Price | Billing |
|---|---|---|
| DFY Beta Diagnostic | $2,000 | One-time |
| DFY Intervention | $3,000 | One-time |
| DFY Monitoring | $2,500 | Monthly recurring |
| DFY Expansion | $2,000 | One-time |
| DFY Autonomy Kit | $5,000 | One-time |

**Done-With-You (DWY) Segment:**

| Product Name | Price | Billing |
|---|---|---|
| DWY Beta Diagnostic | $350 | One-time |
| DWY Intervention | $750 | One-time |
| DWY Monitoring | $500 | Monthly recurring |
| DWY Expansion | $350 | One-time |
| DWY Autonomy Kit | $1,500 | One-time |

**Certified Program:**

| Product Name | Price | Billing |
|---|---|---|
| S&F Certified Practitioner | $2,500 | One-time |
| S&F Certified Agency | $5,000 | One-time |

For each product:
1. Click **+ Add product**
2. Enter the product name and price
3. Under **Payment link**, click **Create payment link**
4. Copy the `buy.stripe.com/...` URL

### 3.2 — Update the Database

For each payment link, run this SQL in the Supabase SQL Editor:
https://supabase.com/dashboard/project/tsaarsuuclvkjsgjcmoj/editor

```sql
-- Replace each price_id and URL with the real values from Stripe

UPDATE public.stripe_payment_links
SET payment_link_url = 'https://buy.stripe.com/YOUR_REAL_URL'
WHERE price_id = 'price_dfy_beta_diagnostic';

UPDATE public.stripe_payment_links
SET payment_link_url = 'https://buy.stripe.com/YOUR_REAL_URL'
WHERE price_id = 'price_dfy_intervention';

UPDATE public.stripe_payment_links
SET payment_link_url = 'https://buy.stripe.com/YOUR_REAL_URL'
WHERE price_id = 'price_dfy_monitoring';

UPDATE public.stripe_payment_links
SET payment_link_url = 'https://buy.stripe.com/YOUR_REAL_URL'
WHERE price_id = 'price_dfy_expansion';

UPDATE public.stripe_payment_links
SET payment_link_url = 'https://buy.stripe.com/YOUR_REAL_URL'
WHERE price_id = 'price_dfy_autonomy';

UPDATE public.stripe_payment_links
SET payment_link_url = 'https://buy.stripe.com/YOUR_REAL_URL'
WHERE price_id = 'price_dwy_beta_diagnostic';

UPDATE public.stripe_payment_links
SET payment_link_url = 'https://buy.stripe.com/YOUR_REAL_URL'
WHERE price_id = 'price_dwy_intervention';

UPDATE public.stripe_payment_links
SET payment_link_url = 'https://buy.stripe.com/YOUR_REAL_URL'
WHERE price_id = 'price_dwy_monitoring';

UPDATE public.stripe_payment_links
SET payment_link_url = 'https://buy.stripe.com/YOUR_REAL_URL'
WHERE price_id = 'price_dwy_expansion';

UPDATE public.stripe_payment_links
SET payment_link_url = 'https://buy.stripe.com/YOUR_REAL_URL'
WHERE price_id = 'price_dwy_autonomy';

UPDATE public.stripe_payment_links
SET payment_link_url = 'https://buy.stripe.com/YOUR_REAL_URL'
WHERE price_id = 'price_certified_practitioner';

UPDATE public.stripe_payment_links
SET payment_link_url = 'https://buy.stripe.com/YOUR_REAL_URL'
WHERE price_id = 'price_certified_agency';
```

### 3.3 — Test a $1 Payment

Before sending real clients:

1. Switch Stripe to **Test mode**
2. Set the Stripe test key in `.env.local` (`sk_test_...`)
3. Rebuild and redeploy (Step 1.3)
4. Submit the form at https://signal-and-friction.com
5. Follow the payment link that appears on `/confirmed`
6. Use Stripe test card: `4242 4242 4242 4242` | Expiry: any future date | CVC: any 3 digits
7. Verify the payment appears in Stripe Test Dashboard
8. Verify the `/confirmed` page shows the correct payment link

When tests pass → switch back to live key → rebuild → deploy → you're live.

---

## CHECKLIST: LAUNCH READY

```
[ ] Stripe live key in .env.local (replace sk_test_placeholder)
[ ] Stripe key in Supabase Edge Function secrets (3 functions)
[ ] Admin user created in Supabase Auth
[ ] Admin login verified at /admin/login
[ ] Admin auth gate verified (incognito test)
[ ] 12 Stripe products created in Stripe Dashboard
[ ] 12 payment link URLs updated in Supabase stripe_payment_links table
[ ] Test payment completed with Stripe test card
[ ] Final rebuild and deploy completed
[ ] signal-and-friction.com resolves to latest deployment
```

---

## EMERGENCY CONTACTS

| Issue | Where to Go |
|---|---|
| Stripe API issues | https://status.stripe.com |
| Supabase down | https://status.supabase.com |
| Cloudflare Pages issue | https://www.cloudflarestatus.com |
| Need to block a payment | https://dashboard.stripe.com → Payments → Refund |
| Supabase DB emergency | https://supabase.com/dashboard/project/tsaarsuuclvkjsgjcmoj → Pause project |
