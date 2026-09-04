# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Version fijada a proposito. Sin fijar, cada build instala el pnpm mas nuevo que
# exista ese dia, asi que un cambio aguas arriba rompe el build sin que nada haya
# cambiado aqui. Ya paso: un pnpm nuevo dejo de leer el campo "pnpm" de
# package.json y convirtio los scripts de build no aprobados en error fatal
# (ERR_PNPM_IGNORED_BUILDS), tumbando el deploy con el mismo commit que compilaba
# el dia anterior. El 10.x corresponde al formato del lockfile (lockfileVersion
# 9.0); subir el pin debe ser una decision deliberada, no un accidente de fecha.
RUN npm install -g pnpm@10

WORKDIR /app

# Copiar manifiestos primero para cachear dependencias.
# pnpm-workspace.yaml va aqui aunque no haya monorepo: es la casa nueva de la
# configuracion de pnpm y tiene que estar presente ANTES del install, o el
# install corre sin ella y vuelve el mismo error.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
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

# Una sola configuracion: este contenedor sirve HTTP y nada mas. Quien termina
# el TLS es Traefik, que es el unico que publica 80/443 en el servidor y habla
# con este contenedor por la red interna.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
