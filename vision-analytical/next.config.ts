import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Not nonce-based: that requires forcing every route to render dynamically
// (no static/ISR pages), which is a bigger tradeoff than this pass takes on.
// 'unsafe-inline' for scripts/styles is the documented fallback for apps
// that don't want that constraint - still blocks arbitrary external/object/
// frame sources, which is the bulk of the value.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  connect-src 'self';
  frame-src https://maps.google.com https://www.google.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  // Emits a minimal .next/standalone server (traced deps only) so the
  // production Docker image doesn't need the full node_modules tree.
  output: "standalone",
  // Without this, Next infers the tracing root as the parent monorepo (this
  // app lives inside n8n/) and nests the standalone output under an extra
  // vision-analytical/ folder, breaking the Dockerfile's COPY paths.
  outputFileTracingRoot: process.cwd(),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
