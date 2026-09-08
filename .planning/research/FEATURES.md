# Feature Research

**Domain:** Mobile/touch support for a browser-based surfboard CAD tool, plus a rail-markings instructional screen (Shaper v1.2)
**Researched:** 2026-09-07
**Confidence:** MEDIUM-HIGH (patterns are well-established across mobile CAD/drawing tools and touch UX literature; surfboard-specific tools give thin but directly relevant data points — iShaper in particular is a phone-native precedent in the same domain)

## How the comparable tools actually handle a phone screen

This matters more than any single feature, because it sets the ceiling on what "touch-first" should mean for Shaper.

| Tool | Phone/small-screen story |
|------|---------------------------|
| **Figma** | Refuses full editing on phone by design — mobile app is view/comment/mirror only; editing requires desktop or iPad. The stated reason is that the toolset doesn't fit a small screen, not a technical limitation. |
| **Shapr3D** | iPad/Pencil-first; iPhone support exists but is treated as the weak edge of the product, not the target device. Sketch/model on iPad, review on iPhone. |
| **Procreate** | Full editing works on phone, but the *interaction model* is redesigned for touch from the ground up — two-finger gestures reserved for zoom/undo, one-finger for drawing, radial menus instead of toolbars, distance-sensitive slider precision. |
| **iShaper** (surfboard-specific, phone-native) | Built for iPhone/iPad from day one. Full outline editing with touch-sized control points, touch-and-hold to read a dimension at any point, an explicit warning ("alert") if a control point is dragged far enough to break the design's validity, and one-tap export of full-size templates and spec sheets. This is the closest real precedent to what Shaper needs to become. |
| **Shape3d / AkuShaper** (surfboard-specific, desktop CAD) | No real mobile editing story. AkuShaper's only phone-facing feature is letting a *customer* approve a design from their phone — a read-only review link, not a design surface. |

**Reading for Shaper:** the domain splits cleanly into tools that treat phone as "view/approve only" (Figma, AkuShaper-for-customers) and tools that treat phone as a first-class editing surface by redesigning touch interaction rather than shrinking the desktop UI (Procreate, iShaper). Shaper's own requirement — "every screen works on a phone, end to end" — puts it in the second camp. That's achievable because Shaper's editing surfaces are much simpler than Figma's or Shapr3D's: five design screens, each with a handful of draggable stations (outline, rocker, foil) or dropdown/toggle-driven state (rails, fins), not an open-ended canvas. This is a controlled-vocabulary editor, not free-form drawing — which is exactly the kind of tool that survives the jump to phone.

## Touch interaction patterns for dragging a point on a curve

**What Shaper already has (checked against `components/outline/outline-viewer.tsx`):** pointer events are already unified (`onPointerDown/Move/Up/Cancel`, not separate mouse/touch handlers), `touch-action: none` is already set on drag targets so a drag doesn't scroll the page, and there's already a deliberate invisible hit radius larger than the drawn dot (`DRAG_HIT_PX = 15`, i.e. a 30px-diameter grab zone around a 14px-diameter visible target). That is real groundwork — the milestone isn't starting from zero on touch plumbing, it's starting from zero on touch *sizing and layout*.

**What the research says the sizing should be:**
- Apple HIG and Android both converge on **44×44 CSS px** (WCAG 2.5.5 codifies the same number) as the minimum reliable touch target; Nielsen Norman's fat-finger research backs the same figure with ~1cm×1cm as the physical-world equivalent.
- Shaper's current 30px-diameter hit zone is under that floor. Bumping `DRAG_HIT_PX` toward ~22 (44px diameter) is a small, mechanical change — but it interacts with station spacing: rocker and foil editors have five stations across the board's length, and outline has more control points along a curve, so hit zones that are individually correct can still overlap each other at 44px each. This needs a spacing check, not just a constant bump.

