ALTER TABLE "core"."auditoria" DROP CONSTRAINT "auditoria_cuenta_id_cuentas_id_fk";
--> statement-breakpoint
ALTER TABLE "core"."auditoria" ADD CONSTRAINT "auditoria_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
-- Piso legal de 5 años (Código de Comercio, art. 382): la función nunca borra
-- lo posterior a 60 meses, aunque se le pase un valor menor.
CREATE OR REPLACE FUNCTION core.depurar_auditoria(meses integer) RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = core, pg_temp
AS $$
  WITH borradas AS (
    DELETE FROM core.auditoria
    WHERE creado_en < now() - make_interval(months => greatest(meses, 60))
    RETURNING 1
  )
  SELECT count(*)::integer FROM borradas;
$$;
--> statement-breakpoint
-- El nuevo esquema exige mínimo 60: sube a 60 cualquier valor guardado menor.
UPDATE core.configuraciones
SET valor = to_jsonb(60)
WHERE clave = 'core.auditoria.meses_de_conservacion'
  AND jsonb_typeof(valor) = 'number'
  AND (valor)::numeric < 60;
