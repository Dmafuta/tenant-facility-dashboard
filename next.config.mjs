/** @type {import("next").NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['tesseract.js'],
  },
  async headers() {
    const isDev = process.env.NODE_ENV === 'development'
    // CSP notes:
    //   script-src 'unsafe-inline' — required for Next.js hydration scripts (__NEXT_DATA__)
    //   script-src 'unsafe-eval'   — required in dev only for webpack HMR (eval-based source maps)
    //   style-src  'unsafe-inline' — required for Tailwind's runtime class injection
    //   connect-src includes ws://* wss://* for Next.js HMR in development
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self' ws: wss:",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; ')

    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Content-Security-Policy", value: csp },
      ],
    }]
  },
}
export default nextConfig
