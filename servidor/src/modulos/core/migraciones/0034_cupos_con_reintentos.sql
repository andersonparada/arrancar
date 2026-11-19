CREATE TABLE "core"."reintentos_de_correos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"correo_saliente_id" uuid NOT NULL,
	"empresa_id" uuid DEFAULT nullif(current_setting('app.empresa_id', true), '')::uuid NOT NULL,
	"cuenta_id" uuid DEFAULT nullif(current_setting('app.cuenta_id', true), '')::uuid NOT NULL,
	"direccion" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reintentos_de_correos_direccion_larga" CHECK (char_length("core"."reintentos_de_correos"."direccion") between 3 and 254)
);
--> statement-breakpoint
ALTER TABLE "core"."reintentos_de_correos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "core"."reintentos_de_correos" ADD CONSTRAINT "reintentos_de_correos_correo_saliente_id_correos_salientes_id_fk" FOREIGN KEY ("correo_saliente_id") REFERENCES "core"."correos_salientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."reintentos_de_correos" ADD CONSTRAINT "reintentos_de_correos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."reintentos_de_correos" ADD CONSTRAINT "reintentos_de_correos_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reintentos_de_correos_cuenta_fecha_idx" ON "core"."reintentos_de_correos" USING btree ("cuenta_id","creado_en");--> statement-breakpoint
CREATE INDEX "reintentos_de_correos_fecha_idx" ON "core"."reintentos_de_correos" USING btree ("creado_en");--> statement-breakpoint
CREATE INDEX "reintentos_de_correos_cupo_idx" ON "core"."reintentos_de_correos" USING btree ("cuenta_id",lower("direccion"),"creado_en");--> statement-breakpoint
CREATE INDEX "reintentos_de_correos_correo_idx" ON "core"."reintentos_de_correos" USING btree ("correo_saliente_id");--> statement-breakpoint
CREATE INDEX "destinatarios_de_correos_cuenta_fecha_idx" ON "core"."destinatarios_de_correos" USING btree ("cuenta_id","creado_en");--> statement-breakpoint
CREATE INDEX "destinatarios_de_correos_fecha_idx" ON "core"."destinatarios_de_correos" USING btree ("creado_en");--> statement-breakpoint
CREATE POLICY "agregar_en_la_empresa" ON "core"."reintentos_de_correos" AS PERMISSIVE FOR INSERT TO "arrancar_app" WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "leer_en_la_empresa" ON "core"."reintentos_de_correos" AS PERMISSIVE FOR SELECT TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);
--> statement-breakpoint
-- Cada reintento a mano de un correo fallido vuelve a enviarlo: su marca (una por destinatario, en
-- core.reintentos_de_correos) cuenta como un destinatario más en todos los cupos. Misma firma y permisos que la 0032.
CREATE OR REPLACE FUNCTION core.reservar_cupo_de_correo(direcciones text[])
RETURNS TABLE (por_hora integer, por_dia integer, de_la_instalacion_por_hora integer, por_destinatario jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, pg_temp
SET row_security = off
AS $$
#variable_conflict use_column
DECLARE
  la_cuenta uuid := nullif(current_setting('app.cuenta_id', true), '')::uuid;
BEGIN
  IF la_cuenta IS NULL THEN
    RAISE EXCEPTION 'No hay una cuenta en la transacción.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF coalesce(cardinality(direcciones), 0) > 10 THEN
    RAISE EXCEPTION 'Se pueden consultar como máximo 10 direcciones.' USING ERRCODE = 'program_limit_exceeded';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('core.correo:' || la_cuenta::text, 0));
  RETURN QUERY
    SELECT
      (SELECT count(*)::integer FROM core.destinatarios_de_correos d
        WHERE d.cuenta_id = la_cuenta AND d.creado_en > now() - interval '1 hour')
      + (SELECT count(*)::integer FROM core.reintentos_de_correos r
        WHERE r.cuenta_id = la_cuenta AND r.creado_en > now() - interval '1 hour'),
      (SELECT count(*)::integer FROM core.destinatarios_de_correos d
        WHERE d.cuenta_id = la_cuenta AND d.creado_en > now() - interval '1 day')
      + (SELECT count(*)::integer FROM core.reintentos_de_correos r
        WHERE r.cuenta_id = la_cuenta AND r.creado_en > now() - interval '1 day'),
      (SELECT count(*)::integer FROM core.destinatarios_de_correos d
        WHERE d.creado_en > now() - interval '1 hour')
      + (SELECT count(*)::integer FROM core.reintentos_de_correos r
        WHERE r.creado_en > now() - interval '1 hour'),
      coalesce((
        SELECT jsonb_object_agg(pedida.direccion, (
          (SELECT count(*)::integer FROM core.destinatarios_de_correos d
            WHERE d.cuenta_id = la_cuenta AND lower(d.direccion) = pedida.direccion
              AND d.creado_en > now() - interval '1 day')
          + (SELECT count(*)::integer FROM core.reintentos_de_correos r
            WHERE r.cuenta_id = la_cuenta AND lower(r.direccion) = pedida.direccion
              AND r.creado_en > now() - interval '1 day')))
        FROM (SELECT DISTINCT lower(x) AS direccion FROM unnest(direcciones) AS x WHERE x IS NOT NULL) pedida
      ), '{}'::jsonb);
END;
$$;
