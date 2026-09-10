---
quick_id: 260909-nvw
type: quick
executed_inline: true
---

# Quick task 260909-nvw — slider dots always show on a phone

**Founder's report:** "the sliders still appear greyed out until touched. they should always be
available." Then: "template width doesn't work at all", and "there is no dot before touching the
sliders and no dot on the width ever appears."

**Diagnosis (measured, not assumed):** the live site and a local production build both rendered
every slider folded behind the phone's Fine adjust header with `--position: NaN%; visibility:
hidden` on its dot, while the dev server rendered them correctly. Base UI positions a dot from a
measurement of its control's box; a row that is `display: none` at load measures zero, and the
ResizeObserver that should re-measure it is attached in the dot's own layout effect, which runs
before the control's ref exists — so in production it is never attached. StrictMode's double
effect run on the dev server hid this for a whole phase. A value change re-measures, which is why
a dot appeared once a slider was touched.

**Fix:** the wrapper in `components/ui/slider.tsx` watches its own control and remounts the dot
(an epoch in its key) when the control's width goes from zero to something.

**Proof:** `playwright.prod.config.ts` + `npm run test:e2e:prod` with `e2e/prod/slider-dots.spec.ts`
against `next start`; a source-contract unit test; the dev suite unchanged.

Executed inline by the orchestrator because the founder was testing the live site and the fix was
one wrapper hook; the plan is recorded here for the quick-task log.
