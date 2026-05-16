# Build from repo root: docker build -f apps/api/Dockerfile .
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl python3 make g++
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci --workspace=api
COPY apps/api ./apps/api
WORKDIR /app/apps/api
RUN npx prisma generate && npm run build

FROM node:20-alpine AS run
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api ./apps/api
COPY apps/api/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
WORKDIR /app/apps/api
EXPOSE 10000
ENTRYPOINT ["/entrypoint.sh"]
