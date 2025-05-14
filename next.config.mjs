/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    // Use path resolution without require
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve.alias,
        // Ensure React is deduped
        'react': './node_modules/react',
        'react-dom': './node_modules/react-dom',
      },
    };
    
    return config;
  },
};

export default nextConfig;
