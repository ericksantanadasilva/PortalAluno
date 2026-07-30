/** @type {import('next').NextConfig} */
const backendUrl = process.env.API_BASE_URL || 'http://localhost:3001';
const nextConfig = {
  allowedDevOrigins: [
    '192.168.0.104',
    '*.ngrok-free.dev',
    '*.app.github.dev',
    '*.githubpreview.dev',
    'super-duper-space-couscous-4jjjvvxvp7v925gr-3000.app.github.dev',
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        '*.app.github.dev',
        '*.githubpreview.dev',
        'super-duper-space-couscous-4jjjvvxvp7v925gr-3000.app.github.dev',
        'localhost:3000',
        '127.0.0.1:3000',
      ],
    },
  },
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
