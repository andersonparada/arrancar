CREATE TABLE "libro_de_compras"."dte_recibidos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"cuenta_id" uuid DEFAULT nullif(current_setting('app.cuenta_id', true), '')::uuid NOT NULL,
	"autorizacion_fel" uuid NOT NULL,
	"tipo_dte" text NOT NULL,
	"serie" text NOT NULL,
	"numero" text NOT NULL,
	"fecha_emision" date NOT NULL,
	"nit_emisor" text NOT NULL,
	"nombre_emisor" text NOT NULL,
	"nit_receptor" text NOT NULL,
	"total" numeric(14, 2) NOT NULL,
	"iva" numeric(14, 2) NOT NULL,
	"idp" numeric(14, 2) DEFAULT '0' NOT NULL,
	"otros_impuestos" numeric(14, 2) DEFAULT '0' NOT NULL,
	"otros_impuestos_detalle" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"fila_original" jsonb NOT NULL,
	"estado_sat" text NOT NULL,
	"anulado_en_la_sat_el" date,
	"lote_id" uuid NOT NULL,
	"primer_lote_id" uuid NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"documento_id" uuid,
	"motivo_de_descarte" text,
	"descartado_en" timestamp with time zone,
	"descartado_por" uuid,
	"motivo_de_bloqueo" text,
	"proveedor_id" uuid,
	"concepto_id" uuid,
	"destino" text,
	"fecha_recepcion" date,
	"periodo" date,
	"no_vinculado" boolean DEFAULT false NOT NULL,
	"documento_afectado_id" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "dte_recibidos_autorizacion_unica" UNIQUE("empresa_id","autorizacion_fel"),
	CONSTRAINT "dte_recibidos_tipo_dte_valido" CHECK ("libro_de_compras"."dte_recibidos"."tipo_dte" in ('FACT', 'FCAM', 'FPEQ', 'FCAP', 'FAPE', 'FCPE', 'FACA', 'FCCA', 'FAAE', 'FCAE', 'FARP', 'FCRP', 'FPEC', 'FCPC', 'FESP', 'NCRE', 'NDEB', 'RECI', 'RDON')),
	CONSTRAINT "dte_recibidos_serie_valida" CHECK (char_length(btrim("libro_de_compras"."dte_recibidos"."serie")) between 1 and 40 and btrim("libro_de_compras"."dte_recibidos"."serie") = upper(btrim("libro_de_compras"."dte_recibidos"."serie")) and btrim("libro_de_compras"."dte_recibidos"."serie") !~ '\s'),
	CONSTRAINT "dte_recibidos_numero_valido" CHECK (char_length(btrim("libro_de_compras"."dte_recibidos"."numero")) between 1 and 40 and btrim("libro_de_compras"."dte_recibidos"."numero") = upper(btrim("libro_de_compras"."dte_recibidos"."numero")) and btrim("libro_de_compras"."dte_recibidos"."numero") !~ '\s'),
	CONSTRAINT "dte_recibidos_nit_emisor_valido" CHECK ("libro_de_compras"."dte_recibidos"."nit_emisor" ~ '^[0-9]{1,12}[0-9K]$'),
	CONSTRAINT "dte_recibidos_nit_receptor_valido" CHECK ("libro_de_compras"."dte_recibidos"."nit_receptor" ~ '^[0-9]{1,12}[0-9K]$'),
	CONSTRAINT "dte_recibidos_nombre_emisor_largo" CHECK (char_length(btrim("libro_de_compras"."dte_recibidos"."nombre_emisor")) between 1 and 200),
	CONSTRAINT "dte_recibidos_total_positivo" CHECK ("libro_de_compras"."dte_recibidos"."total" > 0),
	CONSTRAINT "dte_recibidos_iva_no_negativo" CHECK ("libro_de_compras"."dte_recibidos"."iva" >= 0),
	CONSTRAINT "dte_recibidos_idp_no_negativo" CHECK ("libro_de_compras"."dte_recibidos"."idp" >= 0),
	CONSTRAINT "dte_recibidos_otros_impuestos_no_negativo" CHECK ("libro_de_compras"."dte_recibidos"."otros_impuestos" >= 0),
	CONSTRAINT "dte_recibidos_otros_impuestos_cuadran" CHECK ("libro_de_compras"."dte_recibidos"."idp" + "libro_de_compras"."dte_recibidos"."iva" + "libro_de_compras"."dte_recibidos"."otros_impuestos" <= "libro_de_compras"."dte_recibidos"."total"),
	CONSTRAINT "dte_recibidos_fila_original_chica" CHECK (pg_column_size("libro_de_compras"."dte_recibidos"."fila_original") <= 16384),
	CONSTRAINT "dte_recibidos_estado_sat_valido" CHECK ("libro_de_compras"."dte_recibidos"."estado_sat" in ('vigente', 'anulado')),
	CONSTRAINT "dte_recibidos_anulado_con_fecha" CHECK (("libro_de_compras"."dte_recibidos"."estado_sat" = 'anulado') = ("libro_de_compras"."dte_recibidos"."anulado_en_la_sat_el" is not null)),
	CONSTRAINT "dte_recibidos_estado_valido" CHECK ("libro_de_compras"."dte_recibidos"."estado" in ('pendiente', 'registrado', 'descartado', 'bloqueado')),
	CONSTRAINT "dte_recibidos_registrado_con_documento" CHECK (("libro_de_compras"."dte_recibidos"."estado" = 'registrado') = ("libro_de_compras"."dte_recibidos"."documento_id" is not null)),
	CONSTRAINT "dte_recibidos_descarte_completo" CHECK (("libro_de_compras"."dte_recibidos"."estado" = 'descartado') = ("libro_de_compras"."dte_recibidos"."motivo_de_descarte" is not null and "libro_de_compras"."dte_recibidos"."descartado_en" is not null and "libro_de_compras"."dte_recibidos"."descartado_por" is not null)),
	CONSTRAINT "dte_recibidos_motivo_de_descarte_largo" CHECK ("libro_de_compras"."dte_recibidos"."motivo_de_descarte" is null or char_length(btrim("libro_de_compras"."dte_recibidos"."motivo_de_descarte")) between 1 and 300),
	CONSTRAINT "dte_recibidos_bloqueo_con_motivo" CHECK (("libro_de_compras"."dte_recibidos"."estado" = 'bloqueado') = ("libro_de_compras"."dte_recibidos"."motivo_de_bloqueo" is not null)),
	CONSTRAINT "dte_recibidos_motivo_de_bloqueo_valido" CHECK ("libro_de_compras"."dte_recibidos"."motivo_de_bloqueo" is null or "libro_de_compras"."dte_recibidos"."motivo_de_bloqueo" in ('registrado_en_otra_empresa')),
	CONSTRAINT "dte_recibidos_destino_valido" CHECK ("libro_de_compras"."dte_recibidos"."destino" is null or "libro_de_compras"."dte_recibidos"."destino" in ('cuentas-por-pagar', 'caja-chica', 'cuentas-por-liquidar')),
	CONSTRAINT "dte_recibidos_fechas_ordenadas" CHECK ("libro_de_compras"."dte_recibidos"."fecha_recepcion" is null or "libro_de_compras"."dte_recibidos"."fecha_recepcion" >= "libro_de_compras"."dte_recibidos"."fecha_emision"),
	CONSTRAINT "dte_recibidos_periodo_valido" CHECK ("libro_de_compras"."dte_recibidos"."periodo" is null or (extract(day from "libro_de_compras"."dte_recibidos"."periodo") = 1 and "libro_de_compras"."dte_recibidos"."periodo" >= date_trunc('month', "libro_de_compras"."dte_recibidos"."fecha_emision")::date)),
	CONSTRAINT "dte_recibidos_nota_con_factura" CHECK ("libro_de_compras"."dte_recibidos"."documento_afectado_id" is null or "libro_de_compras"."dte_recibidos"."tipo_dte" in ('NCRE', 'NDEB'))
);
--> statement-breakpoint
ALTER TABLE "libro_de_compras"."dte_recibidos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "libro_de_compras"."lotes_de_dte" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"proposito" text NOT NULL,
	"formato" text NOT NULL,
	"nombre_del_archivo" text NOT NULL,
	"sha256" char(64) NOT NULL,
	"tamano_en_bytes" integer NOT NULL,
	"version_del_mapa" text NOT NULL,
	"emision_desde" date,
	"emision_hasta" date,
	"filas_leidas" integer NOT NULL,
	"filas_nuevas" integer NOT NULL,
	"filas_actualizadas" integer NOT NULL,
	"filas_sin_cambio" integer NOT NULL,
	"filas_rechazadas" integer NOT NULL,
	"anuladas_en_la_sat" integer NOT NULL,
	"rechazos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"encabezados_no_reconocidos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"resumen_de_conciliacion" jsonb,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "lotes_de_dte_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "lotes_de_dte_proposito_valido" CHECK ("libro_de_compras"."lotes_de_dte"."proposito" in ('bandeja', 'conciliacion')),
	CONSTRAINT "lotes_de_dte_formato_valido" CHECK ("libro_de_compras"."lotes_de_dte"."formato" in ('xlsx', 'csv')),
	CONSTRAINT "lotes_de_dte_nombre_largo" CHECK (char_length(btrim("libro_de_compras"."lotes_de_dte"."nombre_del_archivo")) between 1 and 200),
	CONSTRAINT "lotes_de_dte_sha256_valido" CHECK ("libro_de_compras"."lotes_de_dte"."sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "lotes_de_dte_tamano_positivo" CHECK ("libro_de_compras"."lotes_de_dte"."tamano_en_bytes" > 0),
	CONSTRAINT "lotes_de_dte_emision_ordenada" CHECK (("libro_de_compras"."lotes_de_dte"."emision_desde" is null) = ("libro_de_compras"."lotes_de_dte"."emision_hasta" is null) and ("libro_de_compras"."lotes_de_dte"."emision_hasta" is null or "libro_de_compras"."lotes_de_dte"."emision_hasta" >= "libro_de_compras"."lotes_de_dte"."emision_desde")),
	CONSTRAINT "lotes_de_dte_filas_no_negativas" CHECK ("libro_de_compras"."lotes_de_dte"."filas_leidas" >= 0 and "libro_de_compras"."lotes_de_dte"."filas_nuevas" >= 0 and "libro_de_compras"."lotes_de_dte"."filas_actualizadas" >= 0 and "libro_de_compras"."lotes_de_dte"."filas_sin_cambio" >= 0 and "libro_de_compras"."lotes_de_dte"."filas_rechazadas" >= 0 and "libro_de_compras"."lotes_de_dte"."anuladas_en_la_sat" >= 0),
	CONSTRAINT "lotes_de_dte_filas_cuadran" CHECK ("libro_de_compras"."lotes_de_dte"."filas_leidas" = "libro_de_compras"."lotes_de_dte"."filas_nuevas" + "libro_de_compras"."lotes_de_dte"."filas_actualizadas" + "libro_de_compras"."lotes_de_dte"."filas_sin_cambio" + "libro_de_compras"."lotes_de_dte"."filas_rechazadas"),
	CONSTRAINT "lotes_de_dte_rechazos_validos" CHECK (jsonb_typeof("libro_de_compras"."lotes_de_dte"."rechazos") = 'array' and jsonb_array_length("libro_de_compras"."lotes_de_dte"."rechazos") <= 1000),
	CONSTRAINT "lotes_de_dte_encabezados_validos" CHECK (jsonb_typeof("libro_de_compras"."lotes_de_dte"."encabezados_no_reconocidos") = 'array'),
	CONSTRAINT "lotes_de_dte_conciliacion_con_resumen" CHECK (("libro_de_compras"."lotes_de_dte"."proposito" = 'conciliacion') = ("libro_de_compras"."lotes_de_dte"."resumen_de_conciliacion" is not null))
);
--> statement-breakpoint
ALTER TABLE "libro_de_compras"."lotes_de_dte" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."dte_recibidos" ADD CONSTRAINT "dte_recibidos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."dte_recibidos" ADD CONSTRAINT "dte_recibidos_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."dte_recibidos" ADD CONSTRAINT "dte_recibidos_lote_fk" FOREIGN KEY ("lote_id","empresa_id") REFERENCES "libro_de_compras"."lotes_de_dte"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."dte_recibidos" ADD CONSTRAINT "dte_recibidos_primer_lote_fk" FOREIGN KEY ("primer_lote_id","empresa_id") REFERENCES "libro_de_compras"."lotes_de_dte"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."dte_recibidos" ADD CONSTRAINT "dte_recibidos_documento_fk" FOREIGN KEY ("documento_id","empresa_id") REFERENCES "libro_de_compras"."documentos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."dte_recibidos" ADD CONSTRAINT "dte_recibidos_documento_afectado_fk" FOREIGN KEY ("documento_afectado_id","empresa_id") REFERENCES "libro_de_compras"."documentos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."dte_recibidos" ADD CONSTRAINT "dte_recibidos_concepto_fk" FOREIGN KEY ("concepto_id","empresa_id") REFERENCES "libro_de_compras"."conceptos_de_gasto"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."dte_recibidos" ADD CONSTRAINT "dte_recibidos_proveedor_fk" FOREIGN KEY ("proveedor_id","cuenta_id") REFERENCES "terceros"."proveedores"("id","cuenta_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."lotes_de_dte" ADD CONSTRAINT "lotes_de_dte_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dte_recibidos_documento_unico" ON "libro_de_compras"."dte_recibidos" USING btree ("documento_id") WHERE "libro_de_compras"."dte_recibidos"."documento_id" is not null;--> statement-breakpoint
CREATE INDEX "dte_recibidos_bandeja_idx" ON "libro_de_compras"."dte_recibidos" USING btree ("empresa_id","estado","fecha_emision");--> statement-breakpoint
CREATE INDEX "dte_recibidos_numero_idx" ON "libro_de_compras"."dte_recibidos" USING btree ("empresa_id","nit_emisor","serie","numero");--> statement-breakpoint
CREATE INDEX "dte_recibidos_proveedor_idx" ON "libro_de_compras"."dte_recibidos" USING btree ("proveedor_id") WHERE "libro_de_compras"."dte_recibidos"."proveedor_id" is not null;--> statement-breakpoint
CREATE INDEX "dte_recibidos_concepto_idx" ON "libro_de_compras"."dte_recibidos" USING btree ("concepto_id") WHERE "libro_de_compras"."dte_recibidos"."concepto_id" is not null;--> statement-breakpoint
CREATE INDEX "dte_recibidos_afectado_idx" ON "libro_de_compras"."dte_recibidos" USING btree ("documento_afectado_id") WHERE "libro_de_compras"."dte_recibidos"."documento_afectado_id" is not null;--> statement-breakpoint
CREATE INDEX "dte_recibidos_lote_idx" ON "libro_de_compras"."dte_recibidos" USING btree ("lote_id");--> statement-breakpoint
CREATE INDEX "dte_recibidos_primer_lote_idx" ON "libro_de_compras"."dte_recibidos" USING btree ("primer_lote_id");--> statement-breakpoint
CREATE INDEX "lotes_de_dte_empresa_idx" ON "libro_de_compras"."lotes_de_dte" USING btree ("empresa_id","creado_en" DESC NULLS LAST);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "libro_de_compras"."dte_recibidos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "libro_de_compras"."lotes_de_dte" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);