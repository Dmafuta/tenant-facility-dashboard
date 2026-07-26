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
      // unsafe-inline: required for Next.js hydration; unsafe-eval: dev HMR only
      // Cloudflare Turnstile: required for resident-verify page
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://challenges.cloudflare.com`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      // ws/wss: Next.js HMR in dev; Cloudflare: Turnstile API calls
      `connect-src 'self' https://challenges.cloudflare.com${isDev ? ' ws: wss:' : ''}`,
      "frame-src https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')

    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options",           value: "DENY" },
        { key: "X-Content-Type-Options",     value: "nosniff" },
        { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy",         value: "camera=(self), microphone=(), geolocation=(), payment=()" },
        { key: "Content-Security-Policy",    value: csp },
      ],
    }]
  },
}
export default nextConfig
