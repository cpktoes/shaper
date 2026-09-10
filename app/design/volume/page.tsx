import type { Metadata } from "next";
import { VolumeEstimator } from "@/components/volume/volume-estimator";

export const metadata: Metadata = {
  title: "Volume Estimator — Shaper Assistant",
  description: "Estimate a designed board's volume from its template area and rail-band cross-sections.",
};

export default function VolumeEstimatorPage() {
  return <VolumeEstimator />;
}
