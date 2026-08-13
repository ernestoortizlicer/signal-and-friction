import type { Metadata } from "next";

const description =
  "Scan a public product or funnel URL for observable technical performance signals. This free scan observes; it does not produce a behavioral diagnosis.";

export const metadata: Metadata = {
  title: "Free Technical Signal Scan — Signal & Friction",
  description,
  openGraph: {
    title: "Free Technical Signal Scan — Signal & Friction",
    description,
    url: "https://signal-and-friction.com/scan",
    siteName: "Signal & Friction",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Technical Signal Scan — Signal & Friction",
    description,
  },
  alternates: {
    canonical: "https://signal-and-friction.com/scan",
  },
};

export default function ScanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
