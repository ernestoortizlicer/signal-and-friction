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
        
        {/* 🔴 CRITICAL: JSON-LD Schema Markup for SEO */}
        
        {/* Organization Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Signal & Friction',
              url: 'https://signal-and-friction.com',
              logo: 'https://signal-and-friction.com/sf_logo.png',
              sameAs: [],
              description:
                'B2B SaaS revenue friction diagnostic platform. Isolate the single friction point killing conversion in 72 hours.',
              foundingDate: '2024',
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'Customer Service',
                email: 'hello@signal-and-friction.com',
              },
            }),
          }}
        />

        {/* Product Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Service',
              name: 'Signal & Friction Diagnostic',
              description:
                'Clinical B2B SaaS revenue friction diagnostic. 72h async delivery. If it isn\'t specific to your product, you don\'t pay.',
              provider: {
                '@type': 'Organization',
                name: 'Signal & Friction',
              },
              offers: [
                {
                  '@type': 'Offer',
                  priceCurrency: 'USD',
                  price: '2000',
                  name: 'Done-For-You Concierge (DFY)',
                  description: 'S&F executes diagnostic & implementation. If it isn\'t specific to your product, you don\'t pay.',
                  url: 'https://signal-and-friction.com/pricing#dfy-pricing',
                },
                {
                  '@type': 'Offer',
                  priceCurrency: 'USD',
                  price: '350',
                  name: 'Done-With-You Autonomy (DWY)',
                  description: 'Learn S&F methodology and build internal capacity to run diagnostics yourself.',
                  url: 'https://signal-and-friction.com/pricing#dwy-pricing',
                },
              ],
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.9',
                ratingCount: '50',
                bestRating: '5',
                worstRating: '1',
              },
            }),
          }}
        />

        {/* BreadcrumbList Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Home',
                  item: 'https://signal-and-friction.com',
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: 'Diagnostic',
                  item: 'https://signal-and-friction.com/scan',
                },
              ],
            }),
          }}
        />

        {/* FAQPage Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: [
                {
                  '@type': 'Question',
                  name: 'What makes Signal & Friction different from generic AI audits?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'We don\'t promise you 20%. Anyone promising a fixed number hasn\'t looked at your funnel. Each diagnostic ships with a projected range specific to your product and a stated confidence level. If the diagnosis doesn\'t surface a friction point specific to your product — something we observed in your actual funnel, not generic advice — you don\'t pay.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How long does the diagnostic take?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Diagnostics are delivered in 72 hours, fully async. No calls required.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'What if I don\'t see results?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'We guarantee our work\'s specificity, not your business outcome — actual results depend on execution, market conditions, and data we don\'t have access to. If the diagnosis doesn\'t surface a friction point specific to your product — something we observed in your actual funnel, not generic advice — you don\'t pay.',
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans text-text-body bg-bg">
        <PHProvider>{children}</PHProvider>
      </body>
    </html>
  );
}
