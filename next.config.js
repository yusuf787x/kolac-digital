/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async rewrites() {
    return [
      // "/" servt die bestehende statische Homepage (public/index.html).
      // Legal-Pages (impressum.html etc.) werden direkt aus public/ geliefert.
      { source: '/', destination: '/index.html' },
    ];
  },
};

module.exports = nextConfig;
