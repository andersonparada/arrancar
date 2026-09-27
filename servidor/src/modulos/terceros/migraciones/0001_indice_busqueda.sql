-- pg_trgm es una extensión "trusted" desde PostgreSQL 13: no necesita superusuario,
-- basta con que la ejecute el rol dueño de las migraciones.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "terceros_nombre_mostrar_trgm_idx"
  ON "terceros"."terceros" USING gin ("nombre_mostrar" gin_trgm_ops);
