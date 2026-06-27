import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // api/ is a separate Express service deployed to Render, not part of Next.js.
    // We run `tsc --noEmit` locally to catch frontend type errors.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
