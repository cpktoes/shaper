---
phase: quick-261006-g5q
plan: 01
subsystem: contact
status: complete
tags: [contact, rate-limit, resend, security]
requires: [quick-260929-u1t, quick-260929-w2k, quick-261006-g4u]
provides: [per-visitor Contact send limit, "limited" form state, signed-out entry-point inventory]
affects: [app/actions/contact.ts, components/contact/contact-form.tsx, e2e/contact.spec.ts]
tech-stack:
  added: []
  patterns: [pure decider with injected store + clock, globalThis-held Map (practice rack's pattern)]
key-files:
  created:
    - lib/contact/rate-limit.ts
    - lib/contact/rate-limit.test.ts
  modified:
    - lib/contact/message.ts
    - lib/contact/message.test.ts
    - lib/contact/delivery.ts
    - lib/contact/delivery.test.ts
    - lib/contact-server.ts
    - app/actions/contact.ts
    - components/contact/contact-form.tsx
    - e2e/contact.spec.ts
decisions:
  - "Contact sends are limited to five per visitor per hour, counted only for a message that would really go out (after the anti-spam field, the field checks and the availability check)"
  - "A refused send is not recorded, so retrying while limited never pushes the wait further out"
  - "app/actions/account.ts (quick 261006-g4u) needs no limit: both actions refuse a signed-out caller after await auth()"
metrics:
  duration: ~6 min
  completed: 2026-10-06
actuals:
  tokens: 7700
  tasks: 2
  commits: 2
---

# Quick 261006-g5q: A per-visitor limit on the Contact form — Summary

One visitor can now send at most five Contact messages an hour. A sixth gets a kind "try again in about an hour,
or email us at support@shaperassistant.com" line where a failed send's line shows, and keeps what they typed.
Anyone else can still send. The limit's own file explains in plain words what it protects, what it doesn't, and
why nothing else a signed-out visitor can reach needs a limit.

## What changed on the Contact page

- The first five messages from one visitor within an hour send exactly as before.
- A sixth shows: "That's a few messages in a short time. Please try again in about an hour, or email us at
  support@shaperassistant.com." It sits in the same spot and the same style as the "That didn't send, sorry…"
  line. The message stays in the box and the address is a link.
- A send stops counting exactly one hour after it was made. Trying again while refused does not make the wait
  longer.
- Only messages that would really go out count. Spam caught by the hidden field, a form with a mistake (say, a
  mistyped email) and a server with no way to send never use one up.
- A visitor's address is held only in the server's memory, for at most an hour after their last send, and never
  for more than 10,000 visitors at once. It is never logged, saved, or sent to the browser. The one server log
  line on a refusal names neither the address nor anything typed.

## Commits

| Task | Commit | Subject |
| ---- | ------ | ------- |
| 1 | 6332fcf | Contact form: the rules for at most five messages an hour from one visitor |
| 2 | f89e541 | Contact form: a sixth message in an hour gets a kind try-again-later line instead of sending |

Task 1 (TDD): RED first. The new rate-limit, copy and submitContact tests failed (module missing, `limitedLead`
undefined). Then GREEN: `npx vitest run lib/contact/` gave 130/130.
Task 2 (TDD): RED first. The new browser case failed on desktop at the sixth send (no alert, the sent panel
showed instead), and boundary test (e) failed. Then GREEN as below.

## Verification

- `npx vitest run`: 124 files, 4445 passed, 2 skipped (both skips pre-existing, not in this task's files).
- `npx tsc --noEmit`: clean.
- `npm run lint`: clean.
- `PW_PORT=3133 npx playwright test e2e/contact.spec.ts`: **45 passed** (15 cases × iphone, android, desktop),
  including the new "a sixth message within the hour is turned away kindly…" case on all three. Each run logged
  exactly one `[WebServer] Shaper: contact send refused — one visitor reached the hourly limit` line per project,
  with no address in it. The dev server on 3133 was stopped afterwards (port confirmed free).
- Acceptance greps: `rate-limit.ts` has 0 imports. `await input.allowSend` appears once in `delivery.ts`.
  `allowSend: takeContactSendSlotForRequest` appears once in the action. `__shaperContactSends` appears once in
  `contact-server.ts`. `limitedLead` is in the form. `setExtraHTTPHeaders` is in the spec once, and
  `CONTACT_SEND_LIMIT` twice.
- `npm run build` was not run (orchestrator's step).

## Signed-out entry points (re-read at execution time)

The grep found the plan's list plus one new file. `app/actions/account.ts` (quick 261006-g4u) has two actions,
`exportMyDesigns` and `deleteMyAccount`. Both return a refusal straight after `await auth()` when signed out
(`{ exported: false }`, and `{ deleted: false, reason: "signed-out" }`), before any database call. So it needs no
limit, and the file header lists it. Every other entry point matched the plan's `<context>` when read from its own
file. There is still only one route: `app/api/webhooks/clerk/route.ts`.

## Deviations from Plan

None that change behaviour. Two choices the plan left open:
- The form uses one alert element that picks its lead line by status (failed or limited), rather than two sibling
  conditions, so the two lines can never both show. The plan allowed either.
- The refused line's wording is exactly as approved. No layout reason came up to change it.

## Known Stubs

None.

## Threat Flags

None. The only new surface is reading `x-forwarded-for` / `x-real-ip` inside the existing Contact action, which
the plan's threat model already covers (T-g5q-02, T-g5q-04).

## Founder review (from the plan's `<founder_review>`)

What the orchestrator shows the founder before anything is pushed, from the local dev server. Take each picture
on a computer (1440×900) and an iPhone-sized window (390×664):

1. The Contact page after the sixth send within the hour: the "That's a few messages in a short time…" line under
   the form, with the typed message still in the box.
2. For comparison, the existing "That didn't send, sorry…" line on a failed send, in the same place and style.
3. A short plain-English note of the numbers and their limits:
   - five per visitor per hour, counted only for messages that would really go out;
   - each Vercel server copy counts separately, so a visitor could get a few more if Vercel runs several;
   - many different addresses at once could still use up Resend's free daily allowance, and then the form shows
     the support address instead;
   - nothing else a signed-out visitor can reach costs anything (the list is in `lib/contact/rate-limit.ts`'s
     opening comment);
   - the blank list is unchanged, as agreed.
4. The wording is the founder's to change. The planner added "or email us at support@shaperassistant.com".

**How to reproduce the limit message locally:**
- Start the dev server with `SHAPER_CONTACT_STAND_IN=1`.
- In the scratch Playwright script, set the cookie `shaper-contact-stand-in=sent` for the server's URL.
- Set one fixed address with `page.setExtraHTTPHeaders({ "x-forwarded-for": "2001:db8::f0:1" })`. Any
  documentation-range address works; use a new one for each fresh run, because the server remembers an address
  for an hour.
- Send **five** messages. For each: go to `/contact`, fill Message and "Email to reply to", click "Send message",
  and wait for "Sent — thanks for writing."
- Then go to `/contact` once more, fill the fields, and send a **sixth**. That page is picture 1.
- For picture 2, use the cookie `shaper-contact-stand-in=failed` and send once (from any address).

Without the header, every request from the script shares the loopback address (`::1`), so the sixth send from
any one script run still trips the limit. But a second run within the hour starts already limited, which is why
a fresh `x-forwarded-for` for each run is the cleaner way.

## Self-Check: PASSED

- FOUND: lib/contact/rate-limit.ts, lib/contact/rate-limit.test.ts
- FOUND: commits 6332fcf, f89e541 on main
