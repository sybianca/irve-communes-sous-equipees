/** @type {import('next').NextConfig} */
const nextConfig = {
  // @duckdb/node-api embarque un binaire natif : à ne pas bundler, à charger tel quel.
  serverExternalPackages: ['@duckdb/node-api'],
  // Vercel ne trace pas les binaires natifs des packages externalisés :
  // les inclure explicitement dans la fonction serverless.
  outputFileTracingIncludes: {
    '/': ['./node_modules/@duckdb/**/*'],
  },
};

export default nextConfig;
