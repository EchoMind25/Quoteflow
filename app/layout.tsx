import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { StatusProvider } from "@/components/ui/StatusAnnouncer";
import "./globals.css";
import "./print.css";

export const metadata: Metadata = {
  title: "Quotestream",
  description:
    "AI-powered quoting platform for service businesses. Capture photos, record voice notes, and generate professional quotes in seconds.",
  applicationName: "Quotestream",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Quotestream",
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
      <head>
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link
            rel="preconnect"
            href={process.env.NEXT_PUBLIC_SUPABASE_URL}
          />
        )}
        <link rel="dns-prefetch" href="https://api.assemblyai.com" />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <StatusProvider>
          {children}
        </StatusProvider>
        <Analytics />
      </body>
    </html>
  );
}
