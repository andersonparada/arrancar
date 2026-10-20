-- Dos emisiones del libro de una misma empresa no pueden usar el mismo folio (drizzle-kit no sabe escribir restricciones de exclusión).
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."emisiones_del_libro" ADD CONSTRAINT "emisiones_del_libro_sin_traslape" EXCLUDE USING gist ("empresa_id" WITH =, int4range("folio_desde", "folio_hasta", '[]') WITH &&);
