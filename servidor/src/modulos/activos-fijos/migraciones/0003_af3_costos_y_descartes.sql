CREATE TABLE "activos_fijos"."costos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"activo_id" uuid NOT NULL,
	"origen" text NOT NULL,
	"clase_de_costo" text NOT NULL,
	"documento_de_compra_id" uuid,
	"linea_de_documento_id" uuid,
	"fecha" date NOT NULL,
	"monto" numeric(14, 2) NOT NULL,
	"aplica_al_libro_fiscal" boolean DEFAULT true NOT NULL,
	"motivo_fuera_del_libro_fiscal" text,
	"no_es_edificacion" boolean DEFAULT false NOT NULL,
	"documento_de_soporte" text,
	"archivo_id" uuid,
	"descripcion" text,
	"estado" text DEFAULT 'vigente' NOT NULL,
	"anulado_en" timestamp with time zone,
	"anulado_por" uuid,
	"motivo_de_anulacion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "costos_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "costos_origen" CHECK ("activos_fijos"."costos"."origen" in ('linea_de_compra', 'manual', 'saldo_inicial')),
	CONSTRAINT "costos_clase_de_costo" CHECK ("activos_fijos"."costos"."clase_de_costo" in ('adquisicion', 'importacion', 'flete', 'instalacion', 'construccion', 'honorarios', 'desmantelamiento', 'otro', 'nota_de_credito', 'nota_de_debito')),
	CONSTRAINT "costos_estado" CHECK ("activos_fijos"."costos"."estado" in ('vigente', 'anulado')),
	CONSTRAINT "costos_monto_con_signo" CHECK ("activos_fijos"."costos"."monto" <> 0 and ("activos_fijos"."costos"."monto" < 0) = ("activos_fijos"."costos"."clase_de_costo" = 'nota_de_credito')),
	CONSTRAINT "costos_de_linea_completo" CHECK (("activos_fijos"."costos"."origen" = 'linea_de_compra') = ("activos_fijos"."costos"."linea_de_documento_id" is not null and "activos_fijos"."costos"."documento_de_compra_id" is not null)),
	CONSTRAINT "costos_linea_y_documento" CHECK (("activos_fijos"."costos"."linea_de_documento_id" is null) = ("activos_fijos"."costos"."documento_de_compra_id" is null)),
	CONSTRAINT "costos_fuera_del_libro_fiscal" CHECK ("activos_fijos"."costos"."aplica_al_libro_fiscal" = ("activos_fijos"."costos"."motivo_fuera_del_libro_fiscal" is null)),
	CONSTRAINT "costos_fuera_del_libro_solo_manual" CHECK ("activos_fijos"."costos"."aplica_al_libro_fiscal" or "activos_fijos"."costos"."origen" = 'manual'),
	CONSTRAINT "costos_manual_con_soporte" CHECK ("activos_fijos"."costos"."origen" <> 'manual' or "activos_fijos"."costos"."documento_de_soporte" is not null),
	CONSTRAINT "costos_textos_largos" CHECK (("activos_fijos"."costos"."motivo_fuera_del_libro_fiscal" is null or char_length(btrim("activos_fijos"."costos"."motivo_fuera_del_libro_fiscal")) between 1 and 300)
        and ("activos_fijos"."costos"."documento_de_soporte" is null or char_length(btrim("activos_fijos"."costos"."documento_de_soporte")) between 1 and 150)
        and ("activos_fijos"."costos"."descripcion" is null or char_length(btrim("activos_fijos"."costos"."descripcion")) between 1 and 300)),
	CONSTRAINT "costos_anulacion_completa" CHECK (("activos_fijos"."costos"."estado" = 'anulado') = ("activos_fijos"."costos"."anulado_en" is not null and "activos_fijos"."costos"."anulado_por" is not null and "activos_fijos"."costos"."motivo_de_anulacion" is not null))
);
--> statement-breakpoint
ALTER TABLE "activos_fijos"."costos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "activos_fijos"."descartes_de_lineas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"documento_de_compra_id" uuid NOT NULL,
	"linea_de_documento_id" uuid NOT NULL,
	"motivo" text NOT NULL,
	"vigente" boolean DEFAULT true NOT NULL,
	"devuelto_en" timestamp with time zone,
	"devuelto_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "descartes_de_lineas_motivo_largo" CHECK (char_length(btrim("activos_fijos"."descartes_de_lineas"."motivo")) between 1 and 300),
	CONSTRAINT "descartes_de_lineas_devolucion" CHECK ((not "activos_fijos"."descartes_de_lineas"."vigente") = ("activos_fijos"."descartes_de_lineas"."devuelto_en" is not null))
);
--> statement-breakpoint
ALTER TABLE "activos_fijos"."descartes_de_lineas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "activos_fijos"."costos" ADD CONSTRAINT "costos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."costos" ADD CONSTRAINT "costos_archivo_id_archivos_id_fk" FOREIGN KEY ("archivo_id") REFERENCES "core"."archivos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."costos" ADD CONSTRAINT "costos_activo_fk" FOREIGN KEY ("activo_id","empresa_id") REFERENCES "activos_fijos"."activos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."costos" ADD CONSTRAINT "costos_linea_fk" FOREIGN KEY ("linea_de_documento_id","documento_de_compra_id","empresa_id") REFERENCES "libro_de_compras"."lineas_de_documento"("id","documento_id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."descartes_de_lineas" ADD CONSTRAINT "descartes_de_lineas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."descartes_de_lineas" ADD CONSTRAINT "descartes_de_lineas_linea_fk" FOREIGN KEY ("linea_de_documento_id","documento_de_compra_id","empresa_id") REFERENCES "libro_de_compras"."lineas_de_documento"("id","documento_id","empresa_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "costos_activo_estado_idx" ON "activos_fijos"."costos" USING btree ("activo_id","estado");--> statement-breakpoint
CREATE INDEX "costos_linea_idx" ON "activos_fijos"."costos" USING btree ("linea_de_documento_id") WHERE "activos_fijos"."costos"."linea_de_documento_id" is not null;--> statement-breakpoint
CREATE INDEX "costos_documento_idx" ON "activos_fijos"."costos" USING btree ("documento_de_compra_id") WHERE "activos_fijos"."costos"."documento_de_compra_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "costos_archivo_unico" ON "activos_fijos"."costos" USING btree ("archivo_id") WHERE "activos_fijos"."costos"."archivo_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "costos_saldo_inicial_unico" ON "activos_fijos"."costos" USING btree ("activo_id") WHERE "activos_fijos"."costos"."origen" = 'saldo_inicial' and "activos_fijos"."costos"."estado" = 'vigente';--> statement-breakpoint
CREATE UNIQUE INDEX "descartes_de_lineas_vigente_unico" ON "activos_fijos"."descartes_de_lineas" USING btree ("linea_de_documento_id") WHERE "activos_fijos"."descartes_de_lineas"."vigente";--> statement-breakpoint
CREATE INDEX "descartes_de_lineas_documento_idx" ON "activos_fijos"."descartes_de_lineas" USING btree ("documento_de_compra_id");--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "activos_fijos"."costos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "activos_fijos"."descartes_de_lineas" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);