import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance optimizations
  reactStrictMode: false, // Disable in dev for faster navigation (enable in prod)

  // Faster dev server
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },

  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
};

export default nextConfig;
