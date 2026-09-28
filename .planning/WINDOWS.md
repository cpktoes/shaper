---
schema_version: 1
open_count: 0
waived_count: 1
fixed_count: 2
total_count: 3
last_updated: 2026-09-28T01:50:13.020Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | unmet-truth | .planning/phases/01-foundation-port-deploy-the-design-tool/01-04-PLAN.md |  | Task 2 Part B walkthrough narrowed to numbers/units dimension only per user instruction; fin-config-switching, rail-band-recalculation, and per-screen units (steps 5-8) not re-confirmed step-by-step against production this session | fixed |  | 2026-08-21T16:08:14.451Z | 2026-09-28T01:50:04.759Z |
| 2 | 260830-2dy | unrun-verify | components/rocker/rocker-viewer.tsx |  | Task 3 browser pass (both orientations, Summary sheet check) deferred — executor cannot run npm run dev / a browser inside a worktree; requires human verification | waived | superseded: the founder looked at this change nose-up in the browser and caught the title overlap that 260830-31h fixed; the ROCKER drawing and the Summary's on-screen order form were then walked upright and sideways on a real iPhone in the phone sweep (10-SWEEP-2 rows 6 and 9), and ROCKER on a real iPhone and Android phone in Phase 11 (11-UAT test 4). | 2026-08-30T09:04:59.766Z | 2026-09-28T01:50:13.020Z |
| 3 | 05 | unrun-verify | .planning/phases/05-the-units-chooser/05-02-PLAN.md |  | Manual signed-in verification (pick Metric, reload, sign out, sign in on a second browser profile against the Neon development branch) was not performed in this automated worktree run — no live browser/Clerk session available; all automated verification (unit tests, tsc, lint, double db:migrate) passed. | fixed |  | 2026-09-05T01:26:44.720Z | 2026-09-05T01:31:45.663Z |

````json
[
  {
    "id": 1,
    "kind": "unmet-truth",
    "phase": "01",
    "file": ".planning/phases/01-foundation-port-deploy-the-design-tool/01-04-PLAN.md",
    "line": null,
    "description": "Task 2 Part B walkthrough narrowed to numbers/units dimension only per user instruction; fin-config-switching, rail-band-recalculation, and per-screen units (steps 5-8) not re-confirmed step-by-step against production this session",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-21T16:08:14.451Z",
    "resolved_at": "2026-09-28T01:50:04.759Z"
  },
  {
    "id": 2,
    "kind": "unrun-verify",
    "phase": "260830-2dy",
    "file": "components/rocker/rocker-viewer.tsx",
    "line": null,
    "description": "Task 3 browser pass (both orientations, Summary sheet check) deferred — executor cannot run npm run dev / a browser inside a worktree; requires human verification",
    "status": "waived",
    "reason": "superseded: the founder looked at this change nose-up in the browser and caught the title overlap that 260830-31h fixed; the ROCKER drawing and the Summary's on-screen order form were then walked upright and sideways on a real iPhone in the phone sweep (10-SWEEP-2 rows 6 and 9), and ROCKER on a real iPhone and Android phone in Phase 11 (11-UAT test 4).",
    "recorded_at": "2026-08-30T09:04:59.766Z",
    "resolved_at": "2026-09-28T01:50:13.020Z"
  },
  {
    "id": 3,
    "kind": "unrun-verify",
    "phase": "05",
    "file": ".planning/phases/05-the-units-chooser/05-02-PLAN.md",
    "line": null,
    "description": "Manual signed-in verification (pick Metric, reload, sign out, sign in on a second browser profile against the Neon development branch) was not performed in this automated worktree run — no live browser/Clerk session available; all automated verification (unit tests, tsc, lint, double db:migrate) passed.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-09-05T01:26:44.720Z",
    "resolved_at": "2026-09-05T01:31:45.663Z"
  }
]
````
