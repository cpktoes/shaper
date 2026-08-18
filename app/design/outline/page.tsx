import type { Metadata } from "next";
import { OutlineEditor } from "@/components/outline/outline-editor";

export const metadata: Metadata = {
  title: "Outline Editor — Shaper",
  description: "Shape a surfboard's outline curve with live, calculated dimensions.",
};

export default function OutlineEditorPage() {
  return <OutlineEditor />;
}
