/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This app sits inside a larger repo that has its own lockfile. Without this,
  // Next traces from the outer root and buries the standalone build one
  // directory deeper than `pnpm start` expects.
  outputFileTracingRoot: __dirname,
  // Standalone output is what `pnpm start` runs on a Node host. The Cloudflare
  // build ignores it and goes through OpenNext instead.
  output: 'standalone',
  // Nothing is marked external on purpose. Prisma has to be bundled so the
  // build resolves its workerd-flavoured entry point instead of the Node one
  // that reaches for a native query engine.
};

module.exports = nextConfig;
