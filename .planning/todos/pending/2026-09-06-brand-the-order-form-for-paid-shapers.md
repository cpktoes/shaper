---
created: 2026-09-06T00:00:00.000Z
title: Brand the order form with a shaper's own logo and contact details (paid tier)
area: general
severity: minor
files:
  - components/summary/order-form.tsx
  - app/design/summary/order-form.css
---

## Problem

Captured 2026-09-06. The order form is the one thing in Shaper that leaves the app and gets
handed to someone else — a shaper prints it and gives it to a customer, or works from it on the
bench. Today it carries Shaper's own "SHAPER" wordmark and nothing that identifies the person who
made the board.

A working shaper handing that sheet to a customer wants it to be *their* form: their logo at the
top, their name, their phone number, their address. That is what a customer keeps on the fridge
and calls when they want a second board. Right now they'd have to write it on by hand.

This is a natural top-tier feature — it is the first thing in the app that is worth money to a
professional rather than a hobbyist, because it turns a worksheet into a piece of their own
business stationery. It sits alongside the free/paid split already noted in PROJECT.md (build-guide
milestones M4–M5, Clerk Billing) rather than being free-tier work.

## Solution

TBD. Rough shape:

- A shaper uploads a logo and enters Contact Name, Phone and Address once — a business-details
  panel on their account, not per board, in the same spirit as the units preference (it describes
  the shaper, not the design).
- Both printed sheets carry it. Page 1 replaces or sits beside the current wordmark; page 2's
  header strip likely wants the same treatment so a detached second sheet still identifies its
  shaper.
- Gated to the paid tier. Free-tier shapers keep exactly the sheet they have now.

Open questions to settle when this is planned, not now:

- **Storage** — a logo is a real file, which the app has never had. Vercel Blob is the likely
  answer and would be shared with the finished-board photo uploads todo
  (`2026-08-19-add-finished-board-photo-uploads-with-ratings.md`); worth planning those two
  together so blob storage is stood up once.
- **Print fidelity** — an arbitrary uploaded image has to print cleanly at the order form's ~0.69
  print zoom without pushing the sheet onto a second page. `useOrderFormPrintFit` fits each sheet
  to the Letter/A4 intersection, so the logo needs a bounded box rather than free rein, and a
  wide-vs-tall logo should not reflow the panel around it.
- **What happens on downgrade** — a shaper who lapses should not have a customer-facing sheet
  silently change identity mid-order. Decide whether branding persists read-only or reverts.
- **Units interaction: none.** This is identity, not measurement, so nothing here goes through
  the display boundary — but the branding block must not disturb the seven dimension cells or the
  page-2 layout that Phase 7 verified as clip-free in both systems.
