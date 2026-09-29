DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "terceros"."categorias_proveedor" GROUP BY "cuenta_id", core.nombre_normalizado("nombre") HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'No se puede aplicar la migración: hay categorías de proveedor con nombres repetidos que solo cambian en mayúsculas, acentos o espacios. Corríjalos y vuelva a migrar.';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "terceros"."categorias_proveedor" DROP CONSTRAINT "categorias_proveedor_nombre_por_cuenta";--> statement-breakpoint
CREATE UNIQUE INDEX "categorias_proveedor_nombre_por_cuenta" ON "terceros"."categorias_proveedor" USING btree ("cuenta_id",core.nombre_normalizado("nombre"));
