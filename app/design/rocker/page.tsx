import type { Metadata } from "next";
import { RockerEditor } from "@/components/rocker/rocker-editor";

export const metadata: Metadata = {
  title: "Rocker & Foil — Shaper",
  description: "Shape a surfboard's side profile — the rocker line and the blank datasheet.",
};

export default function RockerEditorPage() {
  return <RockerEditor />;
}
