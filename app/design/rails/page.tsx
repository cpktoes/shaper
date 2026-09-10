import type { Metadata } from "next";
import { RailBandEditor } from "@/components/rails/rail-band-editor";
import "./actual-size.css";

export const metadata: Metadata = {
  title: "Rail Band Calculator — Shaper Assistant",
  description: "Shape a surfboard's rail bands with live, calculated dimensions.",
};

export default function RailBandCalculatorPage() {
  return <RailBandEditor />;
}
