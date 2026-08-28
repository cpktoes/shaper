# Phase 3 — API Coverage Declaration

**Detector:** fired (`detected: true`), on a single signal — the phrase "read by the Clerk SDK" in
RESEARCH.md's Pitfall 3, which discusses CI environment variables.

**Determination after re-reading the phase scope:** No external API integration.

Phase 3 integrates no external API, SDK or service. The three things the detector could have been
pointing at are each something else:

| Candidate | Why it is not an external API integration |
|-----------|-------------------------------------------|
| `jspdf` | A bundled client-side npm library. It generates bytes in the browser with no network call and no service account — a dependency, not an API or a service. |
| Clerk | Pre-existing from Phase 2 and untouched here. It appears in this phase's research only as a placeholder environment value in the CI workflow, so `next build` does not fail on a missing key. No Clerk capability is added, removed or wired. |
| GitHub Actions | Build infrastructure, not an application tier. The app never calls it and it never calls the app. |

The phase's two requirements are a layout problem (TMPL-01, tiling existing geometry onto paper) and
a verification problem (VOL-01, testing a calculator that already runs client-side). Neither reaches
a network boundary. No coverage matrix is warranted.
