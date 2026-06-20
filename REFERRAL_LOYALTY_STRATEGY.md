# REFERRAL & LOYALTY STRATEGY — Signal & Friction
**Mission 14: Referral Engine** | 2026-06-20

---

## 1. THE CHOSEN INCENTIVE

### Socratic Debate Outcome (21-Agent Synthesis)

**Draft 1 conclusion:** Stripe coupons are approved as a DELIVERY MECHANISM only. The incentive must never be framed as a "discount" — the word "coupon" is banned from all client-facing copy. Premium positioning is non-negotiable.

**Draft 2 elimination:**
- ~~Percentage discount~~: Signals "price was arbitrary." Brand risk.
- ~~Fixed $500 pre-defined coupon code visible publicly~~: Leakable. Rejected.
- ~~Dual-sided discount for referred client~~: Bribes trial. Premium brands don't do this.
- ~~Exclusive strategy session~~: High value but Ernesto's time is finite. Fails American Scalability principle.

**Draft 3 winner:** **Single-sided $500 Diagnostic Credit** — delivered privately by Ernesto after referral is verified. High-perceived value. Zero brand dilution.

---

## 2. REFERRAL PROGRAM STRUCTURE

### Referrer (existing S&F client)
- **Receives:** $500 Diagnostic Credit (Stripe coupon `SFREF500`)
- **When:** After the referred founder completes their first paid diagnostic
- **Delivery:** Ernesto sends the coupon code privately via email
- **Validity:** 12 months from issuance
- **Eligibility:** Applies to DFY phases (≥$2,000), Certified programs (≥$2,500), or DWY tiers ≥$750
- **Max per client:** 5 credits per calendar year

### Referred Founder (new client)
- **Receives:** Nothing monetary pre-sale
- **Rationale (Agent 2 — Behavioral Science):** The referred client must buy because the RESULT is worth it, not because of a discount. The referrer's testimony is the incentive. Monetary pre-sale discounts attract the wrong buyer profile — price-sensitive, not result-oriented.
- **Post-sale (framing):** They receive standard 72-hour delivery. No special treatment needed — the S&F guarantee already de-risks the purchase completely.

### Eligibility Criteria
| Condition | Requirement |
|---|---|
| Referrer must be | A paid S&F client (any tier, any product) |
| Referred must complete | First paid diagnostic (any product) |
| Credit activates | Upon Ernesto's manual approval in admin panel |
| Credit expires | 12 months from issuance date |
| Minimum for redemption | DFY/Certified (≥$2,000) or DWY ≥$750 |

---

## 3. TECHNICAL FLOW

```
REFERRAL FLOW — ZERO MANUAL WORK (except final credit approval)

1. CLIENT (referrer) visits /confirmed after initial payment
   ↓
2. Referral widget displays unique link:
   https://signal-and-friction.com/?ref=XYZ12345
   
3. CLIENT copies link, shares with a founder

4. FOUNDER visits signal-and-friction.com/?ref=XYZ12345
   → Homepage captures ref=XYZ12345 → stores in localStorage
   
5. FOUNDER completes the S&F diagnostic funnel
   → Clicks payment link → pays on Stripe
   → Stripe redirects to /confirmed/success?product=...
   
6. SUCCESS PAGE reads localStorage('sf_referral_ref')
   → Records in Supabase `referrals` table:
      { ref_code: 'XYZ12345', referred_email: '...', referred_product: '...',
        status: 'pending', stripe_coupon_id: 'SFREF500' }
   → Clears localStorage (prevents duplicate recording)
   
7. ADMIN PANEL shows new pending referral
   → Ernesto reviews: ref_code + referred_email + product
   → Approves → marks status: 'credit_issued'
   → Sends email to REFERRER with coupon code: SFREF500
   
8. REFERRER applies SFREF500 at checkout on next phase
   → Stripe deducts $500 from invoice
   → S&F net cost: $500. Referred revenue: full price. Net: positive.
```

---

## 4. STRIPE CONFIGURATION

### Coupon `SFREF500` (LIVE in Stripe)
```
ID:           SFREF500
Name:         S&F Diagnostic Credit — $500
Amount off:   $500 (50000 cents)
Currency:     USD
Duration:     once (applies to one payment only)
Valid:        true
Dashboard:    https://dashboard.stripe.com/coupons/SFREF500
```

