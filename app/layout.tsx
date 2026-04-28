import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Crypto Presale Analyzer",
    template: "%s | Crypto Presale Analyzer",
  },
  description:
    "Research tool to track crypto presale projects with score breakdowns, risk flags, and summary insights.",
  applicationName: "Crypto Presale Analyzer",
  keywords: [
    "crypto presale",
    "token research",
    "presale scoring",
    "risk analysis",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Crypto Presale Analyzer",
    title: "Crypto Presale Analyzer",
    description:
      "Evaluate presale projects with transparent scores, red flags, and structured summaries.",
  },
  twitter: {
    card: "summary",
    title: "Crypto Presale Analyzer",
    description:
      "Evaluate presale projects with transparent scores, red flags, and structured summaries.",
  },
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-md focus:bg-[#122343] focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-blue-100"
        >
          Skip to content
        </a>

        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 sm:px-6">
          <header className="sticky top-0 z-30 py-3 backdrop-blur">
            <div className="surface-card-soft flex items-center justify-between rounded-2xl px-4 py-3">
              <Link href="/" className="flex items-center gap-3">
                <Image
                  src="/presale-llama-mark.svg"
                  alt="Crypto Presale Analyzer logo"
                  width={34}
                  height={34}
                  priority
                />
                <span className="text-sm font-semibold tracking-tight text-blue-50 sm:text-base">
                  Crypto Presale Analyzer
                </span>
              </Link>
              <nav className="flex items-center gap-2 text-sm">
                <Link href="/projects" className="rounded-md px-3 py-1.5 font-medium text-blue-200 hover:bg-slate-700/40 hover:text-blue-50">
                  Projects
                </Link>
                <Link href="/compare" className="rounded-md px-3 py-1.5 font-medium text-blue-200 hover:bg-slate-700/40 hover:text-blue-50">
                  Compare
                </Link>
                <Link href="/admin" className="rounded-md px-3 py-1.5 font-medium text-blue-200 hover:bg-slate-700/40 hover:text-blue-50">
                  Admin
                </Link>
              </nav>
            </div>
          </header>

          <div id="content" className="flex flex-1 flex-col">
            {children}
          </div>

          <footer className="py-4">
            <p className="text-xs font-medium text-faint">
              Research tool only. Not financial advice.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
