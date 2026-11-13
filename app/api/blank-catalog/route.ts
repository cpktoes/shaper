import { loadPickableBlanks } from "@/lib/db/blanks";

/**
 * https://www.shaperassistant.com/api/blank-catalog — the pickable blank catalogue as JSON, for the one place that needs it
 * on the home page (quick 261113-gwo, the founder, 2026-11-13): the suggested blanks in a board file's closest-fit preview.
 * ROCKER already streams this same list to every visitor from its page; the home page can't, because it must not get
 * heavier for everybody, and the preview opens long after the page does, so the preview asks for it here, once per visit,
 * only when a board file is being looked at.
 *
 * Public and read-only by design (D-01: no route is closed to a signed-out shaper): GET only, no request read, no shaper's
 * identity, nothing but the owner-less catalogue ROCKER already shows. `loadPickableBlanks` never rejects, so a failure is
 * the body `{ "status": "unavailable" }` and the preview says so quietly. Route Handlers are not cached by default.
 */
export async function GET(): Promise<Response> {
  return Response.json(await loadPickableBlanks());
}
