/** @type {import('next').NextConfig} */
const config = {
  /* config options here */
  reactStrictMode: false, // Next.js 16 uses new React DevTools
  async redirects() {
    return [
      {
        source: '/tools',
        destination: '/dashboard/tools',
        permanent: false,
      },
      {
        source: '/settings',
        destination: '/dashboard/settings',
        permanent: false,
      },
    ];
  },
};

export default config;

