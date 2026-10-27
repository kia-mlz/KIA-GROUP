# syntax=docker/dockerfile:1
# =============================================================================
# Kia Academy — production multi-stage images
#   • target `api`  : NestJS REST API        (port 3001, /api)
#   • target `web`  : Next.js 15 standalone  (port 3000)
#
# Design notes
#   - Node 22 slim base (matches .nvmrc / engines >=22.13), pnpm via Corepack
#   - Layer caching: manifests first → cached pnpm store → source copy
#   - Native toolchain (bcrypt / Prisma engines) isolated inside build stages
#   - Runtime images run as unprivileged `node` user with pre-owned mount points
# =============================================================================

ARG NODE_VERSION=22

# ---------------------------------------------------------------- base -------
FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# Route pnpm's content-addressable store through /pnpm so BuildKit's
# cache-mount below persists downloads across builds & retries.
ENV npm_config_store_dir=/pnpm/store
RUN corepack enable \
  && corepack prepare pnpm@11.19.0 --activate
WORKDIR /app

# ------------------------------------------------------- dependencies --------
FROM base AS deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
# Root db.json is statically imported by apps/group/src/lib/courseCatalog.ts
# (demo catalog) — must exist for the Next production build.
COPY db.json ./
COPY packages/permissions/package.json packages/permissions/
COPY packages/permissions/tsconfig.json packages/permissions/
COPY packages/permissions/src packages/permissions/src
COPY packages/brand/package.json packages/brand/
COPY packages/brand/tsconfig.json packages/brand/
COPY packages/brand/src packages/brand/src
COPY packages/brand/css packages/brand/css
COPY packages/shared/package.json packages/shared/
# Shared sources are needed during install because the root `postinstall`
# compiles the workspace libraries (fresh type declarations for API build below).
COPY packages/shared/tsconfig.json packages/shared/
COPY packages/shared/src packages/shared/src
# Platform kernel + the six kia./* department packages: the root
# postinstall runs `pnpm db:generate` (client output → packages/platform/src)
# followed by `pnpm build:libs`, so manifests AND sources must exist pre-install.
COPY packages/platform/package.json packages/platform/tsconfig.json packages/platform/tsconfig.build.json packages/platform/
COPY packages/platform/src packages/platform/src
COPY kia. kia.
COPY apps/api/package.json apps/api/
# Prisma schema ships with the manifest layer: root `postinstall` generates the client.
COPY apps/api/prisma apps/api/prisma
COPY apps/group/package.json apps/group/
# Flaky-registry resilience: retry the whole install up to 5× (each attempt
# reuses the cached store — only the missing metadata re-downloads). The
# DOMException timeout seen on slow CI networks happens inside a single
# install; a fresh attempt with a warm store succeeds quickly.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    set -eux; \
    for i in 1 2 3 4 5; do \
      pnpm install --frozen-lockfile && break; \
      echo "pnpm install failed (attempt $i) — retrying in 15s" >&2; \
      sleep 15; \
    done

# ------------------------------------------------------------ builder -------
FROM deps AS builder
COPY packages/permissions packages/permissions
COPY packages/brand packages/brand
COPY packages/shared packages/shared
COPY packages/platform packages/platform
COPY kia. kia.
COPY apps/api apps/api

# Generate before building libs: the Prisma client is compiled INTO
# packages/platform (schema.prisma generator output).
RUN pnpm --filter @kia./api exec prisma generate
RUN pnpm build:libs
RUN pnpm --filter @kia./api build

# ----------------------------------------------------- web builder -----------
# Separate stage so the api image build does not compile the Next.js app.
FROM deps AS builder-web
COPY packages/permissions packages/permissions
COPY packages/brand packages/brand
COPY packages/shared packages/shared
# kia-material ships source (transpiled by Next via transpilePackages).
COPY kia. kia.
COPY apps/group apps/group

ARG NEXT_PUBLIC_API_URL=
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG API_PROXY_TARGET=http://api:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    API_PROXY_TARGET=$API_PROXY_TARGET \
    DOCKER_BUILD=true
# Webpack builds of this app can exceed the default V8 heap on CI runners
# (7 GB RAM) — raise it explicitly and let Node fall back if unavailable.
ENV NODE_OPTIONS=--max-old-space-size=6144
RUN pnpm --filter @kia./group build

# -------------------------------------------------------- api (runtime) ------
FROM base AS api
LABEL org.opencontainers.image.title="Kia Academy API" \
      org.opencontainers.image.description="NestJS API for Kia Academy adaptive learning platform" \
      org.opencontainers.image.source=https://github.com/kia-mlz/KIA-GROUP \
      org.opencontainers.image.licenses=MIT

ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates postgresql-client \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
# Platform kernel + department packages (dist + node_modules links) — the API
# dist requires them at runtime (`require('@kia./platform')` etc.).
COPY --from=builder /app/packages/platform ./packages/platform
COPY --from=builder /app/kia. ./kia.
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
# Pre-create the uploads mount-point so a named volume inherits safe ownership.
RUN chmod +x /usr/local/bin/api-entrypoint.sh \
  && mkdir -p /app/apps/api/uploads \
  && chown -R node:node /app
USER node
WORKDIR /app/apps/api

EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+ (process.env.PORT||3001) +'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["api-entrypoint.sh"]

# -------------------------------------------------------- web (runtime) ------
FROM base AS web
LABEL org.opencontainers.image.title="Kia Academy Web" \
      org.opencontainers.image.description="Next.js frontend for Kia Academy adaptive learning platform" \
      org.opencontainers.image.source=https://github.com/kia-mlz/KIA-GROUP \
      org.opencontainers.image.licenses=MIT

ENV NODE_ENV=production
WORKDIR /
COPY --from=builder-web /app/apps/group/.next/standalone ./
COPY --from=builder-web /app/apps/group/.next/static ./apps/group/.next/static
COPY --from=builder-web /app/apps/group/public ./apps/group/public
RUN chown -R node:node /apps
USER node

ENV PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+ (process.env.PORT||3000) +'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/group/server.js"]
