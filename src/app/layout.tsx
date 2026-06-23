import type { Metadata } from "next";
import { Inter, Newsreader, JetBrains_Mono } from "next/font/google";
import { PHProvider } from "@/components/PostHogProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Signal & Friction — Revenue Friction Diagnostic for B2B SaaS",
  description:
    "I find where revenue breaks in your B2B SaaS product and give you exactly one defensible action to fix it. Clinical diagnostic delivered in 72 hours. 100% async. No calls.",
  keywords: [
    "B2B SaaS",
    "revenue friction",
    "conversion optimization",
    "SaaS diagnostic",
    "cognitive friction",
    "revenue audit",
    "pricing page optimization",
  ],
  openGraph: {
    title: "Signal & Friction — Revenue Friction Diagnostic",
    description:
      "One Signal. One Friction. One Decision. Clinical B2B SaaS revenue diagnostic delivered in 72 hours.",
    url: "https://signal-and-friction.com",
    siteName: "Signal & Friction",
    images: [
      {
        url: "https://signal-and-friction.com/sf_og_image.png",
        width: 1200,
        height: 630,
        alt: "Signal & Friction — Revenue Friction Diagnostic for B2B SaaS",
      },
    ],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Signal & Friction — Revenue Friction Diagnostic",
    description:
      "I find where revenue breaks in your B2B SaaS product. Clinical diagnostic in 72 hours. 100% async.",
    images: ["https://signal-and-friction.com/sf_og_image.png"],
  },
  metadataBase: new URL("https://signal-and-friction.com"),
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${newsreader.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans text-text-body bg-bg">
        <PHProvider>{children}</PHProvider>
      </body>
    </html>
  );
}
