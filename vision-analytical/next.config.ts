import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// upgrade-insecure-requests tells the browser to re-request every subresource
// over https. That's right behind TLS, but fatal on a plain-http deployment
// (LAN host, no certificate): every CSS/JS/font request is upgraded to a port
// nothing serves, so the page loads and renders completely unstyled. Browsers
// exempt localhost as a trustworthy origin, so the breakage only shows up when
// the site is reached by IP or hostname - which makes it easy to miss locally.
// Keyed off the configured site URL so it turns itself on for an https deploy
// and off for http, with no separate flag to remember.
const servedOverPlainHttp = (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("http://");

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
  frame-src https://maps.google.com https://www.google.com https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';${!servedOverPlainHttp ? "\n  upgrade-insecure-requests;" : ""}
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
