import type { Metadata } from "next";
import { BoardSummary } from "@/components/summary/board-summary";
import "./summary.css";

export const metadata: Metadata = {
  title: "Board Summary — Shaper",
  description: "The whole board design on one printable sheet.",
};

export default function BoardSummaryPage() {
  return <BoardSummary />;
}
