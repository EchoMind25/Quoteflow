import type { NextConfig } from "next";
import withSerwist from "@serwist/next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(self)",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // Type-checking is handled by `npm run type-check` (both tsconfigs).
    // Skipping during build avoids duplicate work and OOM in constrained envs.
    ignoreBuildErrors: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // Service worker must not be cached
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    optimizePackageImports: ["lucide-react", "@radix-ui/react-toast"],
  },
};

const isDev = process.env.NODE_ENV === "development";
const analyzeBundle = process.env.ANALYZE === "true";

let config = withSerwist({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: isDev,
  register: true,
  reloadOnOnline: true,
  cacheOnNavigation: true,
})(nextConfig);

if (analyzeBundle) {
  config = withBundleAnalyzer({ enabled: true })(config);
}

export default config;
