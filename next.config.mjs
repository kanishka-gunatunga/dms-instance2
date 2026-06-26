/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'localhost',
      '127.0.0.1'
    ],
    unoptimized: true,
  },

  async headers() {
    const csp = `
      default-src 'self';
      base-uri 'self';
      object-src 'none';
      media-src 'self' http: https:;
      frame-src 'self'
        http://localhost:3000
        http://localhost:8000
        http://127.0.0.1:3000
        http://127.0.0.1:8000
        https://dms-instance2.vercel.app
        https://dms3.genaitech.dev
        https://view.officeapps.live.com
        https://login.microsoftonline.com
        https://login.live.com;

      frame-ancestors 'self'
        http://localhost:3000
        http://127.0.0.1:3000
        https://dms-instance2.vercel.app;

      connect-src 'self'
        http://localhost:3000
        http://localhost:8000
        http://127.0.0.1:3000
        http://127.0.0.1:8000
        https://dms-instance2.vercel.app
        https://dms3.genaitech.dev
        https://login.microsoftonline.com
        https://graph.microsoft.com;

      img-src 'self' data: blob: https: http://localhost:* http://127.0.0.1:* https://dms3.genaitech.dev https://dms-instance2.vercel.app;

      script-src 'self' 'unsafe-inline' 'unsafe-eval'
        https://static.cloudflareinsights.com
        https://alcdn.msauth.net
        https://res.cdn.office.net;

      style-src 'self' 'unsafe-inline' https:;
      font-src 'self' https: data:;
    `;

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },

          // IMPORTANT: remove X-Frame-Options completely
          { key: 'Content-Security-Policy', value: csp.replace(/\s+/g, ' ').trim() },
        ],
      },
    ];
  },
};

export default nextConfig;