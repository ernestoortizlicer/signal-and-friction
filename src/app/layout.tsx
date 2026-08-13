import type { Metadata } from "next";
import { Inter, Newsreader, JetBrains_Mono } from "next/font/google";
import { PHProvider } from "@/components/PostHogProvider";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import { PUBLIC_SITE_COPY } from "@/lib/public-metadata";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const interHero = Inter({
  variable: "--font-inter-hero",
  subsets: ["latin"],
  display: "optional",
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
  title: PUBLIC_SITE_COPY.title,
  description: PUBLIC_SITE_COPY.description,
  keywords: [
    "B2B SaaS",
    "behavioral diagnosis",
    "conversion friction",
    "evidence-ranked diagnosis",
    "SaaS diagnostic",
  ],
  openGraph: {
    title: PUBLIC_SITE_COPY.openGraphTitle,
    description: PUBLIC_SITE_COPY.openGraphDescription,
    url: "https://signal-and-friction.com",
    siteName: "Signal & Friction",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: PUBLIC_SITE_COPY.openGraphTitle,
    description: PUBLIC_SITE_COPY.openGraphDescription,
  },
  metadataBase: new URL("https://signal-and-friction.com"),
  robots: {
    index: true,
    follow: true,
  },
};

/**
 * Frontend OS v2.1 integrity rule:
 *
 * Root structured data was removed rather than preserving a second copy of
 * public claims and hard-coded prices. Reintroduce JSON-LD only from a derived
 * canonical builder after offer/claim semantics have passed the same product
 * truth gate as the visible UI.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${interHero.variable} ${newsreader.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans text-text-body bg-bg">
        <PHProvider>{children}</PHProvider>
        <CookieConsentBanner />
      </body>
    </html>
  );
}
