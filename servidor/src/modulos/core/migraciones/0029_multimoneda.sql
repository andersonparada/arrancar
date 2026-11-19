CREATE TABLE "core"."consultas_al_banguat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"iniciada_en" timestamp with time zone NOT NULL,
	"terminada_en" timestamp with time zone NOT NULL,
	"operacion" text NOT NULL,
	"vuelta" text NOT NULL,
	"moneda" char(3),
	"codigo_banguat" smallint,
	"desde" date,
	"hasta" date,
	"resultado" text NOT NULL,
	"filas_nuevas" smallint DEFAULT 0 NOT NULL,
	"filas_rechazadas" smallint DEFAULT 0 NOT NULL,
	"detalle" text,
	"disparada_por" uuid,
	CONSTRAINT "consultas_al_banguat_operacion_valida" CHECK ("core"."consultas_al_banguat"."operacion" in ('TipoCambioDia', 'TipoCambioRango', 'TipoCambioRangoMoneda', 'TipoCambioFechaInicialMoneda', 'VariablesDisponibles')),
	CONSTRAINT "consultas_al_banguat_vuelta_valida" CHECK ("core"."consultas_al_banguat"."vuelta" in ('madrugada', 'manana', 'noche', 'arranque', 'relleno', 'manual', 'lista', 'muestra')),
	CONSTRAINT "consultas_al_banguat_resultado_valido" CHECK ("core"."consultas_al_banguat"."resultado" in ('exito', 'sin_datos', 'error', 'valor_fuera_de_rango', 'valor_ambiguo', 'variacion_excesiva')),
	CONSTRAINT "consultas_al_banguat_detalle_corto" CHECK ("core"."consultas_al_banguat"."detalle" is null or char_length("core"."consultas_al_banguat"."detalle") <= 500)
);
--> statement-breakpoint
ALTER TABLE "core"."consultas_al_banguat" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "core"."monedas_del_banguat" (
	"codigo" smallint PRIMARY KEY NOT NULL,
	"descripcion" text NOT NULL,
	"disponible" boolean DEFAULT true NOT NULL,
	"vista_por_primera_vez" timestamp with time zone DEFAULT now() NOT NULL,
	"vista_por_ultima_vez" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monedas_del_banguat_codigo_positivo" CHECK ("core"."monedas_del_banguat"."codigo" > 0),
	CONSTRAINT "monedas_del_banguat_descripcion_valida" CHECK (char_length("core"."monedas_del_banguat"."descripcion") between 1 and 120)
);
--> statement-breakpoint
CREATE TABLE "core"."tipos_de_cambio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"moneda" char(3) NOT NULL,
	"fecha" date NOT NULL,
	"referencia" numeric(16, 8) NOT NULL,
	"compra" numeric(16, 8),
	"venta" numeric(16, 8),
	"origen" text NOT NULL,
	"codigo_banguat" smallint,
	"consulta_id" uuid,
	"motivo" text,
	"registrado_por" uuid,
	"registrado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tipos_de_cambio_no_gtq" CHECK ("core"."tipos_de_cambio"."moneda" <> 'GTQ'),
	CONSTRAINT "tipos_de_cambio_referencia_positiva" CHECK ("core"."tipos_de_cambio"."referencia" > 0),
	CONSTRAINT "tipos_de_cambio_compra_venta_positivas" CHECK (("core"."tipos_de_cambio"."compra" is null or "core"."tipos_de_cambio"."compra" > 0) and ("core"."tipos_de_cambio"."venta" is null or "core"."tipos_de_cambio"."venta" > 0)),
	CONSTRAINT "tipos_de_cambio_origen_valido" CHECK ("core"."tipos_de_cambio"."origen" in ('banguat', 'manual')),
	CONSTRAINT "tipos_de_cambio_manual_completo" CHECK ("core"."tipos_de_cambio"."origen" <> 'manual' or ("core"."tipos_de_cambio"."motivo" is not null and "core"."tipos_de_cambio"."registrado_por" is not null)),
	CONSTRAINT "tipos_de_cambio_motivo_valido" CHECK ("core"."tipos_de_cambio"."motivo" is null or (char_length("core"."tipos_de_cambio"."motivo") between 1 and 300 and "core"."tipos_de_cambio"."motivo" = btrim("core"."tipos_de_cambio"."motivo"))),
	CONSTRAINT "tipos_de_cambio_banguat_con_consulta" CHECK ("core"."tipos_de_cambio"."origen" <> 'banguat' or "core"."tipos_de_cambio"."consulta_id" is not null),
	CONSTRAINT "tipos_de_cambio_banguat_con_codigo" CHECK ("core"."tipos_de_cambio"."origen" <> 'banguat' or "core"."tipos_de_cambio"."codigo_banguat" is not null)
);
--> statement-breakpoint
ALTER TABLE "core"."tipos_de_cambio" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "core"."monedas" ADD COLUMN "activa" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."monedas" ADD COLUMN "codigo_banguat" smallint;--> statement-breakpoint
ALTER TABLE "core"."monedas" ADD COLUMN "letras_singular" text;--> statement-breakpoint
ALTER TABLE "core"."monedas" ADD COLUMN "letras_plural" text;--> statement-breakpoint
ALTER TABLE "core"."consultas_al_banguat" ADD CONSTRAINT "consultas_al_banguat_moneda_monedas_codigo_fk" FOREIGN KEY ("moneda") REFERENCES "core"."monedas"("codigo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."consultas_al_banguat" ADD CONSTRAINT "consultas_al_banguat_disparada_por_usuarios_id_fk" FOREIGN KEY ("disparada_por") REFERENCES "core"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."tipos_de_cambio" ADD CONSTRAINT "tipos_de_cambio_moneda_monedas_codigo_fk" FOREIGN KEY ("moneda") REFERENCES "core"."monedas"("codigo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."tipos_de_cambio" ADD CONSTRAINT "tipos_de_cambio_codigo_banguat_monedas_del_banguat_codigo_fk" FOREIGN KEY ("codigo_banguat") REFERENCES "core"."monedas_del_banguat"("codigo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."tipos_de_cambio" ADD CONSTRAINT "tipos_de_cambio_consulta_id_consultas_al_banguat_id_fk" FOREIGN KEY ("consulta_id") REFERENCES "core"."consultas_al_banguat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."tipos_de_cambio" ADD CONSTRAINT "tipos_de_cambio_registrado_por_usuarios_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "core"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consultas_al_banguat_fecha_idx" ON "core"."consultas_al_banguat" USING btree ("iniciada_en" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "consultas_al_banguat_moneda_idx" ON "core"."consultas_al_banguat" USING btree ("moneda","iniciada_en" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "consultas_al_banguat_usuario_idx" ON "core"."consultas_al_banguat" USING btree ("disparada_por");--> statement-breakpoint
CREATE INDEX "tipos_de_cambio_vigente_idx" ON "core"."tipos_de_cambio" USING btree ("moneda","fecha" DESC NULLS LAST,"registrado_en" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "tipos_de_cambio_banguat_unico" ON "core"."tipos_de_cambio" USING btree ("moneda","fecha") WHERE "core"."tipos_de_cambio"."origen" = 'banguat';--> statement-breakpoint
CREATE INDEX "tipos_de_cambio_consulta_idx" ON "core"."tipos_de_cambio" USING btree ("consulta_id");--> statement-breakpoint
CREATE INDEX "tipos_de_cambio_codigo_banguat_idx" ON "core"."tipos_de_cambio" USING btree ("codigo_banguat");--> statement-breakpoint
CREATE INDEX "tipos_de_cambio_usuario_idx" ON "core"."tipos_de_cambio" USING btree ("registrado_por");--> statement-breakpoint
ALTER TABLE "core"."monedas" ADD CONSTRAINT "monedas_codigo_banguat_monedas_del_banguat_codigo_fk" FOREIGN KEY ("codigo_banguat") REFERENCES "core"."monedas_del_banguat"("codigo") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."monedas" ADD CONSTRAINT "monedas_codigo_banguat_unico" UNIQUE("codigo_banguat");--> statement-breakpoint
ALTER TABLE "core"."monedas" ADD CONSTRAINT "monedas_decimales_validos" CHECK ("core"."monedas"."decimales" between 0 and 4);--> statement-breakpoint
ALTER TABLE "core"."monedas" ADD CONSTRAINT "monedas_activa_con_dos_decimales" CHECK (not "core"."monedas"."activa" or "core"."monedas"."decimales" = 2);--> statement-breakpoint
ALTER TABLE "core"."monedas" ADD CONSTRAINT "monedas_letras_completas" CHECK (("core"."monedas"."letras_singular" is null) = ("core"."monedas"."letras_plural" is null));--> statement-breakpoint
ALTER TABLE "core"."monedas" ADD CONSTRAINT "monedas_gtq_sin_codigo" CHECK ("core"."monedas"."codigo" <> 'GTQ' or "core"."monedas"."codigo_banguat" is null);--> statement-breakpoint
CREATE POLICY "agregar_en_la_instalacion" ON "core"."consultas_al_banguat" AS PERMISSIVE FOR INSERT TO "arrancar_app" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "leer_en_la_instalacion" ON "core"."consultas_al_banguat" AS PERMISSIVE FOR SELECT TO "arrancar_app" USING (true);--> statement-breakpoint
CREATE POLICY "agregar_en_la_instalacion" ON "core"."tipos_de_cambio" AS PERMISSIVE FOR INSERT TO "arrancar_app" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "leer_en_la_instalacion" ON "core"."tipos_de_cambio" AS PERMISSIVE FOR SELECT TO "arrancar_app" USING (true);--> statement-breakpoint
-- MM-1 (docs/modulos/diseno-multimoneda.md, adenda A.3 y A.4): datos. Solo el dólar nace con su código del Banguat
-- (el 2); la primera actualización de la lista corrige su descripción.
INSERT INTO "core"."monedas_del_banguat" ("codigo", "descripcion") VALUES (2, 'Dólares de EE.UU.');--> statement-breakpoint
UPDATE "core"."monedas" SET "activa" = true, "letras_singular" = 'QUETZAL', "letras_plural" = 'QUETZALES' WHERE "codigo" = 'GTQ';--> statement-breakpoint
UPDATE "core"."monedas" SET "activa" = true, "codigo_banguat" = 2, "letras_singular" = 'DÓLAR', "letras_plural" = 'DÓLARES' WHERE "codigo" = 'USD';--> statement-breakpoint
-- Las monedas de la lista pública del Banguat (menos DEG, bolívares y colón salvadoreño), inactivas y sin código:
-- el selector de Monedas solo las une con su código; en la versión 1 no se crean monedas desde la pantalla.
INSERT INTO "core"."monedas" ("codigo", "nombre", "simbolo", "decimales") VALUES
  ('EUR', 'Euro', '€', 2),
  ('GBP', 'Libra esterlina', '£', 2),
  ('CHF', 'Franco suizo', 'CHF', 2),
  ('CAD', 'Dólar canadiense', 'CA$', 2),
  ('MXN', 'Peso mexicano', 'MX$', 2),
  ('JPY', 'Yen japonés', 'JP¥', 0),
  ('HNL', 'Lempira', 'L', 2),
  ('NIO', 'Córdoba', 'C$', 2),
  ('CRC', 'Colón costarricense', '₡', 2),
  ('DKK', 'Corona danesa', 'DKK', 2),
  ('NOK', 'Corona noruega', 'NOK', 2),
  ('SEK', 'Corona sueca', 'SEK', 2),
  ('ARS', 'Peso argentino', 'AR$', 2),
  ('BRL', 'Real brasileño', 'R$', 2),
  ('KRW', 'Won surcoreano', '₩', 0),
  ('HKD', 'Dólar de Hong Kong', 'HK$', 2),
  ('TWD', 'Nuevo dólar taiwanés', 'NT$', 2),
  ('CNY', 'Yuan renminbi', 'CN¥', 2),
  ('PKR', 'Rupia pakistaní', 'PKR', 2),
  ('INR', 'Rupia india', '₹', 2),
  ('COP', 'Peso colombiano', 'COL$', 2),
  ('DOP', 'Peso dominicano', 'RD$', 2),
  ('MYR', 'Ringgit malayo', 'RM', 2)
ON CONFLICT ("codigo") DO NOTHING;--> statement-breakpoint
-- Código estable (A-2): una moneda con tipos cargados del Banguat solo puede quedar con el mismo código que los cargó
-- o sin código; otro mezclaría dos series. Vale también para el dueño de la base.
CREATE FUNCTION core.monedas_codigo_banguat_estable() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.codigo_banguat IS NOT NULL AND EXISTS (
    SELECT 1 FROM core.tipos_de_cambio t
    WHERE t.moneda = NEW.codigo AND t.origen = 'banguat' AND t.codigo_banguat <> NEW.codigo_banguat
  ) THEN
    RAISE EXCEPTION 'La moneda % ya tiene tipos de cambio cargados con otro código del Banguat', NEW.codigo
      USING ERRCODE = 'check_violation', CONSTRAINT = 'monedas_codigo_banguat_estable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER monedas_codigo_banguat_estable
BEFORE UPDATE OF codigo_banguat ON core.monedas
FOR EACH ROW EXECUTE FUNCTION core.monedas_codigo_banguat_estable();