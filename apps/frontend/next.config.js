const { composePlugins, withNx } = require('@nx/next');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // NX configuration
  nx: {
    svgr: false,
  },

  // Output configuration for monorepo
  distDir: '../../dist/apps/frontend/.next',

  // React strict mode
  reactStrictMode: true,

  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // Optimize package imports
    optimizePackageImports: ['@radix-ui/react-icons'],
  },

  // Image configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

const plugins = [
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
