FROM node:20-alpine AS build
WORKDIR /app
COPY kooyahq_fe/package.json kooyahq_fe/package-lock.json ./
RUN npm ci
COPY kooyahq_fe/ ./
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
RUN if [ -n "$VITE_API_URL" ]; then export VITE_API_URL="$VITE_API_URL"; fi; \
    if [ -n "$VITE_GOOGLE_CLIENT_ID" ]; then export VITE_GOOGLE_CLIENT_ID="$VITE_GOOGLE_CLIENT_ID"; fi; \
    npm run build

FROM alpine:3.20 AS runtime
WORKDIR /app
COPY --from=build /app/dist /app/dist
VOLUME /frontend-dist
CMD ["sh", "-c", "rm -rf /frontend-dist/* && cp -r /app/dist/. /frontend-dist/ && sleep infinity"]
