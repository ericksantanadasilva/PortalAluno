/** @type {import('next').NextConfig} */
const backendUrl = process.env.API_BASE_URL || 'http://localhost:3001';
const nextConfig = {
  allowedDevOrigins: ['192.168.0.104', '*.ngrok-free.dev'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
      {
        protocol: 'https',
        hostname: 'doc-*-docs.googleusercontent.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
};

export default nextConfig;
