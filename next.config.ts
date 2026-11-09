import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // Photos are resized in the browser before upload, so 4 MB is plenty.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};
export default nextConfig;
