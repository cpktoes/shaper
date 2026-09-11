# Phase 10: The Whole App on a Phone - Pattern Map

**Mapped:** 2026-09-10
**Files analyzed:** 10 (2 shared ui, 2 auth, 1 tab bar, 2 setup cards, 3+ e2e specs)
**Analogs found:** 10 / 10 (every file has an "already-fixed sibling" or a directly adjacent
pattern to copy — this phase is entirely a retrofit of existing surfaces, not new architecture)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `components/ui/dialog.tsx` (close-X) | component (ui primitive) | request-response (click → close) | `components/ui/button.tsx`'s own `icon`/`default` variants (same file family, sibling sizes) | exact idiom, different variant |
| `components/ui/input.tsx` (height) | component (ui primitive) | request-response (typed field) | `components/design/measure-field.tsx` → `Input` usage; also `components/ui/button.tsx`'s `coarse:h-11` idiom | exact idiom, cross-component |
| `components/auth/nav-auth-control.tsx` | component (auth control) | request-response (click → dialog) | `components/setup/rack-card-menu.tsx`'s `ROW_CLASS` (row-not-glyph growth) | role-match, exact idiom |
| `components/auth/sign-in-banner.tsx` (dismiss X) | component (banner) | event-driven (dismiss) | `components/design/phone-menu.tsx`'s trigger (`size-8 coarse:size-11` fixed-square icon idiom) | exact idiom |
| `components/design/phone-tab-bar.tsx` | component (nav) | request-response (route-based render) | `components/design/phone-top-bar.tsx`'s `onHomeScreen = pathname === "/"` pattern | exact match (same author, same repo) |
| `components/setup/preset-card.tsx` / `components/setup/board-rack-card.tsx` | component (card) | CRUD (read-only display + click-to-select) | each other (near-duplicate `CardThumbnail`/frame JSX) — the fix is de-duplicating them into a shared piece | exact (self-referential) |
| `e2e/phone-home.spec.ts` (edit) | test | event-driven (route/visibility assertions) | itself — the "six-tab bar" test needs inverting; `e2e/phone-fins-landscape.spec.ts`'s device-override style for landscape cases | exact |
| new `e2e/phone-account.spec.ts` or extend `phone-home.spec.ts` | test | request-response (bounding-box assertions) | `e2e/touch-sizing.spec.ts`'s `DEFAULT_OR_ICON_BUTTON` / field-height pattern | exact |
| new landscape setup-grid spec | test | request-response (viewport assertions) | `e2e/phone-fins-landscape.spec.ts` (`devices["iPhone 14 landscape"]`, explicit `test.use`) | exact |
| dialog-touch-sizing spec (setup dialogs) | test | request-response (bounding-box assertions) | `e2e/touch-sizing.spec.ts` lines 92-110 (field height + font-size assertion) | exact |

## Pattern Assignments

### `components/ui/dialog.tsx` (ui primitive, request-response)

**Analog:** `components/ui/button.tsx` (its own `icon`/`default` size variants, which already
carry the `coarse:` fix that `icon-sm` is missing)

**Current state** (`components/ui/dialog.tsx`, `DialogContent`'s built-in close button — per
RESEARCH.md's citation, the render is `className="absolute top-2 right-2"` with `size="icon-sm"`,
which never got a `coarse:` override):
```tsx
<Button
  variant="ghost"
  className="absolute top-2 right-2"
  size="icon-sm"   // 28px (size-7), no coarse: override
/>
```

**Pattern to copy** (`components/ui/button.tsx:31`, the `icon` variant that DOES have the fix):
```ts
icon: "size-8 coarse:size-11",
```

