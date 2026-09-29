-- Nombres únicos sin importar mayúsculas, acentos ni espacios repetidos (informe de QA 2026-09-29, error 5).
-- `core.nombre_normalizado` es la regla para catálogos; `bancos.nombre_para_comparar` sigue siendo la de beneficiarios
-- (quita además formas jurídicas y conectores). Si un día cambia la regla hay que rehacer los índices que la usan.
CREATE FUNCTION "core"."nombre_normalizado"(texto text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
SET search_path = pg_catalog
AS $$
  SELECT lower(btrim(regexp_replace(translate(texto, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'), '\s+', ' ', 'g')))
$$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "core"."roles" GROUP BY "cuenta_id", core.nombre_normalizado("nombre") HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'No se puede aplicar la migración: hay roles con nombres repetidos que solo cambian en mayúsculas, acentos o espacios. Corríjalos y vuelva a migrar.';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "core"."roles" DROP CONSTRAINT "roles_nombre_por_cuenta";--> statement-breakpoint
CREATE UNIQUE INDEX "roles_nombre_por_cuenta" ON "core"."roles" USING btree ("cuenta_id",core.nombre_normalizado("nombre"));
