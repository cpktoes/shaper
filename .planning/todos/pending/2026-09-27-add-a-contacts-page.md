---
created: 2026-09-27T08:40:00.000Z
title: Add a Contacts page
area: site
severity: minor
files:
  - app/
  - components/settings-menu.tsx
  - components/design/phone-menu.tsx
---

## Problem

Captured from the founder on 2026-09-27: "add contacts page." The site has no page that tells a shaper how
to reach the people behind Shaper Assistant — no contact address, no way to send a question, a bug or a blank
they'd like added to the catalogue. Today the only route is whatever the founder shares by hand.

## Solution

To be shaped with the founder before planning (his call on each):

- What the page holds: an email address and a short line about what to write in about (a bug, a blank to add,
  a question), or a small form that sends a message; whether to mention the catalogue makers by name.
- Where it lives and how it's reached: a `/contact` page in the App Router, linked from the gear menu and the
  phone menu (the Blank Makers group made both menus scroll, so there is room) and perhaps a small footer line
  on the home page.
- Plain English, in the app's voice; works signed in or out; nothing collected without saying so.
- If it's a form, it needs a sending path (a Server Action to an email service or a mailto: link to start),
  and the usual browser tests on the three device profiles.
