import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // Optional tweaks for static export projects:
  // images: { unoptimized: true },
  // trailingSlash: true,
  // distDir: 'dist',
};

export default nextConfig;
