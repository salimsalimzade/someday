# Build from the repo root: docker build -f apps/web/Dockerfile .
FROM node:26-alpine AS base
RUN npm install --global pnpm@11.23.0
WORKDIR /app

# Keep only the files @bedrock/web needs, so unrelated changes don't bust the cache.
FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2.11.10 prune @bedrock/web --docker

FROM base AS builder
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY --from=pruner /app/out/full/ .
# turbo prune leaves out root files that aren't package manifests.
COPY tsconfig.base.json ./
RUN pnpm turbo run build --filter=@bedrock/web

FROM nginx:1.29-alpine AS runner
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
