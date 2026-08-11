import type { Metadata } from "next";
import PortfolioClient from "./PortfolioClient";

export const metadata: Metadata = {
  title: "Clinical Portfolio — Signal & Friction",
  description:
    "Illustrative sample diagnostics showing the Signal & Friction method: one dominant friction, evidence-graded, per sample. Fictional companies, not real client results.",
  alternates: {
    canonical: "https://signal-and-friction.com/portfolio",
  },
};

export default function PortfolioPage() {
  return <PortfolioClient />;
}
