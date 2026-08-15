import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// NOTE: upgrade-insecure-requests is deliberately NOT in this policy.
//
// It tells the browser to re-request every subresource over https. On a page
// actually served over http that is fatal: every CSS/JS/font request is
// upgraded to a port nothing serves, and the page renders completely
// unstyled while curl still reports 200 for those same files.
//
// It used to be added here based on whether NEXT_PUBLIC_SITE_URL started with
// https. That is a build-time guess about a runtime fact, and it is baked into
// the image - so an image built for the public https domain bricks every
// plain-http route to the same server (LAN IP, direct port, health probe) with
// no error anywhere except the browser console.
//
// The scheme is only known per request, so the directive is added per request,
// by nginx, from the forwarded scheme. See deploy/nginx/nginx.conf.

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
  frame-ancestors 'none';
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
  // sharp is a native module. Bundling it produces a standalone build whose
  // `await import('sharp')` fails at runtime with "Failed to load external
  // module sharp-<hash>", so every image upload 500s while the rest of the
  // app looks fine. Listing it here makes Next resolve it with a plain
  // require from node_modules instead.
  serverExternalPackages: ["sharp"],
  // src/lib/upload-image.ts loads sharp through createRequire rather than a
  // static import, so the dependency tracer cannot see it and would leave the
  // binary out of the standalone output. Naming it here copies sharp and its
  // platform binaries in regardless of what the tracer infers.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/sharp/**/*", "./node_modules/@img/**/*"],
  },
  experimental: {
    serverActions: {
      // Server Actions cap request bodies at 1MB by default, and every image
      // upload goes through one. The form offers 8MB (MAX_UPLOAD_BYTES in
      // src/lib/upload-image.ts), so anything between the two was rejected
      // with a 413 before our own size check ever ran - the UI promised a
      // limit the server would not honour. 10mb leaves room for the
      // multipart overhead around an 8MB file, and matches
      // client_max_body_size in deploy/nginx/nginx.conf.
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // geolocation is granted to this origin only (not to embedded
          // frames), because the engineer portal records where a check-in
          // happened. Everything else stays off.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;
