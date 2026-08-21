---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 0
total_count: 1
last_updated: 2026-08-21T16:08:14.451Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | unmet-truth | .planning/phases/01-foundation-port-deploy-the-design-tool/01-04-PLAN.md |  | Task 2 Part B walkthrough narrowed to numbers/units dimension only per user instruction; fin-config-switching, rail-band-recalculation, and per-screen units (steps 5-8) not re-confirmed step-by-step against production this session | open |  | 2026-08-21T16:08:14.451Z |  |

````json
[
  {
    "id": 1,
    "kind": "unmet-truth",
    "phase": "01",
    "file": ".planning/phases/01-foundation-port-deploy-the-design-tool/01-04-PLAN.md",
    "line": null,
    "description": "Task 2 Part B walkthrough narrowed to numbers/units dimension only per user instruction; fin-config-switching, rail-band-recalculation, and per-screen units (steps 5-8) not re-confirmed step-by-step against production this session",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-21T16:08:14.451Z",
    "resolved_at": null
  }
]
````
