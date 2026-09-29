-- H4: el número de cuenta se guarda como lo escribe el usuario y una columna normalizada (sin separadores y
-- en mayúsculas) sostiene la unicidad por empresa + banco.
ALTER TABLE "bancos"."cuentas_bancarias" ADD COLUMN "numero_normalizado" text;--> statement-breakpoint
UPDATE "bancos"."cuentas_bancarias"
SET "numero_normalizado" = upper(regexp_replace("numero", '[^0-9A-Za-z]', '', 'g'));--> statement-breakpoint
DO $$
DECLARE
  repetidas text;
BEGIN
  SELECT string_agg("banco_id" || ' / ' || "numero_normalizado", '; ') INTO repetidas
  FROM (
    SELECT "banco_id", "numero_normalizado"
    FROM "bancos"."cuentas_bancarias"
    GROUP BY "empresa_id", "banco_id", "numero_normalizado"
    HAVING count(*) > 1
  ) duplicadas;
  IF repetidas IS NOT NULL THEN
    RAISE EXCEPTION 'H4: hay cuentas bancarias con el mismo número normalizado en el mismo banco y empresa (banco / número): %. Corríjalas antes de migrar.', repetidas;
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "bancos"."cuentas_bancarias" ALTER COLUMN "numero_normalizado" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "bancos"."cuentas_bancarias" DROP CONSTRAINT "cuentas_bancarias_numero_unico";--> statement-breakpoint
ALTER TABLE "bancos"."cuentas_bancarias" ADD CONSTRAINT "cuentas_bancarias_numero_por_banco_unico" UNIQUE("empresa_id","banco_id","numero_normalizado");
