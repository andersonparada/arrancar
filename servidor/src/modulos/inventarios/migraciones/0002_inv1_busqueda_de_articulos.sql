-- pg_trgm es una extensión "trusted" desde PostgreSQL 13 (la misma que usa Terceros): basta con el rol dueño.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "articulos_nombre_trgm_idx"
  ON "inventarios"."articulos" USING gin ("nombre" gin_trgm_ops);
