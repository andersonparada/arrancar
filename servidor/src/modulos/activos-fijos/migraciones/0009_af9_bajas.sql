CREATE TABLE "activos_fijos"."bajas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"activo_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"anio_de_numero" smallint NOT NULL,
	"fecha" date NOT NULL,
	"causa" text NOT NULL,
	"descripcion" text NOT NULL,
	"autorizada_por" text NOT NULL,
	"destino_del_bien" text,
	"acta_archivo_id" uuid,
	"denuncia_archivo_id" uuid,
	"tipo_de_acta" text,
	"numero_de_denuncia" text,
	"inventario_id" uuid,
	"costo" numeric(14, 2) NOT NULL,
	"depreciacion_acumulada_contable" numeric(14, 2) NOT NULL,
	"valor_en_libros" numeric(14, 2) NOT NULL,
	"costo_fiscal" numeric(14, 2) NOT NULL,
	"base_fiscal" numeric(14, 2) NOT NULL,
	"depreciacion_acumulada_fiscal" numeric(14, 2) NOT NULL,
	"valor_fiscal_por_depreciar" numeric(14, 2) NOT NULL,
	"cuota_del_mes_contable" numeric(14, 2) DEFAULT '0' NOT NULL,
	"cuota_del_mes_fiscal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"comprador" text,
	"nit_del_comprador" text,
	"precio" numeric(14, 2),
	"iva" numeric(14, 2),
	"serie_fel" text,
	"numero_fel" text,
	"autorizacion_fel" uuid,
	"resultado_contable" numeric(14, 2),
	"resultado_fiscal" numeric(14, 2),
	"estado" text DEFAULT 'vigente' NOT NULL,
	"anulada_en" timestamp with time zone,
	"anulada_por" uuid,
	"motivo_de_anulacion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "bajas_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "bajas_causa" CHECK ("activos_fijos"."bajas"."causa" in ('venta', 'destruccion', 'robo', 'extravio', 'donacion', 'obsolescencia', 'faltante_de_inventario', 'devuelto_al_dueno', 'otra')),
	CONSTRAINT "bajas_estado" CHECK ("activos_fijos"."bajas"."estado" in ('vigente', 'anulada')),
	CONSTRAINT "bajas_descripcion" CHECK (char_length(btrim("activos_fijos"."bajas"."descripcion")) between 1 and 500),
	CONSTRAINT "bajas_autorizada_por" CHECK (char_length(btrim("activos_fijos"."bajas"."autorizada_por")) between 1 and 150),
	CONSTRAINT "bajas_destino" CHECK ("activos_fijos"."bajas"."destino_del_bien" is null or char_length(btrim("activos_fijos"."bajas"."destino_del_bien")) between 1 and 300),
	CONSTRAINT "bajas_numero_de_denuncia" CHECK ("activos_fijos"."bajas"."numero_de_denuncia" is null or char_length(btrim("activos_fijos"."bajas"."numero_de_denuncia")) between 1 and 60),
	CONSTRAINT "bajas_tipo_de_acta" CHECK ("activos_fijos"."bajas"."tipo_de_acta" is null or "activos_fijos"."bajas"."tipo_de_acta" in ('administrativa', 'notarial')),
	CONSTRAINT "bajas_acta_con_tipo" CHECK ("activos_fijos"."bajas"."acta_archivo_id" is null or "activos_fijos"."bajas"."tipo_de_acta" is not null),
	CONSTRAINT "bajas_anulacion_completa" CHECK (("activos_fijos"."bajas"."estado" = 'anulada') = ("activos_fijos"."bajas"."anulada_en" is not null and "activos_fijos"."bajas"."anulada_por" is not null and "activos_fijos"."bajas"."motivo_de_anulacion" is not null)),
	CONSTRAINT "bajas_valor_en_libros" CHECK ("activos_fijos"."bajas"."valor_en_libros" = "activos_fijos"."bajas"."costo" - "activos_fijos"."bajas"."depreciacion_acumulada_contable"),
	CONSTRAINT "bajas_valor_fiscal_por_depreciar" CHECK ("activos_fijos"."bajas"."valor_fiscal_por_depreciar" = "activos_fijos"."bajas"."base_fiscal" - "activos_fijos"."bajas"."depreciacion_acumulada_fiscal"),
	CONSTRAINT "bajas_costo_fiscal" CHECK ("activos_fijos"."bajas"."costo_fiscal" >= 0),
	CONSTRAINT "bajas_cuotas_del_mes" CHECK ("activos_fijos"."bajas"."cuota_del_mes_contable" >= 0 and "activos_fijos"."bajas"."cuota_del_mes_fiscal" >= 0),
	CONSTRAINT "bajas_venta_completa" CHECK (("activos_fijos"."bajas"."causa" = 'venta') = ("activos_fijos"."bajas"."precio" is not null and "activos_fijos"."bajas"."comprador" is not null and "activos_fijos"."bajas"."numero_fel" is not null and "activos_fijos"."bajas"."autorizacion_fel" is not null and "activos_fijos"."bajas"."resultado_contable" is not null and "activos_fijos"."bajas"."resultado_fiscal" is not null)),
	CONSTRAINT "bajas_precio_e_iva" CHECK (("activos_fijos"."bajas"."precio" is null or "activos_fijos"."bajas"."precio" > 0) and ("activos_fijos"."bajas"."iva" is null or "activos_fijos"."bajas"."iva" >= 0)),
	CONSTRAINT "bajas_resultado_contable" CHECK ("activos_fijos"."bajas"."resultado_contable" is null or "activos_fijos"."bajas"."resultado_contable" = "activos_fijos"."bajas"."precio" - "activos_fijos"."bajas"."valor_en_libros"),
	CONSTRAINT "bajas_resultado_fiscal" CHECK ("activos_fijos"."bajas"."resultado_fiscal" is null or "activos_fijos"."bajas"."resultado_fiscal" = "activos_fijos"."bajas"."precio" - ("activos_fijos"."bajas"."costo_fiscal" - "activos_fijos"."bajas"."depreciacion_acumulada_fiscal"))
);
--> statement-breakpoint
ALTER TABLE "activos_fijos"."bajas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "activos_fijos"."bajas" ADD CONSTRAINT "bajas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."bajas" ADD CONSTRAINT "bajas_acta_archivo_id_archivos_id_fk" FOREIGN KEY ("acta_archivo_id") REFERENCES "core"."archivos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."bajas" ADD CONSTRAINT "bajas_denuncia_archivo_id_archivos_id_fk" FOREIGN KEY ("denuncia_archivo_id") REFERENCES "core"."archivos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."bajas" ADD CONSTRAINT "bajas_activo_fk" FOREIGN KEY ("activo_id","empresa_id") REFERENCES "activos_fijos"."activos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bajas_vigente_unica" ON "activos_fijos"."bajas" USING btree ("activo_id") WHERE "activos_fijos"."bajas"."estado" = 'vigente';--> statement-breakpoint
CREATE UNIQUE INDEX "bajas_acta_archivo_unico" ON "activos_fijos"."bajas" USING btree ("acta_archivo_id") WHERE "activos_fijos"."bajas"."acta_archivo_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "bajas_denuncia_archivo_unico" ON "activos_fijos"."bajas" USING btree ("denuncia_archivo_id") WHERE "activos_fijos"."bajas"."denuncia_archivo_id" is not null;--> statement-breakpoint
CREATE INDEX "bajas_empresa_fecha_idx" ON "activos_fijos"."bajas" USING btree ("empresa_id","fecha");--> statement-breakpoint
CREATE INDEX "bajas_activo_idx" ON "activos_fijos"."bajas" USING btree ("activo_id");--> statement-breakpoint
CREATE INDEX "bajas_numero_idx" ON "activos_fijos"."bajas" USING btree ("empresa_id","anio_de_numero","numero");--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "activos_fijos"."bajas" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);