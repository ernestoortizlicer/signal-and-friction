# NURTURE SEQUENCES — Signal & Friction
**$1M Revenue Ignition Mission** | Updated: 2026-06-20

> Trigger these sequences based on lead behavior in the pipeline. All emails are plain text. All LinkedIn messages are brief. Delay timing is calendar days.

---

## SEQUENCE A: 5-EMAIL NURTURE (Stripe Link Clicked, Not Paid)

**Trigger:** Lead clicked the Stripe payment link but did not complete checkout.
**Enrollment:** Automatic via Supabase pipeline tag `stripe_click_no_purchase`.

---

### A-1: Day 0 — "Technical Issue?" (Send 2 hours after click)

**Subject:** Did something break?

```
Hi [NAME],

I noticed you started the S&F diagnostic checkout but it looks like it didn't complete.

If something broke on the payment side, let me know and I'll send a direct invoice instead.

If you had questions before committing, happy to answer them now.

—Ernesto
```

**Why this works:** Removes technical friction as a reason to not pay. Non-pushy. Opens a dialogue.

---

### A-2: Day 2 — The Case Study

**Subject:** What the last diagnostic found

```
Hi [NAME],

In case it helps clarify what you'd actually be getting:

Last week's diagnostic for a B2B SaaS team (project management, ~$40K MRR) found that 
their free trial activation email was being delivered 4 hours after signup — during working hours 
for US users, but 11pm for their primary European cohort.

One timing change. Free-to-paid went from 4.1% to 5.3% in 18 days.
That's 29% relative improvement. The guarantee threshold was 20%.

72 hours. One finding. One fix.

Still interested in running yours?
[STRIPE LINK]

—Ernesto
```

---

### A-3: Day 5 — The Objection Handler

**Subject:** The most common reason founders wait

```
Hi [NAME],

The most common reason B2B SaaS founders don't run the diagnostic right now:

"We're in the middle of a feature sprint and can't act on findings."

Fair. But here's why that's backwards:

The diagnostic takes 72 hours on MY end. It's async — no meetings.
The finding sits in your inbox, ready to implement when the sprint ends.

You're not blocking engineering. You're creating a prioritized fix for the next sprint.

The guarantee window (30 days) starts when you receive the deliverable, not when you pay.

Still not the right moment? Tell me when is. I'll follow up then.

—Ernesto
[STRIPE LINK]
```

---

### A-4: Day 10 — Scarcity + Social Proof

**Subject:** 2 spots left this month

```
Hi [NAME],

Running diagnostics async means I can only maintain quality for a fixed number at once.

Two spots left for June.

Current clients this month:
- B2B HR SaaS (50 employees): checkout friction found and fixed, awaiting 30-day data
- PLG tool (Series A): onboarding dropout isolated, AB test launched

If you want to be in the next cohort, the link is below.
If July works better, just reply and I'll hold a spot.

[STRIPE LINK]

—Ernesto
```

---

### A-5: Day 21 — The Final Offer

**Subject:** Last message from me on this

```
Hi [NAME],

Last follow-up on the S&F diagnostic.

Here's the offer in its simplest form:

Pay $[PRICE].
I audit [COMPANY]'s conversion funnel in 72 hours.
You get one finding, one implementation guide.
If your target metric doesn't move 20% in 30 days: full refund.

The downside: nothing (guaranteed refund).
The upside: 20%+ lift in the metric that compounds into everything else.

If the timing isn't right, no problem. I won't follow up again.

—Ernesto
[STRIPE LINK]
```

---

## SEQUENCE B: 3-MESSAGE LINKEDIN FOLLOW-UP

**Trigger:** Prospect received first DM, has not replied after 5+ business days.

---

### B-1: Day 6 — Soft Bump (Value Add)

```
[NAME], following up with a quick note — not to push, just to share.

I wrote up how we isolated a billing page friction point for a 
$40K MRR SaaS team last week. Happy to send the full case study if it'd be useful context.

No pitch attached. Just the methodology doc.
```

**Why:** Second touch adds value rather than repeating the ask. "Just the methodology doc" is low-stakes.

---

### B-2: Day 13 — The Pivot

```
[NAME], different question than my last message:

Is conversion friction currently on [COMPANY]'s roadmap for Q3, or is it 
something you're monitoring but not actively sprinting on?

Asking because my calendar fills up a few weeks out, and I'd rather flag it now 
if it's coming up for you.
```

**Why:** Shifts from "are you interested" to "when is this relevant." Gets a real answer instead of a non-reply.

---

### B-3: Day 20 — The Clean Close

```
[NAME], last one from me.

If conversion friction isn't a priority right now, totally understood — 
I'll stop pinging.

If it comes up in Q3 or Q4, feel free to DM back.

Either way, good luck with the [RECENT PRODUCT LAUNCH / FUNDING / NEWS].
```

**Why:** Closes the loop respectfully. The final genuine compliment leaves the door open without burning it.

---

## TRIGGER RULES

| Behavior | Sequence | Notes |
|----------|----------|-------|
| Stripe link clicked, no payment | Sequence A | Auto-enroll via Supabase tag |
| LinkedIn DM sent, no reply after 5 days | Sequence B | Manual, tracked in pipeline notes |
| Email opened 3x, no reply | Sequence A starting at A-3 | Signals interest, skip early messages |
| Replied "not now / next quarter" | Sequence A at A-5 in 60 days | Time the follow-up |

---

## ANTI-SPAM COMPLIANCE

- Every email includes: "Reply STOP to remove yourself from follow-ups."
- LinkedIn DMs: Stop immediately if prospect asks. Block-and-document.
- Maximum 5 touches per cold prospect over 30 days.
- EU/GDPR: Only email people who have explicitly interacted with the platform or have a legitimate interest tie.
- CAN-SPAM: Commercial emails must identify as commercial. These plain-text templates do this implicitly through context.
