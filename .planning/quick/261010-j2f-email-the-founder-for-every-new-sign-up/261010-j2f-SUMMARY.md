---
phase: quick-261010-j2f
plan: 01
subsystem: clerk-webhook, contact-email, legal
tags: [clerk, webhook, resend, sign-up-notice, privacy]
requires:
  - quick 260930-ckm (the Clerk webhook endpoint and signing secret)
  - quick 260929-u1t / w2k (the Contact form's Resend call)
provides:
  - one plain-text email to support@shaperassistant.com for every Clerk user.created
  - privacy page wording for it (approved by the founder 2026-10-10)
affects:
  - app/api/webhooks/clerk/route.ts
  - lib/clerk-webhook.ts
  - lib/contact/
  - content/legal/privacy.md
key-files:
  created:
    - lib/contact/sign-up-notice.ts
    - lib/contact/sign-up-notice.test.ts
  modified:
    - lib/clerk-webhook.ts
    - lib/clerk-webhook.test.ts
    - app/api/webhooks/clerk/route.ts
    - lib/clerk-webhook-route.test.ts
    - lib/contact/delivery.ts
    - lib/contact/delivery.test.ts
    - content/legal/privacy.md
    - e2e/legal-pages.spec.ts
    - components/legal/legal-document.test.ts
decisions:
  - A verified user.created always answers 200 (sent / skipped / failed in the body) so Clerk never retries a sign-up note
  - The time is Pacific, assembled from formatToParts
  - Reply-To is the new shaper when their email is valid, else support@
  - No dedupe store; an occasional duplicate is accepted
metrics:
  tasks: 3
  commits: 4
status: complete
actuals:
  tokens: 13000
  tasks: 3
  commits: 4
---

# Quick 261010-j2f: Email the founder for every new sign-up

**Every new Shaper Assistant account now sends one short email to support@shaperassistant.com
saying who signed up, with what email, how (Google, email and password, ...) and when in Pacific
time; the privacy page says so in the founder-approved words.**

## What was built (plain English)

When Clerk tells the site's existing webhook that an account was created, the site builds one
plain-text note and sends it through the same email service the Contact page uses. The note is
nothing but the four facts: name (or "(not given)"), email, how they signed up, and when. No user
id, no IP address, no browser, no picture. Pressing Reply in Zoho writes to the new shaper.

If a server has no email key (development, previews, the tests, the browser suite) nothing is sent
and one log line says it was skipped. If Resend refuses or times out, one error line is logged and
Clerk still gets a 200, so it never retries and never puts the endpoint at risk (the same endpoint
carries account deletion, which is untouched). The words "Sign-up email sent / skipped: no email
key on this server / failed" show in Clerk's Message log.

## The email a test pins (Google, Jane Shaper)

Subject: `New Shaper Assistant sign-up: Jane Shaper`
From: `Shaper Assistant <support@shaperassistant.com>`  To: `support@shaperassistant.com`
Reply-To: `jane@example.com`

```
A new shaper just created an account on Shaper Assistant.

Name: Jane Shaper
Email: jane@example.com
Signed up with: Google
When: Saturday, October 10, 2026 at 2:15 PM PDT (Pacific time)

--
Sent automatically by shaperassistant.com when an account is created.
```

Pinned in `lib/contact/sign-up-notice.test.ts` (built by the function) and in
`lib/clerk-webhook-route.test.ts` R9 (the JSON body actually handed to Resend through the real
route, with fetch replaced).

## Commits

| Task | Commit | What |
|------|--------|------|
| 1 (tracer) | 51b079e | notice module, user.created branch in the core, route wiring, core + route tests |
| 2 | f7bfe03 | every sign-up route's label, odd-account safety, "sign-up email did not send" log wording, R10-R12 |
| 3 | 1dd04a2 | privacy sentence, Resend table row, effective date October 10, 2026; browser spec row count 5 to 6 |
| 3 (fix) | a8b12c8 | components/legal/legal-document.test.ts row count 5 to 6 (see Deviations) |

## Verification

- `npm test`: 132 files, 4666 passed, 2 skipped (both already skipped before this task), 0 failed.
- `npx tsc --noEmit -p .` and `npm run lint`: clean. UserJSON assigns to SignUpUser, so tsc proves the one webhook call.
- Browser suite after the last commit, `PW_PORT=3191 npx playwright test --reporter=list`: **1009 passed, 701 skipped, 0 failed, EXIT=0** (35.2 minutes; the skips are the specs' own project-scoped skips). `e2e/legal-pages.spec.ts` 6 passed (3 projects x 2); `e2e/privacy.spec.ts` 33 passed; `e2e/contact*.spec.ts` 45 passed; `e2e/clerk-webhook.spec.ts` 3 passed, 6 skipped on the phone projects, unchanged.
- No real email sent: every route test replaces fetch; RESEND_API_KEY was only ever stubbed to a fake in tests and blank elsewhere. No `.env*` file read or edited, nothing pushed, no database, migration, geometry file touched.

## Privacy page diff (content/legal/privacy.md)

- `Effective date: October 6, 2026` becomes `Effective date: October 10, 2026`
- End of the "Account information." paragraph gains: `When you create an account, we're sent a short email telling us your name (if you gave one), your email address, how you signed up and when. Resend, the service that also delivers messages from our Contact page, carries that email to us.`
- New last row of "Who else sees it": `| Resend | Delivers the site's email to us | Your name and email address when you sign up, and anything you send from the Contact page |`

Terms keeps its own October 6 date (not part of the approved change).

## Deviations from Plan

**1. [Rule 3 - Blocking] A second test pinned the privacy table at five rows.**
- Found during: final full `npm test` after Task 3 (the plan's Task 3 verify ran only `lib/legal lib/privacy`, which does not reach `components/legal`).
- Fix: `components/legal/legal-document.test.ts` now expects six rows, with a comment naming this task. Same reason as the browser spec's change the plan already called for.
- Commit: a8b12c8.

**2. Test title tidied.** The plan's Task 2 listed a "day roll" case; the measured instant (07:05 UTC, Oct 10) is 12:05 AM PDT on the same date, so the case is titled for what it proves (just after midnight Pacific) rather than a date change.

**3. Process slip, no effect on the result.** I started a second browser-suite run while the first was still running on the same port 3191; I killed both (and the dev server I had started), confirmed port 3191 free, and ran one clean suite. The totals above are from that clean run only.

Task 1 was written with the plan's smaller `signUpMethod` (Google / Email and password / Other) and completed in Task 2 as planned. The interactive tracer checkpoint was not raised: the orchestrator asked for the whole plan in one run and the tracer's automated verify (core + route R9 against the real route) passed before expansion.

## Known Stubs

None.

## Threat Flags

None beyond the plan's register. New surface is only the existing endpoint handling one more signed event type.

## Founder follow-ups (not done here, by design)

- Nothing is pushed. After the founder's go: push, wait for the Vercel deploy, then in Clerk (Production) subscribe the existing endpoint to `user.created` (keep `user.deleted`), then Send Example from the Testing tab, then one real throwaway sign-up (steps in the plan's `user_setup`).
- Noted risk (T-261010-07): the Contact form and sign-up notes share Resend's free daily allowance; Clerk's captcha is on.
- Suggested CLAUDE.md stack-note line is the orchestrator's to add (plan ship_notes).

## Self-Check: PASSED

All created files exist (`lib/contact/sign-up-notice.ts`, `lib/contact/sign-up-notice.test.ts`); commits 51b079e, f7bfe03, 1dd04a2 and a8b12c8 are in `git log` on main; working tree holds only the pre-existing untracked 14-VERIFICATION.md.
