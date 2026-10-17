import type { NextConfig } from 'next';
import path from 'node:path';

const isDockerBuild = process.env.DOCKER_BUILD === 'true';
const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const isProd = process.env.NODE_ENV === 'production';
const apiProxyTarget = (process.env.API_PROXY_TARGET ?? 'http://localhost:3001').replace(/\/$/, '');

/** Project-site path — must match the GitHub repo name (Pages URL /<repo>/). */
const githubPagesBasePath = (process.env.NEXT_BASE_PATH ?? '/KIA-GROUP').replace(/\/$/, '') || '';

/**
 * Practical CSP for Next.js App Router (self-hosted fonts + same-origin API proxy).
 * Avoids blocking Next runtime while still limiting frame embedding and mixed content.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  // unsafe-eval is only needed by the Next dev runtime — never in production.
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // All API traffic flows through the same-origin /api proxy. Direct localhost
  // API calls are allowed only outside production (local dev pointing at :3001).
  isProd
    ? "connect-src 'self'"
    : "connect-src 'self' http://localhost:3001 http://127.0.0.1:3001",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  ...(isProd ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  ...(isProd
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
    : []),
];

const nextConfig: NextConfig = {
  // Workspace packages are transpiled from source (tsconfig paths map them to
  // packages/*/src), so shared tokens/types flow straight into the bundle.
  transpilePackages: [
    '@kia./shared',
    '@kia./brand',
    '@kia./permissions',
    // kia-material ships source (main points at .ts) — no build step.
    '@kia./kia-material',
  ],
  // Allow importing monorepo-root `db.json` into the web app.
  outputFileTracingRoot: path.join(__dirname, '../..'),
  ...(isGitHubPages
    ? {
        output: 'export' as const,
        basePath: githubPagesBasePath,
        assetPrefix: githubPagesBasePath,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : isDockerBuild
      ? {
          output: 'standalone' as const,
        }
      : {}),
  ...(!isGitHubPages
    ? {
        async rewrites() {
          return [
            {
              source: '/api/:path*',
              destination: `${apiProxyTarget}/api/:path*`,
            },
          ];
        },
        async headers() {
          return [
            {
              source: '/:path*',
              headers: securityHeaders,
            },
          ];
        },
      }
    : {}),
};

export default nextConfig;
