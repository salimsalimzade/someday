# Build from the repo root: docker build -f apps/server/Dockerfile .
FROM node:26-alpine AS base
RUN npm install --global pnpm@11.23.0
WORKDIR /app

# Keep only the files @bedrock/server needs, so unrelated changes don't bust the cache.
FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2.11.10 prune @bedrock/server --docker

FROM base AS builder
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY --from=pruner /app/out/full/ .
# turbo prune leaves out root files that aren't package manifests.
COPY tsconfig.base.json ./
RUN pnpm turbo run build --filter=@bedrock/server

# The bundle includes every dependency, so the runtime image needs only dist/.
FROM node:26-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/apps/server/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/index.mjs"]
