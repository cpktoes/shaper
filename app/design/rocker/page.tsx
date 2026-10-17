import type { Metadata } from "next";
import { listSavedBlanks } from "@/app/actions/user-blanks";
import { RockerEditor } from "@/components/rocker/rocker-editor";
import { loadPickableBlanks } from "@/lib/db/blanks";
import type { SavedBlanksAccount } from "@/lib/saved-blanks-preference";

export const metadata: Metadata = {
  title: "Rocker & Foil — Shaper Assistant",
  description:
    "Shape a surfboard's side profile by picking a real foam blank — slide the board along it and read the rocker and foil off the foam.",
};

/** What a shaper's saved blanks read as when the account list can't be asked at all — signed out,
 * so the browser's own list is used and the page never fails on it. */
const SAVED_BLANKS_FALLBACK: SavedBlanksAccount = { signedIn: false };

export default function RockerEditorPage() {
  // Deliberately NOT awaited (11-RESEARCH Pattern 8): the promise streams to the sidebar, where only
  // the blank list waits for it inside its own Suspense boundary — the title, the centre control,
  // the placement slider and the drawing paint without it. The loader never rejects: a failed or
  // empty catalogue resolves to `{ status: "unavailable" }` and the list says so (UI-SPEC E4).
  const blanks = loadPickableBlanks();
  // The shaper's own saved blanks (quick 261016-mkb, D-09) stream beside the catalogue the same way,
  // resolved inside the same BLANK section's Suspense host. Signed in it is the account's list;
  // signed out the browser keeps its own. It answers an empty list when the database can't be read,
  // and the catch makes sure a session that can't even be asked still never fails the page.
  const savedBlanks = listSavedBlanks().catch(() => SAVED_BLANKS_FALLBACK);
  return <RockerEditor blanks={blanks} savedBlanks={savedBlanks} />;
}
