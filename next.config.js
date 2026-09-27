/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict static export: everything is pre-rendered to ./out and can be served
  // from an S3 bucket behind a CDN. No server, no API routes, no SSR.
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Emit `index.html` inside each route folder (out/menu/index.html) so S3 +
  // CloudFront can resolve folder paths without rewrite rules.
  trailingSlash: true,
  reactStrictMode: true,
};

module.exports = nextConfig;
