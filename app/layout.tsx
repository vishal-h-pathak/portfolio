import type { Metadata, Viewport } from "next";
import { Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vishal Pathak — Notebook & Bench",
  description:
    "Electrical engineer in Atlanta. Ten years on neuromorphic hardware. Currently embedded ML / CV at GTRI, with off-hours bench builds in agentic AI.",
  metadataBase: new URL("https://vishal.pa.thak.io"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Vishal Pathak — Notebook & Bench",
    description:
      "Electrical engineer in Atlanta. Ten years on neuromorphic hardware. Currently embedded ML / CV at GTRI, with off-hours bench builds in agentic AI.",
    url: "https://vishal.pa.thak.io",
    siteName: "Vishal Pathak",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0B0B0C",
  colorScheme: "dark",
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Vishal Pathak",
  url: "https://vishal.pa.thak.io",
  email: "mailto:vishalp@thak.io",
  jobTitle: "Research Engineer",
  worksFor: {
    "@type": "Organization",
    name: "Georgia Tech Research Institute",
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Atlanta",
    addressRegion: "GA",
    addressCountry: "US",
  },
  sameAs: [
    "https://github.com/vishal-h-pathak",
    "https://www.linkedin.com/in/vishalhpathak/",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sourceSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        {/* Scroll-reveal (globals.css) hides section content until an
            IntersectionObserver in components/Section.tsx reveals it —
            that never runs without JS, so reset it here. */}
        <noscript>
          <style>{`
            section.nb .margin,
            section.nb .row > div > * {
              opacity: 1 !important;
              transform: none !important;
            }
          `}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
