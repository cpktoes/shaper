import type { Metadata } from "next";
import { SetupScreen } from "@/components/setup/setup-screen";

export const metadata: Metadata = {
  title: "Shaper — Start a New Board",
  description: "Pick a board type and start shaping.",
};

export default function Home() {
  return <SetupScreen />;
}
