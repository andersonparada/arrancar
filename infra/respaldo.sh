#!/bin/sh
# Respaldo diario de la base de datos y de las fotos.
# - Diarios: los últimos DIAS_RETENCION días en infra/respaldos.
# - Mensuales: el primer respaldo de cada mes (el del día 1) se copia a
#   infra/respaldos/mensuales y se conserva MESES_RETENCION_MENSUAL meses.
# Cópielos también fuera del servidor (ver «Respaldos» en docs/PLAN.md).
set -eu

DIAS_RETENCION="${DIAS_RETENCION:-14}"
MESES_RETENCION_MENSUAL="${MESES_RETENCION_MENSUAL:-60}"
CARPETA_MENSUAL=/respaldos/mensuales

# Copia los dos archivos del día a la carpeta mensual si aún no hay uno de este mes.
guardar_respaldo_mensual() {
  fecha_del_dia="$1"
  mes=$(date +%Y-%m)
  if ls "${CARPETA_MENSUAL}"/arrancar_"${mes}"-*.dump >/dev/null 2>&1; then
    return
  fi
  mkdir -p "${CARPETA_MENSUAL}"
  cp "/respaldos/arrancar_${fecha_del_dia}.dump" "/respaldos/archivos_${fecha_del_dia}.tar.gz" "${CARPETA_MENSUAL}/"
  echo "Respaldo mensual ${mes} guardado"
}

# Borra los diarios vencidos (sin entrar a la carpeta mensual) y los mensuales vencidos.
depurar_respaldos() {
  find /respaldos -maxdepth 1 -type f -mtime +"${DIAS_RETENCION}" -delete
  if [ -d "${CARPETA_MENSUAL}" ]; then
    find "${CARPETA_MENSUAL}" -type f -mtime +$((MESES_RETENCION_MENSUAL * 31)) -delete
  fi
}

while true; do
  fecha=$(date +%Y-%m-%d_%H%M)
  pg_dump -h postgres -U arrancar -d arrancar -Fc -f "/respaldos/arrancar_${fecha}.dump"
  tar -czf "/respaldos/archivos_${fecha}.tar.gz" -C /archivos .
  guardar_respaldo_mensual "${fecha}"
  depurar_respaldos
  echo "Respaldo ${fecha} completado"
  sleep 86400
done
