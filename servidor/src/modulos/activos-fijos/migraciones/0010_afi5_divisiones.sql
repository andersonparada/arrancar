CREATE TABLE "activos_fijos"."divisiones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"activo_origen_id" uuid NOT NULL,
	"activo_nuevo_id" uuid,
	"codigo_del_activo_nuevo" text NOT NULL,
	"fecha" date NOT NULL,
	"periodo" date NOT NULL,
	"cantidad_original" integer NOT NULL,
	"cantidad_separada" integer NOT NULL,
	"causa" text NOT NULL,
	"motivo" text NOT NULL,
	"costo_separado" numeric(14, 2) NOT NULL,
	"costo_fiscal_separado" numeric(14, 2) NOT NULL,
	"acumulada_contable_separada" numeric(14, 2) NOT NULL,
	"acumulada_fiscal_separada" numeric(14, 2) NOT NULL,
	"residual_separado" numeric(14, 2) NOT NULL,
	"estado" text DEFAULT 'vigente' NOT NULL,
	"anulado_en" timestamp with time zone,
	"anulado_por" uuid,
	"motivo_de_anulacion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "divisiones_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "divisiones_estado" CHECK ("activos_fijos"."divisiones"."estado" in ('vigente', 'anulada')),
	CONSTRAINT "divisiones_causa" CHECK ("activos_fijos"."divisiones"."causa" in ('manual', 'traslado', 'baja', 'inventario', 'separar_en_unidades')),
	CONSTRAINT "divisiones_primer_dia" CHECK (extract(day from "activos_fijos"."divisiones"."periodo") = 1),
	CONSTRAINT "divisiones_cantidades" CHECK ("activos_fijos"."divisiones"."cantidad_separada" >= 1 and "activos_fijos"."divisiones"."cantidad_separada" < "activos_fijos"."divisiones"."cantidad_original"),
	CONSTRAINT "divisiones_nuevo_requerido" CHECK ("activos_fijos"."divisiones"."estado" = 'anulada' or "activos_fijos"."divisiones"."activo_nuevo_id" is not null),
	CONSTRAINT "divisiones_nuevo_distinto" CHECK ("activos_fijos"."divisiones"."activo_nuevo_id" <> "activos_fijos"."divisiones"."activo_origen_id"),
	CONSTRAINT "divisiones_textos" CHECK (char_length(btrim("activos_fijos"."divisiones"."codigo_del_activo_nuevo")) between 1 and 30 and char_length(btrim("activos_fijos"."divisiones"."motivo")) between 1 and 300),
	CONSTRAINT "divisiones_anulacion_completa" CHECK (("activos_fijos"."divisiones"."estado" = 'anulada') = ("activos_fijos"."divisiones"."anulado_en" is not null and "activos_fijos"."divisiones"."anulado_por" is not null and "activos_fijos"."divisiones"."motivo_de_anulacion" is not null)),
	CONSTRAINT "divisiones_montos" CHECK ("activos_fijos"."divisiones"."costo_separado" >= 0 and "activos_fijos"."divisiones"."costo_fiscal_separado" >= 0 and "activos_fijos"."divisiones"."costo_fiscal_separado" <= "activos_fijos"."divisiones"."costo_separado"
        and "activos_fijos"."divisiones"."acumulada_contable_separada" >= 0 and "activos_fijos"."divisiones"."acumulada_fiscal_separada" >= 0 and "activos_fijos"."divisiones"."residual_separado" >= 0),
	CONSTRAINT "divisiones_acumuladas" CHECK ("activos_fijos"."divisiones"."acumulada_contable_separada" <= "activos_fijos"."divisiones"."costo_separado" and "activos_fijos"."divisiones"."acumulada_fiscal_separada" <= "activos_fijos"."divisiones"."costo_fiscal_separado")
);
--> statement-breakpoint
ALTER TABLE "activos_fijos"."divisiones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "activos_fijos"."costos" DROP CONSTRAINT "costos_origen";--> statement-breakpoint
ALTER TABLE "activos_fijos"."costos" DROP CONSTRAINT "costos_clase_de_costo";--> statement-breakpoint
ALTER TABLE "activos_fijos"."costos" DROP CONSTRAINT "costos_monto_con_signo";--> statement-breakpoint
ALTER TABLE "activos_fijos"."costos" DROP CONSTRAINT "costos_fuera_del_libro_solo_manual";--> statement-breakpoint
ALTER TABLE "activos_fijos"."costos" ADD COLUMN "division_id" uuid;--> statement-breakpoint
ALTER TABLE "activos_fijos"."tramos" ADD COLUMN "division_id" uuid;--> statement-breakpoint
ALTER TABLE "activos_fijos"."divisiones" ADD CONSTRAINT "divisiones_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."divisiones" ADD CONSTRAINT "divisiones_origen_fk" FOREIGN KEY ("activo_origen_id","empresa_id") REFERENCES "activos_fijos"."activos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."divisiones" ADD CONSTRAINT "divisiones_nuevo_fk" FOREIGN KEY ("activo_nuevo_id","empresa_id") REFERENCES "activos_fijos"."activos"("id","empresa_id") ON DELETE SET NULL ("activo_nuevo_id") ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "divisiones_nuevo_unico" ON "activos_fijos"."divisiones" USING btree ("activo_nuevo_id") WHERE "activos_fijos"."divisiones"."activo_nuevo_id" is not null;--> statement-breakpoint
CREATE INDEX "divisiones_origen_idx" ON "activos_fijos"."divisiones" USING btree ("activo_origen_id");--> statement-breakpoint
CREATE INDEX "divisiones_periodo_idx" ON "activos_fijos"."divisiones" USING btree ("empresa_id","periodo") WHERE "activos_fijos"."divisiones"."estado" = 'vigente';--> statement-breakpoint
ALTER TABLE "activos_fijos"."costos" ADD CONSTRAINT "costos_division_fk" FOREIGN KEY ("division_id","empresa_id") REFERENCES "activos_fijos"."divisiones"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."tramos" ADD CONSTRAINT "tramos_division_fk" FOREIGN KEY ("division_id","empresa_id") REFERENCES "activos_fijos"."divisiones"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "costos_division_idx" ON "activos_fijos"."costos" USING btree ("division_id") WHERE "activos_fijos"."costos"."division_id" is not null;--> statement-breakpoint
CREATE INDEX "tramos_division_idx" ON "activos_fijos"."tramos" USING btree ("division_id") WHERE "activos_fijos"."tramos"."division_id" is not null;--> statement-breakpoint
ALTER TABLE "activos_fijos"."costos" ADD CONSTRAINT "costos_de_division_completo" CHECK (("activos_fijos"."costos"."origen" = 'division') = ("activos_fijos"."costos"."division_id" is not null));--> statement-breakpoint
ALTER TABLE "activos_fijos"."costos" ADD CONSTRAINT "costos_clase_de_division" CHECK (("activos_fijos"."costos"."origen" = 'division') = ("activos_fijos"."costos"."clase_de_costo" in ('division_cedida', 'division_recibida')));--> statement-breakpoint
ALTER TABLE "activos_fijos"."costos" ADD CONSTRAINT "costos_origen" CHECK ("activos_fijos"."costos"."origen" in ('linea_de_compra', 'manual', 'saldo_inicial', 'division'));--> statement-breakpoint
ALTER TABLE "activos_fijos"."costos" ADD CONSTRAINT "costos_clase_de_costo" CHECK ("activos_fijos"."costos"."clase_de_costo" in ('adquisicion', 'importacion', 'flete', 'instalacion', 'construccion', 'honorarios', 'desmantelamiento', 'otro', 'nota_de_credito', 'nota_de_debito', 'division_cedida', 'division_recibida'));--> statement-breakpoint
ALTER TABLE "activos_fijos"."costos" ADD CONSTRAINT "costos_monto_con_signo" CHECK ("activos_fijos"."costos"."monto" <> 0 and ("activos_fijos"."costos"."monto" < 0) = ("activos_fijos"."costos"."clase_de_costo" in ('nota_de_credito', 'division_cedida')));--> statement-breakpoint
ALTER TABLE "activos_fijos"."costos" ADD CONSTRAINT "costos_fuera_del_libro_solo_manual" CHECK ("activos_fijos"."costos"."aplica_al_libro_fiscal" or "activos_fijos"."costos"."origen" in ('manual', 'division'));--> statement-breakpoint
ALTER TABLE "activos_fijos"."tramos" ADD CONSTRAINT "tramos_de_division" CHECK (("activos_fijos"."tramos"."causa" = 'division') = ("activos_fijos"."tramos"."division_id" is not null));--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "activos_fijos"."divisiones" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
-- AFI-5: una división cambia la base de depreciación mientras el bien exista: su auditoría no se depura mientras exista la
-- empresa (catálogo de la migración 0024 del core).
INSERT INTO "core"."recursos_de_auditoria_permanente" ("recurso", "motivo")
VALUES
  ('activos-fijos.divisiones', 'Documentos de costo mientras se deprecia el bien, más la prescripción (Código Tributario arts. 112 "A" y 47; ISR art. 26)')
ON CONFLICT DO NOTHING;
