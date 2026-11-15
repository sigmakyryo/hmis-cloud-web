# Ad-hoc builds:
#   docker build -f compose/production/nextjs/Dockerfile .
#
# Production / local compose (preferred):
#   docker compose -f docker-compose.production.yml build
#   docker compose -f docker-compose.local.yml build
#
# Canonical production image definition:
#   compose/production/nextjs/Dockerfile

FROM docker.io/node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_APP_HOST=app.sigmahmis.com
ARG NEXT_PUBLIC_MARKETING_HOST=sigmahmis.com
ARG NEXT_PUBLIC_ASSET_PREFIX=
ARG NEXT_PUBLIC_BLOG_URL=
ARG NEXT_PUBLIC_DISABLE_HOST_ROUTING=

ENV NEXT_PUBLIC_APP_HOST=$NEXT_PUBLIC_APP_HOST \
    NEXT_PUBLIC_MARKETING_HOST=$NEXT_PUBLIC_MARKETING_HOST \
    NEXT_PUBLIC_ASSET_PREFIX=$NEXT_PUBLIC_ASSET_PREFIX \
    NEXT_PUBLIC_BLOG_URL=$NEXT_PUBLIC_BLOG_URL \
    NEXT_PUBLIC_DISABLE_HOST_ROUTING=$NEXT_PUBLIC_DISABLE_HOST_ROUTING \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=4096"

RUN npm run build

FROM docker.io/node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache wget \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    HMIS_API_URL= \
    OH_SERVICE_URL=

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

COPY ./compose/production/nextjs/start /start
RUN sed -i 's/\r$//g' /start \
  && chmod 755 /start \
  && chown nextjs:nodejs /start

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

CMD ["/start"]
