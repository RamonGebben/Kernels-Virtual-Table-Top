# syntax=docker/dockerfile:1

FROM node:20-slim AS base
WORKDIR /app

FROM base AS deps
COPY server/package*.json ./server/
RUN cd server && npm ci

FROM deps AS builder
COPY . .
RUN cd server && npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV WS_PORT=8081

COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev
# Ensure runtime dependencies are discoverable from the dist output
RUN ln -s /app/server/node_modules /app/node_modules

COPY --from=builder /app/dist ./dist
RUN mkdir -p /app/maps

EXPOSE 8081
CMD ["node", "dist/server/src/index.js"]