**The four standard patterns for "how do you grab a point without your thumb hiding it," in complexity order:**
1. **Direct drag with an oversized invisible hit zone** (what Shaper already does) — simplest, no new interaction to learn, works well when points are sparse. Table stakes; the milestone's own examples (outline, rocker, foil) all have few enough points that this is sufficient on its own.
2. **Drag with a vertical offset** — the point's visual position tracks the finger but rendered a fixed distance above the fingertip, like a text-selection handle, so the fingertip never covers the thing being placed. Differentiator; worth adding only where fine placement really matters (e.g., a rail-band mark or a fin-toe point), not needed everywhere.
3. **Magnifier/loupe overlay** — a zoomed-in circular preview near the touch point, as iOS text-cursor selection uses. Highest complexity of the four; genuinely useful only when points are dense or hidden under the finger even with an offset.
4. **Long-press to arm, then nudge via stepper/arrow buttons** — used when pixel-level precision matters more than gesture speed.

**Why Shaper doesn't need all four:** the design-tool constraint (see CLAUDE.md/PROJECT.md) already gives every curve point *two* other ways to hit an exact number — a slider and typed entry (the rocker editor is explicitly "adjustable by slider, typed imperial fractions, or dragging the curve"). That means drag is the *coarse/visual* input, not the only path to precision. This is the single most important finding for scoping touch work: **build pattern #1 well (correct hit-target size, correct spacing) and treat sliders/typed fields as the phone's precision path**, rather than building a magnifier or offset-drag system to make raw dragging pixel-accurate on a 6-inch screen. A magnifier loupe here would be solving a problem the app doesn't have, because the numeric/slider path already exists.

**Pinch-zoom vs. dragging a handle:** Shaper's viewers currently have **no pan/zoom at all** — each SVG viewer fits its container at a fixed scale. That sidesteps the classic mobile-CAD problem entirely (reconciling a one-finger drag-a-point gesture with a two-finger pinch-to-zoom gesture, which is a well-documented source of gesture conflicts in canvas tools like Figma/Miro/Excalidraw, where the same wheel/touch event has to be disambiguated by finger count and OS-level trackpad quirks). Given the milestone's own framing — "viewers that fill the screen" — the right move is to make the existing fit-to-container viewers genuinely fill a phone screen (bigger, not zoomable), not to introduce pinch-zoom-and-pan. Building a zoom/pan system now would import a real class of gesture bugs to solve a problem ("the curve is too small to see") that responsive sizing already solves for a 5-to-9-point curve.

## What a shaper actually does on a phone vs. at a desk

This should govern which screens get full editing polish versus which just need to not be broken.

