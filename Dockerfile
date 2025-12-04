# syntax=docker/dockerfile:1

ARG HOSTNAME=0.0.0.0
ARG PORT=3000
ARG WS_PORT=8081

FROM node:24-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
COPY server/package.json server/package-lock.json ./server/
RUN npm ci --no-audit --no-fund
RUN cd server && npm ci --no-audit --no-fund

FROM deps AS builder
COPY . .
# Propagate port configuration into the build so NEXT_PUBLIC_WS_PORT matches WS_PORT
ARG PORT
ARG WS_PORT
ENV PORT=${PORT}
ENV WS_PORT=${WS_PORT}
ENV NEXT_PUBLIC_WS_PORT=${WS_PORT}
RUN npm run build
RUN cd server && npm run build

FROM deps AS prod-deps
RUN npm prune --omit=dev
RUN cd server && npm prune --omit=dev

FROM node:24-alpine AS runner
WORKDIR /app
ARG HOSTNAME
ARG PORT
ARG WS_PORT
ENV NODE_ENV=production
ENV HOSTNAME=${HOSTNAME}
ENV PORT=${PORT}
ENV WS_PORT=${WS_PORT}
ENV NEXT_PUBLIC_WS_PORT=${WS_PORT}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_PATH=/app/node_modules:/app/server/node_modules

RUN apk add --no-cache libc6-compat

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/dist ./dist

COPY package.json package-lock.json ./
COPY server/package.json server/package-lock.json ./server/
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/server/node_modules ./server/node_modules
# Ensure server-only deps (e.g., ws) are visible from the app root for ESM resolution
RUN cp -a /app/server/node_modules/* /app/node_modules/

COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x /app/entrypoint.sh && mkdir -p /app/maps /app/artworks

VOLUME ["/app/maps", "/app/artworks"]
EXPOSE 3000 8081
CMD ["/app/entrypoint.sh"]
