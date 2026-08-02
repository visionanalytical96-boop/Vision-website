/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output keeps the Railway image small — it ships only the files
  // the server actually needs instead of the whole node_modules tree.
  output: 'standalone',
  experimental: {
    // These ship prebuilt native binaries; webpack must require them at runtime
    // rather than try to parse the .node files.
    serverComponentsExternalPackages: ['@node-rs/argon2', 'sharp', '@prisma/client'],
  },
};

module.exports = nextConfig;
