---
phase: quick-260929-w2k
plan: 01
subsystem: contact
tags: [contact, resend, email, phase-13]
status: complete
dependency-graph:
  requires: [quick-260929-u1t]
  provides: [resend-contact-delivery]
  affects: [lib/contact, lib/contact-server.ts, app/actions/contact.ts, app/contact/page.tsx, e2e/contact.spec.ts]
tech-stack:
  added: []
  patterns:
    - "Raw fetch with an injectable fetchImpl for the one outbound HTTP call, no SDK added (W-6)"
    - "Success rule: 2xx AND parsed JSON is a non-null, non-array object with a non-empty string id"
key-files:
  created: []
  modified:
    - lib/contact/message.ts
    - lib/contact/message.test.ts
    - lib/contact/delivery.ts
    - lib/contact/delivery.test.ts
    - lib/contact-server.ts
    - app/actions/contact.ts
    - app/contact/page.tsx
    - playwright.config.ts
    - e2e/contact.spec.ts
decisions:
  - "Locked decisions L-1 to L-4 and planner decisions W-1 to W-7 from the plan were followed exactly, including the pinned request shape, headers, success rule and log shape"
metrics:
  duration: "8 min"
  completed: 2026-09-30
actuals:
  tokens: 10124
  tasks: 2
  commits: 2
---

# Phase 13 item 10, quick 260929-w2k: The Contact form sends through Resend — Summary

The Contact form's email now goes out through Resend instead of the cancelled sending service —
raw `fetch`, no SDK, with the exact request shape, headers and success rule the founder's plan
pinned. Nothing a shaper sees changes today: the page stays address-only until the founder puts
`RESEND_API_KEY` into Vercel.

## What changed

**Task 1 — the request body, the sender and the key (commit `06b8d67`):**
- `lib/contact/message.ts`: the old body type and builder were replaced by `ResendSendBody` and
  `buildResendRequest`, which returns `{ from: CONTACT_SENDER, to: [CONTACT_RECIPIENT], subject,
  text, reply_to: message.email }`. `CONTACT_RECIPIENT` is now the plain address
  (`support@shaperassistant.com`), not the `"Name <address>"` form — `CONTACT_SENDER` keeps that
  form for `from`, which Resend documents.
- `lib/contact/delivery.ts`: the old endpoint, sender and delivery kind were replaced by
  `RESEND_SEND_URL` (`https://api.resend.com/emails`), the exported `CONTACT_USER_AGENT`
  (`shaper-assistant/1.0`), `sendWithResend`, and `kind: "resend"`. The request carries three
  headers only — `Authorization: Bearer <key>`, `Content-Type: application/json`, `User-Agent` —
  and the 10-second `AbortSignal.timeout` stayed exactly as it was. A send counts as OK only on a
  2xx response whose parsed JSON is a non-null, non-array object with a non-empty string `id`;
  everything else — including a non-2xx that still carries an `id` — is a failure, logged as
  exactly `("Shaper: contact message did not send", { status, errorName })`, where `errorName` is
  Resend's own `name` field when present, never its `message` field (which can echo a shaper's
  typed text or the reply address).
- `lib/contact-server.ts`: the one delivery key read is now `apiKey: process.env.RESEND_API_KEY`.
- Both test files were rewritten to match: `message.test.ts` gained a `buildResendRequest`
  describe block (five pinned keys, no `html`, the constant `from`, the plain `to`, `reply_to` as
  a single string); `delivery.test.ts`'s `sendWithResend` block covers the endpoint, the three
  headers, the body shape, the timeout signal (a spy on `AbortSignal.timeout` proves the exact
  returned signal reaches `fetch`), the success case, nine distinct failure cases (empty object,
  empty string id, non-string id, null body, a `SyntaxError` from `json()`, a 500 carrying an id,
  a 403 domain-not-verified shape, a thrown network error, and a thrown timeout `DOMException`),
  and an exact-log-shape test proving a 422 whose `message` field carries the shaper's email, their
  text and the key never lets any of those three strings reach `console.error`.

