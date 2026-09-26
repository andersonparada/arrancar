#!/bin/sh
# Respaldo diario de la base de datos y de las fotos. Conserva los últimos
# DIAS_RETENCION días en infra/respaldos (cópielos también fuera del servidor).
set -eu

while true; do
  fecha=$(date +%Y-%m-%d_%H%M)
  pg_dump -h postgres -U arrancar -d arrancar -Fc -f "/respaldos/arrancar_${fecha}.dump"
  tar -czf "/respaldos/archivos_${fecha}.tar.gz" -C /archivos .
  find /respaldos -type f -mtime +"${DIAS_RETENCION}" -delete
  echo "Respaldo ${fecha} completado"
  sleep 86400
done
