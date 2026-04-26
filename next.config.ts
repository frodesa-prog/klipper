import type { NextConfig } from "next";
import "./env"; // Validate env vars at build time

const nextConfig: NextConfig = {
  basePath: "/klipper",
};

export default nextConfig;
