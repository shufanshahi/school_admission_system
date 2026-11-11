# ---- build ----------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# Install first (cached until package files change)
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- run ------------------------------------------------------------------
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# The address the BROWSER uses to reach the backend (not a Docker-internal name).
ENV API_URL=http://localhost:8080
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