- **At the shaping bay, hands full of foam dust:** realistically, a shaper is not doing fine curve-sculpting with a glass touchscreen and dusty/gloved fingers. What they actually want here is to **glance at a number** — "what's the rail thickness at station 3," "how far off the tail does the front fin go" — in large, legible type, with minimal taps to get there. This favors the summary/order-form-style views (already built) over anything requiring precision dragging. It's also the strongest argument for the printed template/order form remaining the trusted, screen-independent artifact it already is — the phone is a lookup tool in the bay, not the primary interface.
- **Showing a board to a customer or a curious surfer:** this is a viewing/presentation use case — outline, rocker, volume, the finished look — where fidelity and a full-screen viewer matter, but dragging a curve mid-conversation is unlikely. Read-then-adjust-a-little (nudge a rail width while someone's watching) is plausible; ground-up redesign from a park bench is not the common case.
- **Idle tinkering (couch, break at work):** a shaper trying an idea — "what if the tail were narrower" — genuinely does want to drag and see the volume number move, but in short, low-precision sessions. This is the case that most needs the touch-drag work described above, and it's satisfied by pattern #1 (bigger hit zones) plus the existing slider/typed-entry precision path, not by heavier machinery.
- **Designing an entire board from scratch on a phone, start to finish:** rare, but the milestone explicitly requires it to *work* ("every screen works on a phone, end to end"). The bar here is **usable and complete, not the best environment for creative work** — a hobbyist who only owns a phone should be able to get through setup → outline → rocker/foil → rails → fins → summary without a screen that a desktop-only feature blocks. This is a breadth requirement (touch-size everything, make every screen fit) rather than a depth requirement (no screen needs bespoke phone-only power tools).

**Net implication for the roadmap:** don't chase full feature-parity precision-editing on phone as the goal in itself. The goal is that *nothing is desktop-only* and that the two or three curve-drag screens (outline, rocker, foil) get correctly-sized touch targets — while investment in exotic touch interaction (magnifiers, offset-drag, gesture-based zoom) stays out of scope unless real shaper feedback says the numeric/slider path isn't enough.

## Instructional/legend screens in technical tools

Convention (borne out by how engineering drawings are read — title block/legend first, then dimensions) is that a legend belongs **once, in a fixed, discoverable place**, referenced by everything else on the sheet rather than repeated inline. For an on-screen tool, the equivalent choices are a tab, a modal, or an overlay on the working view — and the milestone has already picked the right one for this context:

- **Tab (chosen for Shaper's INSTRUCTIONS)** — sits alongside the rails screen's other tabs, discoverable without leaving the screen's context, revisitable at will, and — critically for this app — foldable into print as its own sheet. This matches how Shaper already organizes screens (tabbed panels elsewhere in the app) so it's zero new navigational pattern to learn.
- **Modal** — better for a one-time "here's what's new" nudge, worse for something a shaper wants to flip back to mid-task while comparing their own board's rail to the labeled example. Wrong choice here.
- **Overlay on the working view** — good for inline annotation (hover a mark, see its name) but doesn't stand alone as a printable sheet the way a tab's content does, and the milestone explicitly wants this content printable.

**What makes a legend get read instead of skipped:** it has to answer a real question the user has *while doing the task*, not sit as reference material nobody opens. The features that make that happen, all already implied by the milestone's own spec:
- An **interactive example** (the Flat/Domed toggle) beats a static diagram — flipping it and watching the labeled marks move teaches the vocabulary faster than reading it.
- **Callouts on the actual drawing**, not a text glossary next to it — a shaper matches shapes, not words, especially one who thinks in foam rather than terminology.
- **Optional inclusion in print** turns the instructional tab from a screen-only explainer into a leave-behind reference (e.g., tucked in with an order form going to a production shaper who might not have opened the app) — this is the differentiator version of a legend, most tools stop at "explain it on screen."

## Actual-size (1:1) on-screen views

The pattern is well-worn (dozens of "online ruler, actual size" sites) and splits into two camps:

- **Calibrated tools** (the majority): ask the user to hold a known object — almost always a credit/ID card, ISO 7810-standardized at 85.6mm wide — up to the screen, or to enter their screen's diagonal size, because **a browser only ever reports pixel resolution, never physical screen size**, so an un-calibrated "1 inch" on one device can be visibly wrong on another.
- **Uncalibrated, declared-scale tools**: assume a standard density (commonly the ~96 CSS-px-per-inch that browsers themselves use as their internal reference unit) and present the result as approximate.

**Shaper has already made the right call for its own use case** (per the milestone's own framing: "standard-screen assumption, same as the prototype, with no calibration step"), and the research supports that decision rather than second-guessing it: a calibration step is friction that's disproportionate to the task. A shaper holding a screen against foam to eyeball a rail contour doesn't need the same precision as someone laying a ruler on the desk — they need a "close enough to check the shape and read the marks" reference, and the printed 1:1 template (already verified ruler-true) remains the artifact for anything that needs to be dead-on. The one thing every calibrated *and* uncalibrated tool does that Shaper should also do: **say so, once, near the view** — a short, honest line near the "View Full Sized" control that actual size depends on the device's screen and may be approximate — rather than presenting the view as guaranteed-accurate. That's a one-line caveat, not a feature; skipping it is the anti-feature (silently implying precision the app can't actually promise without calibration).

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Touch-sized controls (sliders, buttons, tabs) app-wide | Every touch-first tool in the comparison set (iShaper, Procreate) sizes to ~44px minimum; below that, taps miss and users assume the app is broken, not that they mis-tapped | LOW–MEDIUM | Mostly Tailwind sizing/spacing changes; the milestone already names this ("finger-sized sliders and buttons") |
| Responsive layout across all five design screens + setup + rack + summary | Zero responsive breakpoints exist today (per PROJECT.md); a screen that doesn't reflow on a phone is the single fastest way to look broken/incomplete | MEDIUM–HIGH | Breadth work — touches nearly every component file, not just the curve editors |
| Direct touch-drag on curve points (outline, rocker, foil) with a correctly sized hit zone | Baseline expectation once any drag exists on desktop; a mouse-only drag handle on a touch device reads as a bug | MEDIUM | Groundwork already exists (unified pointer events, `touch-action: none`, an existing-but-undersized hit radius); needs size + spacing tuning, not a rebuild |
| Full-screen, legible viewers on phone (outline, rocker, rail, fin diagrams) | A shrunk desktop diagram on a 6" screen is unreadable, not just cramped | MEDIUM | "Viewers that fill the screen" is explicit in the milestone |
| A legend/instructions screen for domain-specific markings, in a tab next to the working view | Standard technical-drawing convention (title block/legend once, referenced elsewhere); rail-band terminology (apex, tuck, mark) isn't self-explanatory to a hobbyist | MEDIUM | New geometry variant (`halveDeckMark1`) gates this — see Dependencies |
| "Include in Print" checkbox for the instructions sheet, matching the app's existing print-option pattern | The app already has this exact pattern (Overview Sheet, Paper Saver toggles) — a new print sheet without the same on/off control would be inconsistent | LOW | Reuses an established UI pattern from Phase 3/7 |
| Everything a shaper can do signed-in on desktop, they can do on a phone (sign in, pick preset, open a saved board, edit, save, read summary) | Explicit milestone requirement; also the norm for "real" mobile-capable tools (iShaper) as opposed to view-only ones (Figma mobile) | HIGH (breadth) | Not a new capability anywhere — it's making existing capability not break on a small screen |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "View Full Sized" 1:1 on-screen rail cross-section | Lets a shaper hold the phone against foam mid-shape without printing anything — no surfboard-specific competitor found offers an un-printed, on-screen 1:1 reference; iShaper's precision tool is touch-and-hold for a *number*, not a to-scale visual | MEDIUM | Reuses the existing rail cross-section renderer; needs the same fixed-96-CSS-px assumption the prototype already uses, plus a one-line "approximate, depends on your screen" caveat |
| Board-outline plan/side reference view with legend checkboxes, tied to rail sections | Answers "where on the board is this cross-section from" — a spatial cross-reference most rail-band UIs skip, directly reinforcing the app's core value (numbers a shaper trusts) by showing *where* a number applies, not just the number | MEDIUM–HIGH | Depends on the shared design store (Phase 1) already owning cross-screen board state — this was previously blocked, now isn't |
| Interactive Flat/Domed toggle on the live example rail | Turns a static "here's what a mark means" image into a teaching tool — the example visibly changes shape as the shaper flips the toggle, reinforcing the concept rather than just labeling it | LOW–MEDIUM | Small state + rendering change on top of the existing rail cross-section component |
| Instructions sheet foldable into a leave-behind printed reference | Extends a screen-only explainer into something that travels with an order form to a production shaper — no comparable feature found in the competitor set | LOW | Direct reuse of the existing print-composition pattern |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Calibration step for the "actual size" view (match a credit card to the screen) | Every generic "actual size ruler" website does this, so it looks like the "correct"/thorough way to build a 1:1 view | Adds friction and a UI flow to a feature meant for a quick hold-against-foam check, not a load-bearing measurement — the milestone has already deliberately rejected this ("no calibration step"), and the printed 1:1 template already carries the ruler-true guarantee | A single, honest disclaimer line near the view instead of a calibration flow |
| Pinch-to-zoom / pan canvas on the curve viewers | Feels like standard "professional" CAD/drawing-tool behavior (Figma, Procreate, Shapr3D all have it) | Imports a well-documented class of gesture-conflict bugs (disambiguating a one-finger drag-a-point gesture from a two-finger pinch, OS/browser event inconsistencies) to solve a problem — "the curve is too small" — that a responsive, fills-the-screen viewer already solves for a curve with only 5–9 points | Make the existing fit-to-container viewers genuinely fill the phone screen; revisit zoom only if real usage shows it's still too small |
| Magnifier/loupe overlay for precise touch dragging | Looks like the "proper" solution to fat-finger imprecision, seen in iOS text selection and some CAD apps | Solves a problem Shaper doesn't have: every draggable curve point already has a slider and typed-entry precision path, so drag only needs to be good enough for coarse/visual shaping | Correctly size the existing hit-zone pattern; point users at the slider/typed field for exact numbers |
| A separate reduced/"view-only" mobile mode (Figma-mobile style) | Common industry pattern, seems like the pragmatic way to ship phone support fast | Directly contradicts the milestone's explicit requirement that every screen works end-to-end on a phone, and cuts off the hobbyist-shaper-with-only-a-phone use case the app is trying to serve | Full touch-first editing everywhere, scoped by effort (breadth of sizing/layout work) rather than by cutting capability |
| 3D rotate/orbit gesture support on phone | AkuShaper and Shapr3D both lean on 3D visualization, so it can look like an obvious mobile-native feature to add alongside phone support | Out of scope for this app entirely — Shaper is explicitly 2D calculators, not 3D visualization (already excluded from the project), and touch-orbit controls are real complexity for a capability the product doesn't have | N/A — not applicable until/unless 3D visualization itself is ever scoped |
| Auto-detecting device/screen specs to compute an exact PPI for the 1:1 view | Sounds more "accurate" and technically impressive | No web API reliably reports true physical screen size; any such feature either silently guesses (no better than the fixed assumption already chosen) or forces the calibration flow already rejected above | Keep the fixed-scale assumption, disclosed as approximate |

## Feature Dependencies

```
INSTRUCTIONS tab (live example rail + Flat/Domed toggle)
    └──requires──> `halveDeckMark1` variant in lib/geometry/rail-bands.ts
                       └──requires──> unit tests + regenerated golden fixture (Rule 1 — pure geometry function, never inlined)

"Include Rail Band Instructions in Print" option
    └──requires──> INSTRUCTIONS tab existing and rendering correctly on screen
    └──enhances──> existing print-composition pattern (Overview Sheet / Paper Saver toggles, Phase 3/7)

"View Full Sized" 1:1 rail cross-section
    └──requires──> existing rail cross-section renderer (reused, not rebuilt)

Board-outline plan/side reference view
    └──requires──> shared design store (Phase 1) owning cross-screen board state — previously the blocker, now resolved
    └──enhances──> the rail-bands screen's existing per-station data

Touch-sized drag handles on outline/rocker/foil
    └──requires──> existing unified Pointer Events + touch-action:none groundwork (extend, don't rebuild)
    └──relies-on──> existing slider/typed-entry input paths as the precision fallback (reduces need for magnifier/offset-drag)

Responsive layout app-wide
    └──requires──> nothing new architecturally, but touches nearly every screen (breadth work, no single hard dependency)

Pinch-zoom-and-pan canvas ──conflicts──> "keep viewers simple, fit-to-container" (no zoom exists today; adding it is a scope decision, not a natural next step)

Calibration step for 1:1 view ──conflicts──> the milestone's own "no calibration step" decision (would reopen a settled question)
```

### Dependency Notes

- **INSTRUCTIONS tab requires the `halveDeckMark1` geometry variant:** this is the one place where UI work is gated by geometry work. It has to land first, tested and fixture-backed, before the tab can render a trustworthy live example — consistent with Rule 1 (no number ever inlined in a component).
- **Board-outline plan/side reference view requires the shared design store:** called out explicitly in PROJECT.md as previously blocked and now unblocked by Phase 1's architecture — worth sequencing this feature after confirming the store already exposes what the rails screen needs, not assuming it does.
- **Touch-drag sizing relies on the existing slider/typed-entry precision path:** this is a dependency in the sense that it changes scope — if that alternate precision path didn't exist, touch-drag would need to carry full precision itself (magnifier-tier complexity). Because it does exist, touch-drag only needs to be "good enough to shape by eye."
- **Pinch-zoom conflicts with the "fill the screen" approach:** not a hard technical conflict, but a scope one — building both in the same milestone would mean solving a gesture-disambiguation problem the milestone doesn't actually need solved yet.

## MVP Definition

### Launch With (v1.2)

- [ ] INSTRUCTIONS tab with a live example rail, named callouts, and a Flat/Domed toggle — this is the rails screen's one missing tab from the original prototype
- [ ] "Include Rail Band Instructions in Print" checkbox, in the shaper's chosen unit system
- [ ] "View Full Sized" 1:1 on-screen rail cross-section, fixed-scale assumption, one-line accuracy caveat, no calibration flow
- [ ] Board-outline plan/side reference view with legend checkboxes on the rails screen
- [ ] Touch-sized controls (44px-class targets) across sign-in, preset picker, rack, all five design screens, and summary
- [ ] Correctly sized, spacing-checked touch-drag hit zones on outline, rocker, and foil curve points
- [ ] Full responsive layout (viewers fill the screen, no desktop-only screen or control) end to end on a phone

### Add After Validation (v1.x)

- [ ] Drag-with-offset or nudge-stepper precision aid — only if real shaper feedback says the slider/typed-entry path isn't enough on phone
- [ ] Extending the plan/side reference view pattern to other screens (fins placement, foil stations) if the rails-screen version proves useful

### Future Consideration (v2+)

- [ ] Pinch-zoom-and-pan on curve viewers — defer until a real usage signal shows fit-to-screen sizing isn't enough
- [ ] Calibrated (credit-card) actual-size view — defer indefinitely unless a shaper explicitly asks for measurement-grade accuracy from the screen itself, which the printed 1:1 template already provides
- [ ] Any 3D visualization or orbit gestures — tied to the already-deferred 3D visualization idea, not this milestone

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Touch-sized controls app-wide | HIGH | MEDIUM | P1 |
| Responsive layout across all screens | HIGH | HIGH | P1 |
| Touch-drag hit-zone sizing/spacing fix | HIGH | MEDIUM | P1 |
| INSTRUCTIONS tab (live example + toggle) | HIGH | MEDIUM | P1 |
| `halveDeckMark1` geometry variant + tests + fixture | HIGH (blocks INSTRUCTIONS) | LOW–MEDIUM | P1 |
| "Include Instructions in Print" | MEDIUM | LOW | P1 |
| Board-outline plan/side reference view | MEDIUM–HIGH | MEDIUM–HIGH | P1 |
| "View Full Sized" 1:1 rail view | MEDIUM | MEDIUM | P1 |
| Accuracy caveat line on 1:1 view | MEDIUM (trust) | LOW | P1 |
| Drag-offset/nudge precision aid | LOW–MEDIUM (unproven) | MEDIUM | P3 |
| Pinch-zoom-and-pan | LOW (unproven need) | HIGH | P3 |
| Calibrated actual-size view | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for v1.2 launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration — explicitly deferred pending real usage signal

## Competitor Feature Analysis

| Feature | iShaper (phone-native surfboard) | Figma (view-only mobile) | Procreate (touch-native drawing) | AkuShaper/Shape3d (desktop CAD, phone for review only) | Shaper's Approach |
|---------|-----------------------------------|---------------------------|-------------------------------------|----------------------------------------------------------|--------------------|
| Full editing on phone | Yes, built for it | No — view/comment only | Yes | No — phone is customer-approval only | Yes, required end to end per milestone |
| Touch-sized drag points | Yes, purpose-built control points | N/A (no phone editing) | Yes, gesture-redesigned | N/A | Extend existing pointer-event groundwork to meet 44px-class targets |
| Precision beyond raw drag | Touch-and-hold reads exact dimension at a point | N/A | Distance-sensitive slider precision | N/A | Already has slider + typed-entry precision path; lean on it instead of building a magnifier |
| Guardrails against bad edits | Alerts if a control point moves far enough to break the design | N/A | N/A | N/A | Not in v1.2 scope, but a natural future differentiator once phone editing ships |
| 1:1 on-screen reference | Not found in iShaper's own marketing | N/A | N/A | N/A | Differentiator — no comparable found in the surfboard-tool set |
| Instructional/legend content | Not surfaced as a feature | N/A | N/A | N/A | Differentiator — tab-based, interactive, printable |
| Pinch-zoom canvas | Not called out | Yes (desktop/tablet) | Yes | Yes (desktop) | Deliberately deferred — no zoom exists today, and none needed for 5–9 point curves |

## Sources

- [Figma mobile app guide — view-only limitations](https://help.figma.com/hc/en-us/articles/1500007537281-Guide-to-the-Figma-mobile-app)
- [Figma system requirements](https://help.figma.com/hc/en-us/articles/360039827194-What-are-the-system-requirements-for-Figma)
- [Shapr3D official site — platform availability](https://www.shapr3d.com/)
- [Shapr3D Software Reviews — SoftwareAdvice](https://www.softwareadvice.com/product/463843-Shapr3D/)
- [iShaper: Custom Surfboards — App Store listing](https://apps.apple.com/app/apple-store/id1436528551)
- [Shape3d official site](https://www.shape3d.com/)
- [AkuShaper official site](https://akushaper.com/) and [AkuShaper software page](https://akushaper.com/software)
- [Nielsen Norman Group — Touch Target Sizes](https://www.nngroup.com/articles/touch-target-size/)
- [Adrian Roselli — Target Size and WCAG 2.5.5](http://adrianroselli.com/2019/06/target-size-and-2-5-5.html)
- [Procreate Handbook — Gestures](https://help.procreate.com/procreate/handbook/interface-gestures/gestures)
- [NN/g — Drag-and-Drop: How to Design for Ease of Use](https://www.nngroup.com/articles/drag-drop/)
- [Konva.js — Multi-touch canvas scale with pinch zoom](https://konvajs.org/docs/sandbox/Multi-touch_Scale_Stage.html)
- [Tiger Abrodi — Handling Trackpad Pinch-to-Zoom vs Two-Finger Scroll in Canvas Apps](https://tigerabrodi.blog/how-to-handle-trackpad-pinch-to-zoom-vs-two-finger-scroll-in-javascript-canvas-apps)
- [Online Ruler — Actual Size on Screen](https://codeshack.io/online-ruler/) and comparable actual-size ruler sites (credit-card / ISO 7810 calibration pattern)
- [Rishabh Engineering — How to Read Engineering Drawings & Symbols](https://www.rishabheng.com/blog/how-to-read-engineering-drawings/)
- Internal: `components/outline/outline-viewer.tsx` (existing pointer-event groundwork, `DRAG_HIT_PX` constant), `.planning/PROJECT.md` (milestone scope and prior decisions)

---
*Feature research for: Shaper v1.2 — Rails screen INSTRUCTIONS tab + app-wide phone support*
*Researched: 2026-09-07*
