import type { Metadata } from "next";
import { FinPlacementEditor } from "@/components/fins/fin-placement-editor";

export const metadata: Metadata = {
  title: "Fin Setup & Placement — Shaper",
  description: "Place a surfboard's fins with live, calculated positions, toe and spread.",
};

export default function FinPlacementPage() {
  return <FinPlacementEditor />;
}
