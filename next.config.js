/**
 * @type {import('next').NextConfig}
 *
 * Static export. Supports two deployment shapes:
 *  - Root hosting (S3/CDN, custom domain, `npm run build`): basePath off.
 *  - GitHub Pages project site (deploy workflow): GH_PAGES=1 adds the
 *    repository-name basePath so assets resolve under /open-vision-therapy/.
 */
const isGhPages = process.env.GH_PAGES === '1';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  ...(isGhPages ? { basePath: '/open-vision-therapy' } : {}),
  // Emit `index.html` inside each route folder (out/menu/index.html) so S3 +
  // CloudFront can resolve folder paths without rewrite rules.
  trailingSlash: true,
  reactStrictMode: true,
};

module.exports = nextConfig;
