import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  // Allow access to remote image placeholder.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
    ],
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  // Required in Next.js 16 when a custom webpack config exists.
  turbopack: {},
  webpack: (config, {dev, isServer}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify - file watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }

    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'whatwg-fetch': false,
        'isomorphic-fetch': false,
        'cross-fetch': false,
        'node-fetch': false,
      };
    }

    return config;
  },
};

export default nextConfig;
