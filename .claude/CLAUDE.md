<!-- GSD:project-start source:PROJECT.md -->

## Project

**Shaper**

A web app that helps surfboard shapers — hobbyist, professional, and curious surfers — design custom boards. Users set overall dimensions, then shape an outline curve, rocker profile, rail contour, and foil, and place fins, with rail-band dimensions, fin placement, and board volume *calculated* from real shaping formulas rather than just hand-drawn. Designs are saved as named models and can be exported as printable full-size templates. Public sharing and paid tiers come later, once real shapers have used the free version.

**Core Value:** The rail-band and fin-placement calculators produce numbers a shaper trusts enough to cut foam to — everything else (visualization, templates, saving) supports that.

### Constraints

- **Geometry math**: All geometry math (outline, rocker, rail band, foil, fin placement, volume) must live in pure TypeScript files under `lib/`, with unit tests — the calculators are the core value proposition, so their correctness must be verifiable in isolation from UI code
- **Units**: UI displays inches and litres (how shapers think and talk); all data is stored in metric internally — for internal precision/consistency while matching shaper-familiar units at the surface
- **Audience**: Users are shapers and surfers, not developers — UI must be approachable to non-technical users, and changes/explanations should be communicated in plain English
- **Tech stack**: Prescribed by the founder's build guide — Next.js (latest, App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui; Neon Postgres via Drizzle ORM; Clerk for auth (Clerk Billing later for subscriptions); hosted on Vercel; Vitest for unit tests, Playwright for e2e — not to be substituted without discussion

<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->

## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
