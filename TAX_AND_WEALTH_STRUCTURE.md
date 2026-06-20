# TAX & WEALTH STRUCTURE — Signal & Friction
**Ernesto Ortiz Licer** | Confidential | Updated: 2026-06-20

> **DISCLAIMER:** This document is a strategic planning framework, not legal or tax advice. Consult a licensed international tax attorney before implementing any structure. All jurisdictions have their own compliance requirements that evolve annually.

---

## ⚡ PHASE 2 VERDICT — UPDATED 2026-06-20

**PHASE 2 DESTINATION: URUGUAY (Montevideo) 🇺🇾**

After a 21-agent Socratic debate evaluating 9 jurisdictions, Uruguay wins unanimously:
- **0% tax on all foreign-source income** for 11 years (Uruguay Tax Holiday for new residents)
- Spanish language · Temperate mild climate · Safest country in South America
- European culture (88% European descent) · $2,000-3,000/month comfortable living
- Compatible with Wyoming LLC → Total effective rate: **0% for 11 years**

**At $1M/year revenue:** Uruguay saves $140,000/year vs Bulgaria.

**Migration trigger:** $15K MRR sustained 3 months → begin relocation.

**Backup 1:** Andorra (10% flat, near Barcelona, Spanish-speaking)
**Backup 2:** Cyprus (0% dividends non-dom 17yr, Mediterranean, EU)

**Full strategy:** See `PHASE2_GLOBAL_STRATEGY.md`

---

## 1. CURRENT STATE

| Variable | Status |
|---|---|
| Primary residence | Bulgaria (Phase 1 active) |
| Phase 2 destination | **Uruguay (Montevideo)** — decided 2026-06-20 |
| Business entity | Signal & Friction LLC (Wyoming, USA) |
| Tax filing | Bulgarian flat 10% personal income |
| Stripe account | **LIVE** — 12 payment links active |
| Revenue stage | Platform launched — acquiring first clients |

---

## 2. OPTIMAL STRUCTURE — PHASE 1 (Launch Year)

### US LLC (Wyoming or Delaware) → Primary Operating Entity

**Why US LLC:**
- Pass-through taxation — profits only taxed at member level, not entity level
- Wyoming: zero state income tax, zero franchise tax, strong asset protection, high privacy (no public member list)
- Delaware: preferred for future VC / institutional clients who require US entities
- Stripe accepts US LLCs immediately without additional verification
- Invoices in USD from a US entity command authority with B2B SaaS clients globally

**Setup cost:** ~$150–400 (online formation via Registered Agents Inc. or Northwest Registered Agent)  
**Annual cost:** ~$60 (Wyoming) | ~$300 (Delaware franchise tax)  
**Formation timeline:** 24–72 hours

**Stripe Integration:**  
Use the US LLC's EIN (Employer Identification Number) and US bank account (Mercury, Relay, or Wise Business) to set up Stripe. This eliminates cross-border payment friction and reduces card decline rates for US/EU clients.

### Bulgarian Tax Residency → Personal Tax Optimization

**Why Bulgaria:**
- Flat 10% personal income tax — one of the lowest in the EU
- EU member state (full banking access, treaty network)
- 183-day residency rule — not required to live there full-time in Year 1 if renouncing prior residency
- LLC distributions from the US pass-through to Bulgarian personal return at 10%
- No wealth tax, no inheritance tax on foreign assets

**Effective Tax Rate (Year 1):**
```
US LLC Revenue:        $270,000
US Entity-Level Tax:   $0 (pass-through)
Bulgarian Flat Tax:    $27,000 (10%)
Effective Rate:        10%

vs. US W2 equivalent: $270k → ~32% federal + state = $86,400
Saving vs. US W2:      $59,400/year
```

**Requirements:**
- Register as self-employed (freelancer) or establish a Bulgarian EOOD (single-member LLC equivalent)
- Open a Bulgarian bank account (DSK Bank, UniCredit Bulgaria)
- File annual tax return in BG (simple process, handled by a local accountant for ~€500/year)

---

## 3. OPTIMAL STRUCTURE — PHASE 2 (Year 2+, Uruguay)

### Uruguay Personal Residency → 0% Foreign Income Tax

**Why Uruguay (decided 2026-06-20):**
- 0% income tax on all foreign-source income for 11 years (Tax Holiday for new residents)
- After 11 years: 7% flat on foreign passive income — still excellent
- Spanish-speaking, mild temperate climate, safest country in South America
- Residency: 183 days of physical presence (simple — no property purchase required)
- No corporate setup needed — Wyoming LLC + Uruguay personal residency is sufficient

**Structure:**

```
CLIENT (Global SaaS / Founder) → Stripe
              ↓
  SIGNAL & FRICTION LLC (Wyoming, USA)
  - Issues invoices in USD
  - No US tax (foreign-owned, no US-source income)
              ↓ Distribution to sole member
  ERNESTO ORTIZ — Resident of Uruguay (Montevideo)
  - Foreign-source income = 0% tax for 11 years
  - Files DGI declaration in Uruguay (claims exemption)
  - Files Form 5472 with IRS (informational only)
  - Files FBAR if USD accounts > $10K
```

