DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "empresas"."departamentos" GROUP BY "empresa_id", core.nombre_normalizado("nombre") HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'No se puede aplicar la migración: hay departamentos con nombres repetidos que solo cambian en mayúsculas, acentos o espacios. Corríjalos y vuelva a migrar.';
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "empresas"."localidades" GROUP BY "empresa_id", core.nombre_normalizado("nombre") HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'No se puede aplicar la migración: hay localidades con nombres repetidos que solo cambian en mayúsculas, acentos o espacios. Corríjalos y vuelva a migrar.';
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "empresas"."tipos_de_localidad" GROUP BY "empresa_id", core.nombre_normalizado("nombre") HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'No se puede aplicar la migración: hay tipos de localidad con nombres repetidos que solo cambian en mayúsculas, acentos o espacios. Corríjalos y vuelva a migrar.';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "empresas"."departamentos" DROP CONSTRAINT "departamentos_nombre_unico";--> statement-breakpoint
ALTER TABLE "empresas"."localidades" DROP CONSTRAINT "localidades_nombre_unico";--> statement-breakpoint
ALTER TABLE "empresas"."tipos_de_localidad" DROP CONSTRAINT "tipos_de_localidad_nombre_unico";--> statement-breakpoint
CREATE UNIQUE INDEX "departamentos_nombre_unico" ON "empresas"."departamentos" USING btree ("empresa_id",core.nombre_normalizado("nombre"));--> statement-breakpoint
CREATE UNIQUE INDEX "localidades_nombre_unico" ON "empresas"."localidades" USING btree ("empresa_id",core.nombre_normalizado("nombre"));--> statement-breakpoint
CREATE UNIQUE INDEX "tipos_de_localidad_nombre_unico" ON "empresas"."tipos_de_localidad" USING btree ("empresa_id",core.nombre_normalizado("nombre"));
