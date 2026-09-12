# Parameterized image for any service in the monorepo.
# Build one service:  docker build --build-arg APP=orders -t msvc-orders .
# The build compiles all apps (shared libs); the runtime stage runs the chosen one.

FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build   # builds all 5 apps into dist/apps/*

FROM node:22-alpine AS runtime
WORKDIR /app
ARG APP=gateway
ENV APP=${APP}
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
# Run the selected app's compiled entrypoint.
CMD ["sh", "-c", "node dist/apps/${APP}/main.js"]
