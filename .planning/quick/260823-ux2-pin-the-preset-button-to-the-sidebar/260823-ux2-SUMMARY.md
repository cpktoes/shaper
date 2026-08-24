---
id: 260823-ux2
slug: pin-the-preset-button-to-the-sidebar
description: Pin the Copy preset values button to the sidebar footer
date: 2026-08-23
status: complete
branch: design/order-form-summary
commits:
  - f7c6af6 fix(design): pin the preset button to the sidebar footer
---

# Quick Task 260823-ux2 — pin the preset button

## What was actually wrong

The button was never pinned on any page — it was the last static child of a scrolling `<aside>`, and
the markup is byte-identical across all three editors. Measured at a 1400px-tall viewport:

| Page | aside overflow | button reachable without scrolling |
|---|---|---|
| Outline | 0px | yes |
| Rails | 0px | yes |
| **Fins** | **44px** | **no** — pushed 4px past the aside's bottom edge |

Outline and rails only *looked* pinned because their controls happen to fit. The fins controls are
longer, so the button fell out of view and you met it mid-scroll immediately under the fin model
buttons. On a laptop-height window all three would eventually behave like fins — this was one screen's
symptom of a structure that was wrong everywhere.

## Fix

Each aside became a flex column: a `min-h-0 flex-1 overflow-y-auto` region holding the controls (the
existing `p-10` moved onto it so the padding scrolls with the content), and a `flex-none` footer
holding the button, separated by a top border. The button's `mt-4` went with it — redundant inside a
padded footer.

Applied to all three editors so the behaviour is structural rather than a coincidence of content
length.

## Verification

Measured on all three pages at both heights, with the route asserted before each measurement (two
pages reporting identical numbers looked like a stale probe until the path check confirmed the
routes really had changed and the figure was a coincidence):

| Viewport | Page | button inside aside | footer gap | controls scroll | aside scrolls |
|---|---|---|---|---|---|
| 900px | outline | yes | 16px | 182px | **0** |
| 900px | rails | yes | 16px | 182px | **0** |
| 900px | fins | yes | 16px | 68px | **0** |
| 1400px | fins | yes | 16px | 0px | **0** |

The aside no longer scrolls on any page; the controls region does, which is the whole point.

- `npx tsc --noEmit` clean; `npx eslint` clean (one pre-existing unused-var warning in
  `outline.test.ts`); `npx vitest run` 638 passed / 7 files.

## Note

I ran `npx prettier --write` on the three files to tidy indentation and it pulled in prettier as a
one-off install — the project does not use it. It reformatted whole files to a style the codebase does
not follow, turning a ~30-line change into 209 insertions. Reverted and redone with a targeted
re-indent; the committed diff is 85/58, which is the real change.

Worth remembering: a formatter that is not in `devDependencies` is not this project's formatter, and
reaching for one to fix indentation costs more than it saves.
