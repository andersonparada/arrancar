-- Dos vigencias del mismo combustible no pueden traslaparse (drizzle-kit no sabe escribir restricciones de exclusión).
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."vigencias_de_combustible" ADD CONSTRAINT "vigencias_de_combustible_sin_traslape" EXCLUDE USING gist ("combustible_id" WITH =, daterange("vigente_desde", "vigente_hasta", '[]') WITH &&);
