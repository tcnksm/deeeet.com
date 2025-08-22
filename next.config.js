/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        // Redirect old date-based blog URLs to new structure
        // /writing/YYYY/MM/DD/slug -> /writing/slug
        source: '/writing/:year/:month/:day/:slug',
        destination: '/writing/:slug',
        permanent: true, // 301 redirect
      },
      {
        // Redirect any remaining /blog paths to /writing
        source: '/posts/:path*',
        destination: '/writing/:path*',
        permanent: true, // 301 redirect
      },
    ];
  },
};

module.exports = nextConfig;
