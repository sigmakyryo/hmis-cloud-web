import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const appRoot = path.dirname(fileURLToPath(import.meta.url));

// assetPrefix routes static chunks through the deploy gateway (/__hmis_web_new).
// In local `next dev` on :3000 it breaks chunk loading unless you opt in via
// NEXT_PUBLIC_USE_GATEWAY_ASSET_PREFIX=true (e.g. when using gateway.dev.conf on :8080).
const useGatewayAssetPrefix =
  process.env.NEXT_PUBLIC_USE_GATEWAY_ASSET_PREFIX === "true";
const assetPrefix =
  process.env.NODE_ENV === "development" && !useGatewayAssetPrefix
    ? undefined
    : process.env.NEXT_PUBLIC_ASSET_PREFIX || undefined;

function mediaProxyOrigin() {
  const raw = process.env.HMIS_API_URL?.trim() || "http://127.0.0.1:8000/api/v1";
  return raw.replace(/\/api\/v\d+\/?$/, "").replace(/\/$/, "");
}

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: [
    "app.localhost",
    "*.localhost",
    "192.168.*.*",
    "10.*.*.*",
    ...Array.from({ length: 16 }, (_, index) => `172.${16 + index}.*.*`),
  ],
  experimental: {
    optimizePackageImports: ["@hugeicons/core-free-icons", "@hugeicons/react"],
  },
  assetPrefix,
  images: {
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
    qualities: [75, 90, 92],
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
      { protocol: "http", hostname: "localhost", port: "8000", pathname: "/media/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "8000", pathname: "/media/**" },
    ],
  },
  turbopack: {
    root: appRoot,
  },
  async rewrites() {
    const origin = mediaProxyOrigin();
    return [
      {
        source: "/media/:path*",
        destination: `${origin}/media/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/signup",
        destination: "/auth/register",
        permanent: true,
      },
    ];
  },
  devIndicators: false,
};

export default nextConfig;
