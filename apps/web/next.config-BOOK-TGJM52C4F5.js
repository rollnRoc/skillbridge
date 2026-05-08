//@ts-check

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { composePlugins, withNx } = require('@nx/next');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const API_ORIGIN =
  process.env.API_INTERNAL_URL ||
  process.env.BACKEND_URL ||
  'http://127.0.0.1:3001';

const nextConfig = {
  // See: https://nx.dev/recipes/next/next-config-setup
  nx: {},
  // turbopack.root monorepoda bazen __webpack_modules__[moduleId] is not a function hatasına yol açabiliyor; kaldırıldı.
  /** Tarayıcıdan /api → API sunucusu; çerezler aynı kökenle güvenilir çalışır. */
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_ORIGIN.replace(/\/$/, '')}/api/:path*`,
      },
    ];
  },
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
