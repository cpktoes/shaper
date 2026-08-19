---
created: 2026-08-19T16:20:36.569Z
title: Add finished-board photo uploads with ratings
area: general
severity: minor
files: []
---

## Problem

Captured during the Phase 1 UI-phase discussion (2026-08-19). The app currently has no
community/marketing loop: users design boards but there's no way to show off the finished,
physically shaped result. Chris wants users to be able to upload photos of their finished
boards along with ratings. Two purposes:

1. **Excitement/marketing piece** — seeing real finished boards (and boards mid-shape)
   motivates other shapers/surfers to start using the app.
2. **Social content feed** — a source of images (people shaping, finished boards, etc.)
   to pull from for social media posts.

Explicitly future-phase work, not Phase 1. Likely depends on auth (Clerk) and storage
being in place, and relates to the roadmap's later "public sharing" direction.

## Solution

TBD. Rough shape: photo upload (needs blob storage — e.g. Vercel Blob), attach photos +
a rating to a saved board model, and a browsable/featured feed surface. Consider moderation
needs before anything is public. Revisit when planning the sharing/community milestone.
