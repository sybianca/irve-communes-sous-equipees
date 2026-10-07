/** @type {import('next').NextConfig} */
const nextConfig = {
  // @duckdb/node-api embarque un binaire natif : à ne pas bundler, à charger tel quel.
  serverExternalPackages: ['@duckdb/node-api'],
};

export default nextConfig;
