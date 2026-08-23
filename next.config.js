/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    // Erlaubt next/image den Portfolio-Placeholder als SVG zu laden.
    // Wir servieren ausschliesslich eigene SVGs aus /public, deshalb
    // ist das hier ungefaehrlich. CSP verbietet Skript-Ausfuehrung.
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  async rewrites() {
    return [
      // "/" servt die bestehende statische Homepage (public/index.html).
      // Legal-Pages (impressum.html etc.) werden direkt aus public/ geliefert.
      { source: '/', destination: '/index.html' },
    ];
  },
};

module.exports = nextConfig;
