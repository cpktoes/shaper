# Deferred items — 260913-k5k

Out-of-scope findings noted during execution, not fixed (scope boundary rule: only auto-fix
issues directly caused by this task's own changes).

## `npx tsc --noEmit` reports two pre-existing errors unrelated to this task

```
app/design/layout.tsx(30,45): error TS2304: Cannot find name 'LayoutProps'.
app/layout.tsx(75,56): error TS2304: Cannot find name 'LayoutProps'.
```

`LayoutProps<...>` is a type Next.js 16 generates into `.next/types` the first time `next dev`
or `next build` runs. This worktree has no `.next` directory at all (a worktree can't run
Turbopack — see `CLAUDE.md`'s "run from the main checkout" note on `npm run build`), so the
generated type does not exist here and `tsc` cannot resolve it. Neither file is touched by this
task. `npx tsc --noEmit` on `lib/design-history.ts` and `components/design/design-store.tsx`
themselves reports zero errors — this is a worktree-environment artifact, not a regression.
Expect it to disappear once `tsc` runs on the main checkout (or after any `next dev`/`next build`
has populated `.next/types` locally).
