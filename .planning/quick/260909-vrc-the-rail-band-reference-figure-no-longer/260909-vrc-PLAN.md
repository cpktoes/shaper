---
quick_id: 260909-vrc
type: quick
executed_inline: true
---

# Quick task 260909-vrc — the rail band reference figure follows the theme on screen

**Founder's report (with a screenshot of the Summary's third page on a dark theme):** "fix white
background on a dark theme."

**Cause:** `components/rails/rail-plan-side-figure.tsx` drew its panel with a hardcoded white
background and beige border and its labels in a hardcoded near-black, and the reference paths'
colour map carried the prototype's hex values, three of which cannot survive a dark ground: the
board outline (#1c1b19, 1.07:1 on Slate), the rail-mark red (#C00000, 2.84:1) and the tuck purple
(#7030A0, 2.30:1). The same figure appears on the RAILS INSTRUCTIONS tab and the printed sheet.

**Fix:** the panel and labels use the theme's ground, faint line and ink tokens; the prototype's
colour map stays byte-for-byte (its fidelity test still pins it, and print forces the Daylight
tokens so paper is unchanged) and a screen-side map beside it routes the three dark-sensitive
entries through tokens: the outline through the ink token, the red and purple through two new
per-theme tokens that resolve to the prototype's values on the light themes and to lifted variants
of the same hue on Slate and Phosphor.

Executed inline by the orchestrator: one component, one colour map, two tokens.