**Task 2 — the comments (commit `20b90d1`):** `app/actions/contact.ts`, `app/contact/page.tsx`,
`playwright.config.ts` and `e2e/contact.spec.ts` had their doc comments reworded to name Resend
and `RESEND_API_KEY` — no JSX, no strings, no env values and no test code changed (proven by the
plan's non-comment-line diff gate, which read 0).

## Verification

**`npm test` counts:**
| | Test files | Tests passed | Skipped | Total |
|---|---|---|---|---|
| Before (36bffe6) | 80 | 3441 | 2 | 3443 |
| After Task 1 | 80 | 3448 | 2 | 3450 |
| After Task 2 | 80 | 3448 | 2 | 3450 |

(Net +7 tests: the `sendWithResend` block has more granular failure cases than the old sender's
block had.)

Lint (`--max-warnings 0`) and `npx tsc --noEmit` were clean after each task.

**Playwright, `PW_PORT=3120 npx playwright test e2e/contact.spec.ts`, all three device profiles:**

| Project | Passed | Skipped | Failed |
|---|---|---|---|
| iphone | 13 | 0 | 0 |
| android | 13 | 0 | 0 |
| desktop | 13 | 0 | 0 |
| **Total** | **39** | **0** | **0** |

No re-run was needed — green on the first attempt.

**Grep and diff gates (both tasks' `<verify>` blocks):** no touched file names the cancelled
service (0 case-insensitive `smtp2go` hits across all nine files) or the founder's old personal
mail app (0 `gmail` hits); `package.json` gained no `resend` entry (W-6, raw fetch only);
`CONTACT_COPY`, `CONTACT_ERRORS` and `components/contact/contact-form.tsx` are byte-identical to
`36bffe6`; Task 2's four files show 0 changed non-comment lines against `36bffe6`.

## Commits

- `06b8d67` — `feat: the Contact form sends through Resend, the founder's new free email service (quick 260929-w2k)`
- `20b90d1` — `docs: the Contact page's notes and browser tests say Resend now (quick 260929-w2k)`

Neither commit was pushed.

## Deviations from Plan

None — plan executed exactly as written. Both tasks' automated `<verify>` gates passed on the
first attempt; the Playwright run also passed on the first attempt, so the plan's "re-run once"
fallback was never needed.

## Known Stubs

None. No hardcoded empty values, placeholder text or unwired data sources were introduced or
found in the touched files.

## Threat Flags

None beyond what the plan's own `<threat_model>` already covers — no new network endpoints, auth
paths, file access patterns or schema changes were introduced. The one outbound call
(`sendWithResend` to `https://api.resend.com/emails`) was already named and mitigated in the
plan's STRIDE register (T-w2k-01 through T-w2k-07).

## User Setup Required

The founder still needs to do the following before a shaper's note can actually reach the inbox
(everything else is already live, and the page stays address-only until this is done):

1. Create a Resend account (free plan: 3,000 emails a month, 100 a day).
2. In Resend's dashboard, add and verify the domain `shaperassistant.com` — copy the DNS records
   it lists (the `send.` subdomain records plus the `resend._domainkey` DKIM key) into Vercel's
   DNS for `shaperassistant.com`. These do not touch Zoho's root MX or SPF records. Wait for
   Resend to show the domain as Verified before the next step.
3. Create a sending-only API key in Resend, scoped to `shaperassistant.com`.
4. In Vercel, on the `shaper` project, add `RESEND_API_KEY` under Settings → Environment Variables
   for **Production** (and **Preview** if wanted) — **not** Development.
5. Redeploy. Once the deploy finishes, the live `/contact` page will show the form instead of the
   address-only panel.

## The Founder's Own Live Check

None of the following can be proven by a stand-in or a unit test — they need the founder's own
eyes, once the key is in Vercel and the domain is verified:

- A real message sent from the live Contact page arrives in the `support@` inbox in Zoho Mail.
  Check Zoho's Spam folder the first time — the message is from `support@` to `support@` through
  an outside sender, which some spam filters flag on a first sighting.
- The founder's Reply from Zoho Mail reaches the shaper's own address (the `reply_to` the shaper
  typed).
- The founder's own signed-in visit to `/contact` shows their name and email already filled in.

## Self-Check: PASSED

All nine modified files and this SUMMARY.md were found on disk; both commit hashes (`06b8d67`,
`20b90d1`) were found in `git log`. Nothing missing.