**Effective Rate at $500K+ Revenue (Phase 2):**
```
Wyoming LLC Revenue:   $500,000
US Entity-Level Tax:   $0 (pass-through, foreign-owned)
Uruguay Personal Tax:  $0 (foreign-source income, 11-year holiday)
Effective Rate:        0%

vs Bulgaria (Phase 1): 10% = $50,000/year in taxes
Annual savings:        $50,000
5-year savings:        $250,000
```

**Setup Cost:** ~$3,000–5,000 (tax attorney consultation + document apostille + DGI registration)
**Annual Cost:** ~$1,500 (Uruguayan accountant + US CPA for FBAR/5472)

**Migration Trigger:** $15K MRR sustained 3 months, OR $40K in savings to cover relocation + 6-month runway

**Previous "Phase 3" label (UAE):** SUPERSEDED. UAE was hot desert climate, Arabic culture — poor fit. Now correctly labeled Phase 2: Uruguay.
**Previous Phase 2 (Hong Kong):** SUPERSEDED. Uruguay + Wyoming LLC is simpler and achieves 0% (vs HK's 0% on offshore but with more compliance overhead).

---

## 4. STRIPE OPTIMIZATION

**Immediate Actions:**
1. Form US LLC (Wyoming) → Obtain EIN → Open Mercury or Relay business bank account
2. Connect Stripe to US business account → Set payout currency to USD
3. Enable Stripe Tax (automatic VAT collection for EU clients) — avoids compliance liability
4. Set up Stripe Radar rules to block high-risk regions proactively

**Revenue Flow:**
```
Client (US/EU/APAC) → Stripe (USD) → US LLC Bank Account (Mercury)
→ Monthly transfer to personal account → BG tax filing
```

**Currency Strategy:**  
- USD clients: direct Stripe payout
- SGD clients (/sg page): Stripe handles SGD → USD conversion automatically
- EUR clients: Stripe EUR → USD conversion; or open Wise Business multi-currency

**Stripe Tax (EU VAT):**  
Enable Stripe Tax to auto-collect and remit VAT for EU B2C sales. For B2B clients with VAT registration, apply reverse charge. This protects from EU VAT penalties.

---

## 5. ASSET PROTECTION LAYER

### Wyoming LLC Charging Order Protection
Wyoming provides one of the strongest charging order protections in the US. A creditor who wins a judgment against Ernesto personally cannot seize the LLC assets — they can only receive distributions IF the LLC makes them. Combined with minimal-distribution policy, this makes the LLC nearly judgment-proof.

### Separate Personal Liability
Never commingle personal and LLC funds. Maintain a clear separation between:
- LLC bank account (Mercury) — all business income/expenses
- Personal account (any) — salary/distributions only

### IP Protection
The S&F Methodology™, Certified™ trademark, and diagnostic frameworks should be formally assigned to the LLC. This creates a barrier against freelancers copying and selling identical services.

Register:
- "Signal & Friction" as a trademark (USPTO for US rights) — ~$250
- "S&F Certified™" trademark — ~$250
- Consider EU trademark if expanding (EUIPO — ~€850)

---

## 6. BANKING STACK

| Account | Purpose | Currency |
|---|---|---|
| **Mercury** (US) | Primary business receipts, Stripe payouts | USD |
| **Wise Business** | International transfers, multi-currency | USD/EUR/SGD/GBP |
| **DSK Bank** (BG) | Bulgarian salary/personal | EUR/BGN |
| **Interactive Brokers** | Investment account | USD/Global |

---

## 7. TAX CALENDAR

| Month | Action |
|---|---|
| January | US LLC annual report (Wyoming: due Jan 1, $60 fee) |
| March | Bulgarian personal tax return (deadline March 31) |
| April | Quarterly P&L review; estimated tax payment to BG if applicable |
| June | Mid-year tax planning review |
| October | HK annual return (when applicable) |
| December | Year-end income optimization; defer/accelerate income if needed |

---

## 8. INVESTMENT ALLOCATION FRAMEWORK

**Rule: Every dollar earned is allocated before it arrives.**

| Allocation | % | Vehicle |
|---|---|---|
| Operating reserve | 20% | Mercury savings |
| Personal salary | 30% | Bulgarian account |
| Tax reserve | 12% | Separate Mercury account |
| Long-term investment | 28% | Interactive Brokers (S&P 500 index fund) |
| Business reinvestment | 10% | Platform improvements, tools, education |

**FIRE Target Calculation:**
```
Annual burn rate: ~$30,000 (USD equivalent, low-cost BG base)
FIRE Number (25x rule): $750,000
Time to FIRE at $270k/year revenue, 28% invested: ~3.5 years
Time to FIRE at $770k/year revenue, 28% invested: ~1.2 years
```