**Fix — one line, same idiom applied to the close button's own className:**
```tsx
<Button
  variant="ghost"
  className="absolute top-2 right-2 coarse:size-11"
  size="icon-sm"
/>
```
This is the exact one-line idiom already proven at `button.tsx:31`/`button.tsx:34` (`icon`/
`default` sizes) — just added to the one call site (`DialogContent`'s close button) that never
picked it up. No new class, no new variant — literally copy `coarse:size-11` onto the existing
`className`.

---

### `components/ui/input.tsx` (ui primitive, request-response)

**Analog:** `components/design/measure-field.tsx` (uses `Input` and needs both rules) +
`components/ui/button.tsx`'s pointer-keyed comment convention.

**Current state** (`components/ui/input.tsx:9-14`, confirmed by direct read):
```tsx
"h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base " +
"transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent " +
"file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground " +
"focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:pointer-events-none " +
"disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive " +
"aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm coarse:text-base dark:bg-input/30 " +
"dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
```

**Fix — add `coarse:h-11` beside the existing `coarse:text-base`** (same idiom
`e2e/touch-sizing.spec.ts:92`'s own standard enforces: "every visible typed measure field is at
least 44px tall with 16px text" — this project's stated rule, already met by
`measure-field.tsx`'s `Input` usage everywhere else):
```tsx
"h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base " +
"transition-colors outline-none ... md:text-sm coarse:text-base coarse:h-11 dark:bg-input/30 ..."
```
Since every one of D-03's five dialogs already builds on this shared `Input`, this single change
lands the fix everywhere (`rename-dialog.tsx`, `board-name-prompt.tsx`) with zero per-dialog edits.

---

### `components/auth/nav-auth-control.tsx` (auth control, request-response)

**Analog:** `components/setup/rack-card-menu.tsx:22-23` — the "enlarge the row, not the glyph"
idiom this app already ships.

**Analog excerpt** (`rack-card-menu.tsx:19-23`):
```tsx
// The minimum-row-height override below is the same idiom volume-controls.tsx, fin-controls.tsx
// and rail-controls.tsx use for a hand-rolled interactive row, so Rename / Duplicate / Delete are
// thumb-sized on a touch pointer without changing their resting appearance to a mouse.
const ROW_CLASS =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm outline-none select-none coarse:min-h-11 data-highlighted:bg-surf-well";
```

**Current state** (`components/auth/nav-auth-control.tsx:21-39`, full file read):
```tsx
if (!isLoaded) {
  return <span aria-hidden className="block size-7" />;
}

if (isSignedIn) {
  return <UserButton />;
}

return (
  <>
    <button
      type="button"
      onClick={() => setDialogOpen(true)}
      className="text-sm text-surf-ink-muted transition-colors outline-none hover:text-surf-ink focus-visible:text-surf-accent-ink"
    >
      Sign in
    </button>
    <SignInDialog open={dialogOpen} onOpenChange={setDialogOpen} />
  </>
);
```

**Fix (D-06), applying the `ROW_CLASS` idiom to the button and matching the placeholder's
footprint so nothing jumps when Clerk resolves — from RESEARCH.md's own worked example:**
```tsx
if (!isLoaded) {
  return <span aria-hidden className="block size-7 coarse:size-11" />;
}
// ...
<button
  type="button"
  onClick={() => setDialogOpen(true)}
  className="coarse:flex coarse:min-h-11 coarse:items-center text-sm text-surf-ink-muted transition-colors outline-none hover:text-surf-ink focus-visible:text-surf-accent-ink"
>
  Sign in
</button>
```

**D-05's Clerk gate (measure first — do not implement speculatively):** if a real-device
measurement shows `<UserButton />`'s trigger under 44px, use Clerk's own theming API, not a
wrapper `<div>` (UI-SPEC's own worked example, `nav-auth-control.tsx`):
```tsx
<UserButton appearance={{ elements: { userButtonTrigger: "coarse:p-2" } }} />
```
Anti-pattern to avoid: `<div className="p-2"><UserButton /></div>` — Clerk renders its own
`<button>` inside; a wrapper only adds inert padding around a still-small tap target.

---

### `components/auth/sign-in-banner.tsx` (banner, event-driven dismiss)

**Analog:** `components/design/phone-menu.tsx:23-31` — the fixed-square icon-trigger idiom.

**Analog excerpt** (`phone-menu.tsx:23-31`):
```tsx
<Menu.Trigger
  aria-label="Menu"
  className="flex size-8 coarse:size-11 cursor-pointer items-center justify-center rounded-md text-surf-ink-muted transition-colors outline-none hover:text-surf-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink data-popup-open:text-surf-ink"
>
  <MenuIcon aria-hidden className="size-5" />
</Menu.Trigger>
```

**Current state:** the dismiss button carries only `shrink-0` and the bare `XIcon` — no
`coarse:` class at all (confirmed by CONTEXT.md's own flag and the file's imports:
`useState, useSyncExternalStore`, `XIcon` from `lucide-react`).

**Fix — same fixed-square idiom, sized to the icon rather than a menu trigger:**
```tsx
<button
  type="button"
  onClick={dismiss}
  aria-label="Dismiss"
  className="flex size-8 coarse:size-11 shrink-0 items-center justify-center rounded-md text-surf-ink-muted transition-colors outline-none hover:text-surf-ink"
>
  <XIcon aria-hidden className="size-4" />
</button>
```
(Match the banner's existing icon size — UI-SPEC says the icon stays put; only the tappable
square grows under `coarse:`.)

---

### `components/design/phone-tab-bar.tsx` (D-07, route-based render)

**Analog:** `components/design/phone-top-bar.tsx:38-40` — the exact `onHomeScreen` pattern,
same author, same repo, same phase-9 origin.

**Analog excerpt** (`phone-top-bar.tsx:1-20,38-40`):
```tsx
import { usePathname } from "next/navigation";
// ...
export function PhoneTopBar() {
  const pathname = usePathname();
  const onHomeScreen = pathname === "/";
  return (
    <header ...>
      {onHomeScreen ? (
        <span className={WORDMARK_CLASS}>SHAPER ASSISTANT</span>
      ) : (
        <Link href="/" ...>SHAPER ASSISTANT</Link>
      )}
      ...
```

**Current state** (`phone-tab-bar.tsx:1-25`, full header read):
```tsx
"use client";
/**
 * ... Mounted once in `app/design/layout.tsx` as the last child, so it appears on every design
 * screen and nowhere else (the setup screen and the rack are Phase 10's).   <-- STALE, per RESEARCH
 * ...
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "@/components/site-nav";

export function PhoneTabBar() {
  const pathname = usePathname();
  return (
    <nav ...>
      {NAV_LINKS.map((link) => { ... })}
```

**Fix — add the same `pathname === "/"` guard, return `null`, and update the stale doc comment**
(the component already imports `usePathname`, so this is a pure addition, no new import):
```tsx
export function PhoneTabBar() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return (
    <nav ...>
```
Also strike/update the doc comment's "Mounted once in `app/design/layout.tsx` ... and nowhere
else" line — it's already false today (`app/page.tsx:6,53` mounts it), and the plan should not
leave a doc comment claiming behaviour that both predates and contradicts this fix.

**Do not touch `app/page.tsx`'s mount point** — its single-fragment mount is deliberate (per
CONTEXT.md D-07) and must stay byte-identical; the fix lives entirely inside the component.

---

### `components/setup/preset-card.tsx` / `components/setup/board-rack-card.tsx` (card, CRUD display)

**Analog:** each other — near-duplicated thumbnail JSX, confirmed by direct reads.

**`preset-card.tsx:79-88`** (full thumbnail block):
```tsx
<div className="rounded-lg border border-surf-line bg-surf-tab-active p-3">
  <div className="relative aspect-[340/620] w-full overflow-hidden rounded-lg border border-surf-line-faint bg-surf-panel">
    <OutlineViewer
      geometry={geometry}
      outline={preset.outline}
      showConstruction={false}
      hideCallouts
    />
  </div>
</div>
```

**`board-rack-card.tsx:89-95`** (`CardThumbnail`, the already-shared piece for the two rack-card
variants — but not yet shared with `preset-card.tsx`):
```tsx
function CardThumbnail({ geometry, outline }: { geometry: OutlineGeometry; outline: OutlineSpec }) {
  return (
    <div className="rounded-lg border border-surf-line bg-surf-tab-active p-3">
      <div className="relative aspect-[340/620] w-full overflow-hidden rounded-lg border border-surf-line-faint bg-surf-panel">
        <OutlineViewer geometry={geometry} outline={outline} showConstruction={false} hideCallouts />
      </div>
    </div>
  );
}
```

**Fix per D-08 / the Orchestrator addendum — CSS-only, no geometry change:** cap the thumbnail
box's height at `max-shell:` 387px, leaving the `340×620` viewBox and `hideCallouts` untouched
(`meet`-fit by height does the rest):
```tsx
<div className="relative aspect-[340/620] w-full max-shell:h-[387px] max-shell:aspect-auto overflow-hidden rounded-lg border border-surf-line-faint bg-surf-panel">
```
(Exact class name is the planner's call — the constraint is: `max-shell:`-gated, height fixed at
387px, `aspect-[340/620]` neutralized under that variant so the fixed height wins, `340×620`
viewBox and `hideCallouts` untouched, no new `OutlineViewer` prop and no `lib/geometry` change —
per UI-SPEC's "What has to change" section and the Orchestrator addendum withdrawing the
`outline-viewer.tsx`/`lib/geometry` entries.)

**D-02's mandate — factor this into ONE shared piece:** export `board-rack-card.tsx`'s
`CardThumbnail` (or a new shared file, planner's call) and have `preset-card.tsx` import and use
it instead of its own duplicated block, so the phone height cap is written once, not twice. This
is exactly the drift risk D-02 exists to close (the two files already duplicate
`CARD_SHELL_CLASS`-equivalent styling byte-for-byte, per UI-SPEC).

**Do not touch:** `CardMetadataLine`, the text stack sizes (Typography table), or the five-layer
color stack (`--surf-canvas`/`--surf-line`/`--surf-tab-active`/`--surf-line-faint`/`--surf-panel`)
— per Rule 2 and UI-SPEC's "Kept unchanged" sections.

---

### E2E specs

**Analog for bounding-box/size assertions:** `e2e/touch-sizing.spec.ts:92-110` (field height +
exact `"16px"` font-size string check) — copy this pattern for the setup-screen dialogs and the
nav "Sign in" row / Clerk avatar:
```ts
const box = await field.boundingBox();
expect(box.height).toBeGreaterThanOrEqual(44);
const fontSize = await field.evaluate((el) => getComputedStyle(el).fontSize);
expect(fontSize).toBe("16px");
```

**Analog for a device-scoped landscape spec:** `e2e/phone-fins-landscape.spec.ts:1-46` — the
exact `test.use({ ...devices["Pixel 7 landscape"], ...})` pattern, with the
`defaultBrowserType` deletion workaround, and the `test.skip` guard scoping the case to one
project:
```ts
const pixel7Landscape = { ...devices["Pixel 7 landscape"] };
delete (pixel7Landscape as { defaultBrowserType?: unknown }).defaultBrowserType;
test.use({ ...pixel7Landscape });

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "android", "sideways-phone assertion runs on the chromium project only");
  ...
});
```
Use this exact shape for the new "setup screen stays one column at 750px landscape" spec
(RESEARCH.md's landscape grid finding) — but per the Orchestrator addendum, this spec should now
assert the grid STAYS two-up at 640-819px (since a fixed-height thumbnail makes that correct, not
a regression) — do not "fix" `sm:grid-cols-2` to `shell:grid-cols-2`; that recommendation was
withdrawn.

**Analog/target for the D-07 fix:** `e2e/phone-home.spec.ts:52-73` — the existing "the tab bar
shows all six screens... on the home screen" test currently pins the pre-fix (buggy) behavior and
must be **edited, not extended**, to assert absence on `/`:
```ts
// current (wrong, pre-fix) — must be inverted:
const tabBar = page.getByRole("navigation", { name: "Screens" });
await expect(tabBar).toBeVisible();
// ... asserts 6 tabs, none marked, each >=44px

// fix: assert absence on "/", keep an equivalent assertion (6 tabs, each >=44px) on a
// /design/* route instead, e.g. by adding a sibling case that navigates there first.
```
`e2e/phone-home.spec.ts:96-107` ("preset tap opens TEMPLATE...") already navigates through both
routes and is a good template for where to add the "/design/*"-scoped tab-bar assertion moved out
of the home-route test.

## Shared Patterns

### The "enlarge the row/box, not the glyph" idiom (`coarse:` sizing)
**Source:** `components/setup/rack-card-menu.tsx:19-23`, `components/design/phone-menu.tsx:23-31`,
`components/ui/button.tsx:29-34`
**Apply to:** `nav-auth-control.tsx` (D-06), `sign-in-banner.tsx` (dismiss X), `dialog.tsx`
(close-X), `input.tsx` (height) — every touch-sizing fix in this phase is one more application of
this single already-shipped idiom, gated on `coarse:`, never on width.
```tsx
"... coarse:min-h-11 ..."   // row grows, glyph/text stays its own size
"... coarse:size-11 ..."    // icon-only square grows, icon stays its own size
```

### Route-based conditional render (D-07's sanctioned third axis)
**Source:** `components/design/phone-top-bar.tsx:38-40` (`onHomeScreen`)
**Apply to:** `components/design/phone-tab-bar.tsx`
```tsx
const pathname = usePathname();
const onHomeScreen = pathname === "/"; // or: if (pathname === "/") return null;
```
This is explicitly the one place `width picks layout / pointer picks sizing` does not apply
(CLAUDE.md's own carve-out, confirmed by UI-SPEC) — a plain route check, matching this exact
existing convention, not a new CSS variant.

### Shared thumbnail box (`CardThumbnail`)
**Source:** `components/setup/board-rack-card.tsx:89-95` (already extracted for its own two
variants)
**Apply to:** `components/setup/preset-card.tsx` (should import/use the same function instead of
duplicating the JSX) — this is D-02's explicit mandate: "one card system, not two stacked."

### Playwright device-scoped spec pattern
**Source:** `e2e/phone-fins-landscape.spec.ts:38-46`
**Apply to:** any new landscape-specific setup-grid spec.

## No Analog Found

None. Every file in scope either has a direct sibling doing the identical thing already
(`phone-top-bar.tsx` for `phone-tab-bar.tsx`; `button.tsx`'s `icon` variant for `dialog.tsx`'s
`icon-sm`; `rack-card-menu.tsx`'s row idiom for `nav-auth-control.tsx`; `phone-menu.tsx`'s square
idiom for `sign-in-banner.tsx`; `board-rack-card.tsx`'s `CardThumbnail` for `preset-card.tsx`; and
three existing e2e specs (`touch-sizing.spec.ts`, `phone-fins-landscape.spec.ts`,
`phone-home.spec.ts`) as direct templates/targets for every required test change) — consistent
with RESEARCH.md's own framing: "most of this phase's surface area is already built."

## Metadata

**Analog search scope:** `components/setup/`, `components/design/`, `components/auth/`,
`components/ui/`, `e2e/`
**Files read this session:** `rack-card-menu.tsx`, `phone-menu.tsx`, `measure-field.tsx`,
`button.tsx`, `phone-top-bar.tsx`, `phone-tab-bar.tsx`, `preset-card.tsx`, `board-rack-card.tsx`,
`dialog.tsx`, `input.tsx`, `nav-auth-control.tsx`, `sign-in-banner.tsx`, `touch-sizing.spec.ts`,
`phone-fins-landscape.spec.ts`, `phone-home.spec.ts`, `playwright.config.ts`
**Pattern extraction date:** 2026-09-10
