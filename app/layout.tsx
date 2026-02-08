import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuoteFlow",
  description:
    "AI-powered quoting platform for service businesses. Capture photos, record voice notes, and generate professional quotes in seconds.",
  applicationName: "QuoteFlow",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "QuoteFlow",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
