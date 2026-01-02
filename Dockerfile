FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM alpine:3.20 AS runtime
WORKDIR /app
COPY --from=build /app/dist /app/dist
VOLUME /frontend-dist
CMD ["sh", "-c", "rm -rf /frontend-dist/* && cp -r /app/dist/. /frontend-dist/ && sleep infinity"]
