import type { NextConfig } from "next";
import withSerwist from "@serwist/next";
import withBundleAnalyzer from "@next/bundle-analyzer";

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
