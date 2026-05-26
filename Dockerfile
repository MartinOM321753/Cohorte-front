# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app

# Copiar manifiestos primero para cachear dependencias
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ARG recibe VITE_API_URL desde docker-compose (definido en el .env raíz)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Copiar fuentes y compilar (Vite lee VITE_API_URL del entorno en tiempo de build)
COPY . .
RUN pnpm run build

# ── Stage 2: Servidor nginx ───────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