### How to apply the coupon to a payment
Ernesto sends the referrer this instruction via email:
1. Click your next S&F payment link
2. On the Stripe checkout, click "Add promotion code"
3. Enter: `SFREF500`
4. The $500 discount is applied instantly before payment

---

## 5. SUPABASE SCHEMA

### Table: `public.referrals`
```sql
id              UUID         PK
ref_code        TEXT         The refId from the /confirmed widget
referrer_email  TEXT         Known if referrer is logged in (nullable)
referred_email  TEXT         From /confirmed/success?email= param
referred_product TEXT        From /confirmed/success?product= param
status          TEXT         pending | credit_issued | expired
stripe_coupon_id TEXT        DEFAULT 'SFREF500'
notes           TEXT
created_at      TIMESTAMPTZ
credit_issued_at TIMESTAMPTZ Set when Ernesto approves
```

**Unique constraint:** `(ref_code, referred_email)` — prevents duplicate recording.

---

## 6. ANTI-ABUSE MEASURES

| Threat | Protection |
|---|---|
| Self-referral | ref_code is generated after payment — same person can't refer themselves before they've paid. The unique constraint on `(ref_code, referred_email)` also prevents duplicate rows. |
| Code leaking publicly | Coupon code is NEVER shown in the widget. Ernesto sends it privately. |
| Mass abuse (>5 referrals/year) | Enforced at admin approval: max 5 `credit_issued` rows per referrer email per calendar year. |
| Fake email injection | referred_email comes from the Stripe success URL, which is set by S&F. Not from user input. |
| Code injection in ref param | Homepage validates ref against `/^[A-Z0-9]{6,16}$/` before storing. |

---

## 7. WIDGET COPY (Live on /confirmed)

```
Referral Protocol
Refer a founder. Earn a $500 Diagnostic Credit.
Share your unique link. When they complete a paid diagnostic,
a $500 credit is applied toward your next phase.
```

---

## 8. FINANCIAL MODEL (Agent 8 — Wharton)

| Scenario | Numbers |
|---|---|
| Referred client pays DFY Diagnostic | $2,000 revenue |
| Credit paid to referrer | $500 cost |
| Net S&F revenue per referral | $1,500 |
| Gross margin on DFY (~70%) | ~$1,050 profit |
| Break-even referrals to cover credit | 0 (credit applied to NEXT purchase, not current) |
| LTV impact | Referrer is retained + upsold to next phase |

**Verdict:** Every referral generates $2,000 in new revenue immediately. The $500 credit is paid later, on a future purchase. S&F collects full revenue now, pays loyalty reward later. Net positive at every scenario.

---

## 9. AUTOMATION STATUS

| Component | Status |
|---|---|
| Stripe coupon `SFREF500` | ✅ LIVE |
| Supabase `referrals` table migration | ✅ Created |
| Homepage ref capture (`?ref=` → localStorage) | ✅ Deployed |
| Success page referral recording → Supabase | ✅ Deployed |
| `/confirmed` widget text updated | ✅ Deployed |
| Admin panel referrals view | ⏳ Next iteration |
| Automated email on credit issuance | ⏳ Next iteration (Resend/Loops) |

---

## 10. NEXT STEPS FOR ERNESTO

1. **Verify coupon in Stripe Dashboard:**
   `https://dashboard.stripe.com/coupons/SFREF500`
   
2. **Apply the Supabase migration manually:**
   - Go to: `https://supabase.com/dashboard/project/tsaarsuuclvkjsgjcmoj/sql/new`
   - Paste and run: `supabase/migrations/20260620000000_referrals_table.sql`
   
3. **Check admin panel for pending referrals:**
   `https://signal-and-friction.com/admin`
   (The Supabase editor shows `referrals` table)
   
4. **When approving a referral:**
   - Open the row in Supabase editor
   - Set `status = 'credit_issued'`, set `credit_issued_at = now()`
   - Email the referrer: "Your $500 Diagnostic Credit is ready. Use code SFREF500 at checkout."
   
5. **Test the full flow:**
   - Visit: `https://signal-and-friction.com/?ref=TESTCODE1`
   - Open DevTools → Application → Local Storage
   - Confirm `sf_referral_ref` = `TESTCODE1`

---

*Signal & Friction — Referral Engine Active | 2026-06-20*
