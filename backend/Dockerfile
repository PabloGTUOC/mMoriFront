# Multi-stage build — the runtime image carries no dev dependencies and no TypeScript.

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY data ./data

# Run unprivileged. The Rails Dockerfile did the same with a `rails` user; node:slim
# already ships a `node` user.
USER node

EXPOSE 3000

# Unlike the Rails entrypoint, there is no `db:prepare` step — BACKEND_SPEC §9 notes that
# one targeted PostgreSQL, which this service does not use at all. Mongo needs no
# migration; seed the reference data separately with `npm run seed:life-expectancy`.
CMD ["node", "dist/server.js"]
