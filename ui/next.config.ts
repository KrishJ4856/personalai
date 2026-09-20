import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@strands-agents/sdk", "@modelcontextprotocol/sdk"],
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
};

export default nextConfig;
