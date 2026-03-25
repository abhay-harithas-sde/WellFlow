const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./lib/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'output: export' is for production static builds only — remove for local dev
  // output: 'export',
  images: {
    unoptimized: true,
  },
};

module.exports = withNextIntl(nextConfig);
