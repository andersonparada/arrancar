DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "bancos"."bancos" GROUP BY "empresa_id", core.nombre_normalizado("nombre") HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'No se puede aplicar la migración: hay bancos con nombres repetidos que solo cambian en mayúsculas, acentos o espacios. Corríjalos y vuelva a migrar.';
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "bancos"."conceptos" GROUP BY "empresa_id", core.nombre_normalizado("nombre") HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'No se puede aplicar la migración: hay conceptos con nombres repetidos que solo cambian en mayúsculas, acentos o espacios. Corríjalos y vuelva a migrar.';
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "bancos"."cuentas_bancarias" GROUP BY "empresa_id", core.nombre_normalizado("nombre") HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'No se puede aplicar la migración: hay cuentas bancarias con nombres repetidos que solo cambian en mayúsculas, acentos o espacios. Corríjalos y vuelva a migrar.';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "bancos"."bancos" DROP CONSTRAINT "bancos_nombre_unico";--> statement-breakpoint
ALTER TABLE "bancos"."conceptos" DROP CONSTRAINT "conceptos_nombre_unico";--> statement-breakpoint
ALTER TABLE "bancos"."cuentas_bancarias" DROP CONSTRAINT "cuentas_bancarias_nombre_unico";--> statement-breakpoint
CREATE UNIQUE INDEX "bancos_nombre_unico" ON "bancos"."bancos" USING btree ("empresa_id",core.nombre_normalizado("nombre"));--> statement-breakpoint
CREATE UNIQUE INDEX "conceptos_nombre_unico" ON "bancos"."conceptos" USING btree ("empresa_id",core.nombre_normalizado("nombre"));--> statement-breakpoint
CREATE UNIQUE INDEX "cuentas_bancarias_nombre_unico" ON "bancos"."cuentas_bancarias" USING btree ("empresa_id",core.nombre_normalizado("nombre"));

--> statement-breakpoint
-- Los inversos de una transferencia anulada llevan la transferencia de su original (no son notas sueltas ni llevan número).
UPDATE "bancos"."movimientos" AS inverso
SET "transferencia_id" = original."transferencia_id", "numero" = NULL
FROM "bancos"."movimientos" AS original
WHERE inverso."revierte_a_id" = original."id" AND original."transferencia_id" IS NOT NULL AND inverso."transferencia_id" IS NULL;
