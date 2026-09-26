# Imagen única: API (Fastify) que también sirve la PWA compilada.

FROM node:22-bookworm-slim AS construccion
WORKDIR /app
COPY package.json package-lock.json ./
COPY servidor/package.json servidor/
COPY cliente/package.json cliente/
RUN npm ci
COPY . .
RUN npm run construir

FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    RUTA_CLIENTE=/app/cliente/dist \
    RUTA_ALMACENAMIENTO=/datos/archivos
WORKDIR /app
COPY package.json package-lock.json ./
COPY servidor/package.json servidor/
COPY cliente/package.json cliente/
RUN npm ci --omit=dev -w servidor && npm cache clean --force
COPY --from=construccion /app/servidor/dist servidor/dist
COPY --from=construccion /app/cliente/dist cliente/dist
RUN mkdir -p /datos/archivos && chown -R node:node /datos
USER node
WORKDIR /app/servidor
EXPOSE 3100
# Aplica las migraciones pendientes antes de arrancar.
CMD ["sh", "-c", "node dist/modulos/core/base-datos/migrar.js && exec node dist/principal.js"]
