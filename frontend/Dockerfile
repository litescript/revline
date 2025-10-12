# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm i
COPY . .
RUN npm run build

# --- Runtime (nginx) ---
FROM nginx:1.27-alpine
# SPA-friendly nginx template with API proxy (env-subst at runtime)
COPY infra/nginx/default.conf.template /etc/nginx/templates/default.conf.template
# Static files
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
