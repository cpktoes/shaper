import type { Metadata } from "next";
import { RailBandEditor } from "@/components/rails/rail-band-editor";

export const metadata: Metadata = {
  title: "Rail Band Calculator — Shaper",
  description: "Shape a surfboard's rail bands with live, calculated dimensions.",
};

export default function RailBandCalculatorPage() {
  return <RailBandEditor />;
}
