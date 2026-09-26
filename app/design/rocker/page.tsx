import type { Metadata } from "next";
import { RockerEditor } from "@/components/rocker/rocker-editor";
import { loadPickableBlanks } from "@/lib/db/blanks";

export const metadata: Metadata = {
  title: "Rocker & Foil — Shaper Assistant",
  description:
    "Shape a surfboard's side profile by picking a real foam blank — slide the board along it and read the rocker and foil off the foam.",
};

export default function RockerEditorPage() {
  // Deliberately NOT awaited (11-RESEARCH Pattern 8): the promise streams to the sidebar, where only
  // the blank list waits for it inside its own Suspense boundary — the title, the centre control,
  // the placement slider and the drawing paint without it. The loader never rejects: a failed or
  // empty catalogue resolves to `{ status: "unavailable" }` and the list says so (UI-SPEC E4).
  const blanks = loadPickableBlanks();
  return <RockerEditor blanks={blanks} />;
}
