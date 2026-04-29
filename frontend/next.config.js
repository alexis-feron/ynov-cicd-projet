/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a self-contained output bundle for Docker production images.
  output: 'standalone',

  // Compress responses with gzip
  compress: true,

  // Remove X-Powered-By header (minor security + size)
  poweredByHeader: false,

  experimental: {
    // Tree-shake lucide-react icons to only bundle what is actually imported
    optimizePackageImports: ['lucide-react'],
  },

  async headers() {
    if (process.env.NODE_ENV === 'development') return [];
    return [
      {
        // Immutable cache for hashed Next.js static assets (production only)
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
