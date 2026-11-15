# Pricing tiers — research, 2026-11-15

The founder's question (2026-11-15): three tiers (Free, Backyarder, Pro) or something else; what each includes; whether Free
should be a time-limited trial; whether to limit import, export or printing; whether to gate pages such as ROCKER, the blank
picker or FINS. His aims: accessible to all, inexpensive, helpful rather than gouging. Three research threads, read on the web
the same day. Figures marked UNVERIFIED were not confirmed on the seller's own page.

## 1. What surfboard design software charges

| Product | Tiers and price | What the free or cheap tier cannot do | Source |
|---|---|---|---|
| AkuShaper | Demo free, no time limit; **Backyarder** $12.95/mo (~$125/yr); Up and Comer $29.95/mo (~$323/yr); Heavyweight $49.50/mo (~$564/yr). Subscription only. | Demo: no outline printing, no STL/IGES export, no blank fitting; saves unlock on paying. Backyarder: no full-size PDF printing, no fin marking (both from Up and Comer); 3D export only on Heavyweight. | akushaper.com/software; swaylocks.com/t/80688 |
| Shape3D X | Lite free; Design €5/mo, €49/yr or €170 once; Design Pro €18/mo, €179/yr; Pro + 3D Export €519/yr; Pro + CNC €659/yr. Monthly, yearly or once. Pay-per-use credits: €0.80 a full-size print, €8 a 3D export. | Lite: no fins, no full-size printing, no 2D or 3D export (still sends to cutting centres). Printing from Design; fins from Design Pro. | shape3d.com/Order/OrderOptions.aspx |
| BoardCAD / LE | Free, open source. | Nothing paywalled; hard to install. | sourceforge.net/p/boardcad |
| Board Designer (web) | ~$2 "backyarder" to ~$4 "pro" a month, from its author's forum post — UNVERIFIED on the site. | Subscription only; a try-without-subscribing button added 2025-12-30. | swaylocks.com/t/83491 |
| iShaper (iOS) | Free, optional tips. | Nothing locked; prints full-size templates; dormant since 2019. | App Store id1436528551 |
| Paper templates | Almond: free PDFs; Kazuma Kinoshita from $10; Timeless $25; Grain study plans $15. | One fixed design each. | almondsurfboards.com and others |
| CNC cuts | ~$25–76 a board on top of the blank (shop and forum figures, partly UNVERIFIED). | Needs a file first. | swaylocks.com/t/36217, t/84136 |

What it says:
- Both leaders give design away and charge for output: full-size printing, fins and file export. Shaper Assistant gives all three free today.
- Hobbyists resent subscriptions and "credit card schemes"; Aku's 2009 move of free features to paid was called "real steep". They use these tools rarely ("I wouldn't use it enough"); the learning curve deters more than the price.
- Pay-per-export is accepted (Shape3D's credits were called "relatively inexpensive compared to maintaining a subscription").
- The pro money in this trade comes from machine owners (CNC tiers €519–659/yr). Shaper Assistant has no machine output, so a shop tier sells on the order side: branding, orders, records.
- "Backyarder" is AkuShaper's tier name (and Board Designer's word too).

## 2. Freemium, trials and gating — evidence

- Free trials convert more of their sign-ups (good 8–12%) but freemium draws more sign-ups (Lenny's survey of 1,000+ products). lennysnewsletter.com/p/what-is-a-good-free-to-paid-conversion
- 2026 benchmarks: good freemium 3–5%, card-free trial 4–6%, card-required trial 25–35%, reverse trial 4–6% (small sample, no significant edge). chartmogul.com/reports/saas-conversion-report
- Reverse trials suit long relationships; trial buyers decide in ~14 days, freemium buyers in 60–90. growthunhinged.com/p/your-guide-to-reverse-trials
- "Freemium is an acquisition model, not a revenue model" (Patrick Campbell); value-metric pricing grew ~2× faster than feature gating (podcast summary).
- Fusion 360's 2020 removal of STEP export from its free licence drew a backlash that made Autodesk back down on export (the 10-document cap stayed). hackaday.com 2020-09-16 and 2020-09-25
- Withholding a user's own work is widely called "data hostage" (advocacy, not survey data).
- Design tools mostly divide on commercial use, lightly enforced: Fusion Personal (<$1,000/yr revenue), SketchUp Free vs Go (~$129/yr) vs Pro (~$399/yr, UNVERIFIED), Onshape's self-declared rule. Obsidian made its commercial licence optional in 2025 and sells a $25 one-time supporter badge.
- Onshape Free forces documents public; hobbyists resented it and asked for a cheap private tier. forum.onshape.com
- Shapr3D dropping its hobby plan left lasting forum friction.
- Procreate is $12.99 once; Affinity went free in 2025; Figma is free for students.
- Slopes sells a $1.99 day pass and a trip pass beside its annual plan; ~20% of buyers used the pass as a paid trial.
- 34.9% of 2,526 paid tools offer exactly three tiers; a decoy plan shifts choices sharply (Ariely's Economist test).
- Pausing: ~25% of would-be cancellers pause instead (Recurly, vendor data). Lifetime deals: quick cash, buyers rarely upgrade, support forever (indie reports).

## 3. What Clerk Billing can build, and the running costs

The app is on `@clerk/nextjs` ^7.8.2 (Core 3): `<Protect>` is gone, `<Show>` replaces it, and real gating is `has()` on the server.

- Clerk Billing: treat as beta (older docs and SDK types still say so; no GA notice). B2C and organisation plans. Free trials 1–365 days, card optional by setting, one per email, drops to free at the end. Monthly and annual, annual-only allowed. **No one-time or lifetime payments.** Coupons and promo codes since 2026-08-10. Features attach to plans; check with `has({ plan })` / `has({ feature })`; `<PricingTable />` for the pricing page. Upgrades prorate now; downgrades and cancellations at period end; a failed renewal drops to free with no grace.
- **Gaps:** USD only; **no 3D Secure** (UK and EU cards that need a challenge fail); **no tax or VAT handling**; refunds only in Stripe; not a merchant of record. Fee 0.7% on top of Stripe.
- Clerk's own Hobby plan is free to 50,000 monthly retained users and includes Billing; Pro ($25/mo) only for branding removal, passkeys, MFA and the like.
- Stripe: 2.9% + 30¢ US, +1.5% international. Through Clerk, 3.6% + 30¢. Net: $3/mo keeps $2.59; $5/mo $4.52; $8/mo $7.41; $15/mo $14.16; $50/yr $47.90. About $5/mo is the sensible minimum; annual billing mostly removes the 30¢ problem.
- **Vercel Pro is required the moment the site takes payment** (Hobby is "non-commercial personal use only", and taking payment is listed as commercial). $20 a developer seat a month, with a $20 usage credit, 1 TB transfer, 10 million requests.
- Neon free covers today (100 compute-hours, 0.5 GB); Launch is pay-as-you-go, ~$15/mo at light load.
- Alternatives: Stripe Checkout and Billing directly (3D Secure, refunds, one-time payments, currencies, Stripe Tax; you build the webhook sync); Paddle or Lemon Squeezy as merchant of record (5% + 50¢, they file sales tax and VAT; small prices need custom terms; Lemon Squeezy's future is moving to Stripe Managed Payments).

## Running cost to cover

Vercel Pro $20/mo, Clerk $0, Neon $0–15: about $20–35 a month. Six subscribers at $5/mo, or three at $12, cover it.
