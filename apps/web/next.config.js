//@ts-check

const { composePlugins, withNx } = require('@nx/next');

const DEFAULT_PROD_API_ORIGIN = 'https://api.skillbridge.com.tr';

const API_ORIGIN =
  process.env.API_INTERNAL_URL ||
  process.env.BACKEND_URL ||
  (process.env.NODE_ENV === 'production'
    ? DEFAULT_PROD_API_ORIGIN
    : 'http://127.0.0.1:3001');

const nextConfig = {
  nx: {},
  generateBuildId: async () => 'build-' + Date.now(),
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_ORIGIN.replace(/\/$/, '')}/api/:path*`,
      },
    ];
  },
};

const plugins = [withNx];

module.exports = composePlugins(...plugins)(nextConfig);