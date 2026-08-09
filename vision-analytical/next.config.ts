import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a minimal .next/standalone server (traced deps only) so the
  // production Docker image doesn't need the full node_modules tree.
  output: "standalone",
  // Without this, Next infers the tracing root as the parent monorepo (this
  // app lives inside n8n/) and nests the standalone output under an extra
  // vision-analytical/ folder, breaking the Dockerfile's COPY paths.
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
