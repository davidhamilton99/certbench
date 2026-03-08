import type { Metadata } from "next";
import { Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CertBench — Know exactly what to study",
    template: "%s — CertBench",
  },
  description:
    "CertBench builds a personalised study plan from your actual performance data. Adaptive practice exams, spaced repetition, and a readiness score for CompTIA Security+, Network+, and A+ certifications.",
  keywords: [
    "CompTIA Security+",
    "CompTIA Network+",
    "CompTIA A+",
    "certification prep",
    "practice exams",
    "spaced repetition",
    "study plan",
    "IT certification",
  ],
  openGraph: {
    title: "CertBench — Know exactly what to study",
    description:
      "Personalised study plans, adaptive practice exams, and spaced repetition for CompTIA certifications.",
    url: "https://certbench.vercel.app",
    siteName: "CertBench",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "CertBench — Know exactly what to study",
    description:
      "Personalised study plans, adaptive practice exams, and spaced repetition for CompTIA certifications.",
  },
  robots: {
    index: true,
    follow: true,
  },
  metadataBase: new URL("https://certbench.vercel.app"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${instrumentSans.variable} ${ibmPlexMono.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
