# syntax=docker/dockerfile:1
# Build context: repository root
FROM node:20.18.0-alpine AS build
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY apps/admin ./apps/admin
COPY packages ./packages

# NEXT_PUBLIC_* is inlined at `next build`. Railway maps service variables to these ARGs.
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_ENV=production
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_ENV=$NEXT_PUBLIC_ENV

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @caratom/admin build
RUN mkdir -p /repo/apps/admin/public

FROM node:20.18.0-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000
RUN addgroup -S caratom && adduser -S -G caratom caratom
COPY --from=build --chown=caratom:caratom /repo/apps/admin/.next/standalone ./
COPY --from=build --chown=caratom:caratom /repo/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=build --chown=caratom:caratom /repo/apps/admin/public ./apps/admin/public
USER caratom
EXPOSE 3000
CMD ["node", "apps/admin/server.js"]
