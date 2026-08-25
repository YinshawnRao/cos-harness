import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["cos-nodejs-sdk-v5", "qcloud-cos-sts"],
};

export default nextConfig;
