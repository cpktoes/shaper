import type { Metadata } from "next";
import { BottomEditor } from "@/components/bottom/bottom-editor";
import { BOTTOM_COPY } from "@/components/bottom/bottom-copy";

// "Bottom Contours — Shaper Assistant": the page names itself after its panel, as RAILS' does (UI-SPEC § Where the
// screen is named); the words live in BOTTOM_COPY.
export const metadata: Metadata = {
  title: BOTTOM_COPY.pageTitle,
  description: BOTTOM_COPY.pageDescription,
};

export default function BottomContoursPage() {
  return <BottomEditor />;
}
