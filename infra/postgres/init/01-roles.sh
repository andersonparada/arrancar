#!/bin/sh
# Crea el rol con el que se conecta la aplicación. Es distinto del dueño de las
# tablas para que las políticas de Row Level Security siempre se apliquen.
# Los permisos sobre cada esquema los otorga el migrador de la aplicación.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE ROLE arrancar_app LOGIN PASSWORD '${ARRANCAR_APP_PASSWORD}';
  GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO arrancar_app;
EOSQL

if [ "${CREAR_BD_PRUEBAS:-no}" = "si" ]; then
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE ${POSTGRES_DB}_pruebas OWNER ${POSTGRES_USER};
    GRANT CONNECT ON DATABASE ${POSTGRES_DB}_pruebas TO arrancar_app;
EOSQL
fi
