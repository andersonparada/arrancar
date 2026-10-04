DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "libro_de_compras"."combustibles" GROUP BY "empresa_id", core.nombre_normalizado("nombre") HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'No se puede aplicar la migración: hay combustibles con nombres repetidos que solo cambian en mayúsculas, acentos o espacios. Corríjalos y vuelva a migrar.';
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "libro_de_compras"."conceptos_de_gasto" GROUP BY "empresa_id", core.nombre_normalizado("nombre") HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'No se puede aplicar la migración: hay conceptos de gasto con nombres repetidos que solo cambian en mayúsculas, acentos o espacios. Corríjalos y vuelva a migrar.';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "libro_de_compras"."combustibles" DROP CONSTRAINT "combustibles_nombre_unico";--> statement-breakpoint
ALTER TABLE "libro_de_compras"."conceptos_de_gasto" DROP CONSTRAINT "conceptos_de_gasto_nombre_unico";--> statement-breakpoint
CREATE UNIQUE INDEX "combustibles_nombre_unico" ON "libro_de_compras"."combustibles" USING btree ("empresa_id",core.nombre_normalizado("nombre"));--> statement-breakpoint
CREATE UNIQUE INDEX "conceptos_de_gasto_nombre_unico" ON "libro_de_compras"."conceptos_de_gasto" USING btree ("empresa_id",core.nombre_normalizado("nombre"));
