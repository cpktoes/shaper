import type { Metadata } from "next";
import { ThreeDScreen } from "@/components/3d/three-d-screen";
import { THREE_D_COPY } from "@/components/3d/three-d-copy";

export const metadata: Metadata = {
  title: THREE_D_COPY.pageTitle,
  description: THREE_D_COPY.pageDescription,
};

export default function ThreeDBoardPage() {
  return <ThreeDScreen />;
}
