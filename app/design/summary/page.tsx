import type { Metadata } from "next";
import { OrderForm } from "@/components/summary/order-form";
import "./order-form.css";

export const metadata: Metadata = {
  title: "Board Order Form — Shaper",
  description: "The whole board design on one printable order form.",
};

export default function BoardSummaryPage() {
  return <OrderForm />;
}
