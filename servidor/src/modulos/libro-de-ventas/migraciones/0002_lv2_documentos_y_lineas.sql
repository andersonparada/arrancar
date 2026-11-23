CREATE TABLE "libro_de_ventas"."documentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"cuenta_id" uuid DEFAULT nullif(current_setting('app.cuenta_id', true), '')::uuid NOT NULL,
	"tipo" text NOT NULL,
	"tipo_dte" text,
	"origen" text DEFAULT 'manual' NOT NULL,
	"cliente_id" uuid,
	"tipo_de_identificacion" text NOT NULL,
	"nit_receptor" text NOT NULL,
	"nombre_receptor" text NOT NULL,
	"serie" text,
	"numero" text NOT NULL,
	"autorizacion_fel" uuid,
	"localidad_id" uuid,
	"fecha_emision" date NOT NULL,
	"periodo" date NOT NULL,
	"regimen_iva_de_la_empresa" text NOT NULL,
	"regimen_isr_de_la_empresa" text,
	"documento_afectado_id" uuid,
	"factura_anterior_serie" text,
	"factura_anterior_numero" text,
	"factura_anterior_fecha" date,
	"destino" text,
	"procesado_en_destino_en" timestamp with time zone,
	"muestra_en_reportes_sat" boolean DEFAULT true NOT NULL,
	"moneda" char(3) DEFAULT 'GTQ' NOT NULL,
	"tipo_de_cambio" numeric(16, 8) DEFAULT '1' NOT NULL,
	"fecha_del_tipo_de_cambio" date,
	"total_en_moneda" numeric(14, 2) NOT NULL,
	"total" numeric(14, 2) NOT NULL,
	"gravado_bienes" numeric(14, 2) NOT NULL,
	"gravado_servicios" numeric(14, 2) NOT NULL,
	"exento" numeric(14, 2) NOT NULL,
	"exportacion" numeric(14, 2) NOT NULL,
	"iva" numeric(14, 2) NOT NULL,
	"otros_impuestos" numeric(14, 2) DEFAULT '0' NOT NULL,
	"observaciones" text,
	"estado" text DEFAULT 'vigente' NOT NULL,
	"anulado_en" timestamp with time zone,
	"anulado_por" uuid,
	"motivo_de_anulacion" text,
	"causa_de_anulacion" text,
	"fecha_de_anulacion" date,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "documentos_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "documentos_destino_unico" UNIQUE("id","empresa_id","destino"),
	CONSTRAINT "documentos_tipo_valido" CHECK ("libro_de_ventas"."documentos"."tipo" in ('factura', 'factura_cambiaria', 'factura_pequeno_contribuyente', 'factura_pequeno_contribuyente_electronico', 'factura_contribuyente_agropecuario', 'factura_primario_pecuario', 'factura_especial_recibida', 'nota_de_credito', 'nota_de_debito', 'nota_de_abono', 'recibo')),
	CONSTRAINT "documentos_tipo_dte_de_la_familia" CHECK ("libro_de_ventas"."documentos"."tipo_dte" is null or (("libro_de_ventas"."documentos"."tipo" = 'factura' and "libro_de_ventas"."documentos"."tipo_dte" in ('FACT')) or ("libro_de_ventas"."documentos"."tipo" = 'factura_cambiaria' and "libro_de_ventas"."documentos"."tipo_dte" in ('FCAM')) or ("libro_de_ventas"."documentos"."tipo" = 'factura_pequeno_contribuyente' and "libro_de_ventas"."documentos"."tipo_dte" in ('FPEQ', 'FCAP')) or ("libro_de_ventas"."documentos"."tipo" = 'factura_pequeno_contribuyente_electronico' and "libro_de_ventas"."documentos"."tipo_dte" in ('FAPE', 'FCPE')) or ("libro_de_ventas"."documentos"."tipo" = 'factura_contribuyente_agropecuario' and "libro_de_ventas"."documentos"."tipo_dte" in ('FACA', 'FCCA', 'FAAE', 'FCAE')) or ("libro_de_ventas"."documentos"."tipo" = 'factura_primario_pecuario' and "libro_de_ventas"."documentos"."tipo_dte" in ('FARP', 'FCRP', 'FPEC', 'FCPC')) or ("libro_de_ventas"."documentos"."tipo" = 'factura_especial_recibida' and "libro_de_ventas"."documentos"."tipo_dte" in ('FESP')) or ("libro_de_ventas"."documentos"."tipo" = 'nota_de_credito' and "libro_de_ventas"."documentos"."tipo_dte" in ('NCRE')) or ("libro_de_ventas"."documentos"."tipo" = 'nota_de_debito' and "libro_de_ventas"."documentos"."tipo_dte" in ('NDEB')) or ("libro_de_ventas"."documentos"."tipo" = 'nota_de_abono' and "libro_de_ventas"."documentos"."tipo_dte" in ('NABN')) or ("libro_de_ventas"."documentos"."tipo" = 'recibo' and "libro_de_ventas"."documentos"."tipo_dte" in ('RECI', 'RDON')))),
	CONSTRAINT "documentos_fel_con_tipo_dte" CHECK (("libro_de_ventas"."documentos"."autorizacion_fel" is null) = ("libro_de_ventas"."documentos"."tipo_dte" is null)),
	CONSTRAINT "documentos_origen_valido" CHECK ("libro_de_ventas"."documentos"."origen" in ('manual', 'bandeja_sat', 'fel')),
	CONSTRAINT "documentos_regimen_iva_valido" CHECK ("libro_de_ventas"."documentos"."regimen_iva_de_la_empresa" in ('general', 'pequeno_contribuyente', 'pequeno_contribuyente_electronico', 'contribuyente_agropecuario', 'primario_pecuario', 'no_afiliado')),
	CONSTRAINT "documentos_regimen_isr_valido" CHECK ("libro_de_ventas"."documentos"."regimen_isr_de_la_empresa" is null or "libro_de_ventas"."documentos"."regimen_isr_de_la_empresa" in ('utilidades', 'opcional_simplificado', 'exento')),
	CONSTRAINT "documentos_destino_valido" CHECK ("libro_de_ventas"."documentos"."destino" is null or "libro_de_ventas"."documentos"."destino" in ('cuentas-por-cobrar')),
	CONSTRAINT "documentos_destino_con_cliente" CHECK ("libro_de_ventas"."documentos"."destino" is null or "libro_de_ventas"."documentos"."cliente_id" is not null),
	CONSTRAINT "documentos_procesado_con_destino" CHECK ("libro_de_ventas"."documentos"."procesado_en_destino_en" is null or "libro_de_ventas"."documentos"."destino" is not null),
	CONSTRAINT "documentos_recibo_fuera_de_los_reportes" CHECK (("libro_de_ventas"."documentos"."tipo" = 'recibo') = (not "libro_de_ventas"."documentos"."muestra_en_reportes_sat")),
	CONSTRAINT "documentos_serie_valida" CHECK ("libro_de_ventas"."documentos"."serie" is null or (char_length(btrim("libro_de_ventas"."documentos"."serie")) between 1 and 40 and btrim("libro_de_ventas"."documentos"."serie") = upper(btrim("libro_de_ventas"."documentos"."serie")) and btrim("libro_de_ventas"."documentos"."serie") !~ '\s')),
	CONSTRAINT "documentos_numero_valido" CHECK (char_length(btrim("libro_de_ventas"."documentos"."numero")) between 1 and 40 and btrim("libro_de_ventas"."documentos"."numero") = upper(btrim("libro_de_ventas"."documentos"."numero")) and btrim("libro_de_ventas"."documentos"."numero") !~ '\s'),
	CONSTRAINT "documentos_observaciones_largo" CHECK ("libro_de_ventas"."documentos"."observaciones" is null or char_length(btrim("libro_de_ventas"."documentos"."observaciones")) between 1 and 500),
	CONSTRAINT "documentos_identificacion_valida" CHECK ("libro_de_ventas"."documentos"."tipo_de_identificacion" in ('nit', 'cui', 'extranjero', 'cf')),
	CONSTRAINT "documentos_cf_con_nit_cf" CHECK ("libro_de_ventas"."documentos"."tipo_de_identificacion" <> 'cf' or "libro_de_ventas"."documentos"."nit_receptor" = 'CF'),
	CONSTRAINT "documentos_sin_cliente_es_cf" CHECK ("libro_de_ventas"."documentos"."cliente_id" is not null or "libro_de_ventas"."documentos"."nit_receptor" = 'CF'),
	CONSTRAINT "documentos_nit_receptor_largo" CHECK (char_length(btrim("libro_de_ventas"."documentos"."nit_receptor")) between 1 and 20),
	CONSTRAINT "documentos_nombre_receptor_largo" CHECK (char_length(btrim("libro_de_ventas"."documentos"."nombre_receptor")) between 1 and 200),
	CONSTRAINT "documentos_total_positivo" CHECK ("libro_de_ventas"."documentos"."total" > 0),
	CONSTRAINT "documentos_columnas_no_negativas" CHECK ("libro_de_ventas"."documentos"."gravado_bienes" >= 0 and "libro_de_ventas"."documentos"."gravado_servicios" >= 0 and "libro_de_ventas"."documentos"."exento" >= 0 and "libro_de_ventas"."documentos"."exportacion" >= 0 and "libro_de_ventas"."documentos"."iva" >= 0 and "libro_de_ventas"."documentos"."otros_impuestos" >= 0),
	CONSTRAINT "documentos_totales_cuadran" CHECK ("libro_de_ventas"."documentos"."total" = "libro_de_ventas"."documentos"."gravado_bienes" + "libro_de_ventas"."documentos"."gravado_servicios" + "libro_de_ventas"."documentos"."exento" + "libro_de_ventas"."documentos"."exportacion" + "libro_de_ventas"."documentos"."iva" + "libro_de_ventas"."documentos"."otros_impuestos"),
	CONSTRAINT "documentos_periodo_es_el_mes_de_emision" CHECK ("libro_de_ventas"."documentos"."periodo" = date_trunc('month', "libro_de_ventas"."documentos"."fecha_emision")::date),
	CONSTRAINT "documentos_total_en_moneda_positivo" CHECK ("libro_de_ventas"."documentos"."total_en_moneda" > 0),
	CONSTRAINT "documentos_quetzales_sin_cambio" CHECK ("libro_de_ventas"."documentos"."moneda" <> 'GTQ' or ("libro_de_ventas"."documentos"."tipo_de_cambio" = 1 and "libro_de_ventas"."documentos"."total_en_moneda" = "libro_de_ventas"."documentos"."total" and "libro_de_ventas"."documentos"."fecha_del_tipo_de_cambio" is null)),
	CONSTRAINT "documentos_extranjera_con_tipo" CHECK ("libro_de_ventas"."documentos"."moneda" = 'GTQ' or ("libro_de_ventas"."documentos"."tipo_de_cambio" > 0 and "libro_de_ventas"."documentos"."fecha_del_tipo_de_cambio" is not null)),
	CONSTRAINT "documentos_nota_con_factura" CHECK (("libro_de_ventas"."documentos"."tipo" in ('nota_de_credito', 'nota_de_debito', 'nota_de_abono')) = ("libro_de_ventas"."documentos"."documento_afectado_id" is not null or "libro_de_ventas"."documentos"."factura_anterior_numero" is not null)),
	CONSTRAINT "documentos_una_sola_factura_corregida" CHECK ("libro_de_ventas"."documentos"."documento_afectado_id" is null or "libro_de_ventas"."documentos"."factura_anterior_numero" is null),
	CONSTRAINT "documentos_factura_anterior_completa" CHECK (("libro_de_ventas"."documentos"."factura_anterior_numero" is null) = ("libro_de_ventas"."documentos"."factura_anterior_fecha" is null) and ("libro_de_ventas"."documentos"."factura_anterior_serie" is null or "libro_de_ventas"."documentos"."factura_anterior_numero" is not null)),
	CONSTRAINT "documentos_estado_valido" CHECK ("libro_de_ventas"."documentos"."estado" in ('vigente', 'anulado')),
	CONSTRAINT "documentos_anulacion_completa" CHECK (("libro_de_ventas"."documentos"."estado" = 'anulado' and "libro_de_ventas"."documentos"."anulado_en" is not null and "libro_de_ventas"."documentos"."anulado_por" is not null and "libro_de_ventas"."documentos"."motivo_de_anulacion" is not null and "libro_de_ventas"."documentos"."causa_de_anulacion" is not null and "libro_de_ventas"."documentos"."fecha_de_anulacion" is not null)
        or ("libro_de_ventas"."documentos"."estado" = 'vigente' and "libro_de_ventas"."documentos"."anulado_en" is null and "libro_de_ventas"."documentos"."anulado_por" is null and "libro_de_ventas"."documentos"."motivo_de_anulacion" is null and "libro_de_ventas"."documentos"."causa_de_anulacion" is null and "libro_de_ventas"."documentos"."fecha_de_anulacion" is null)),
	CONSTRAINT "documentos_causa_valida" CHECK ("libro_de_ventas"."documentos"."causa_de_anulacion" is null or "libro_de_ventas"."documentos"."causa_de_anulacion" in ('fel_anulada_en_la_sat', 'error_de_captura', 'no_corresponde_a_la_empresa')),
	CONSTRAINT "documentos_motivo_de_anulacion_largo" CHECK ("libro_de_ventas"."documentos"."motivo_de_anulacion" is null or char_length(btrim("libro_de_ventas"."documentos"."motivo_de_anulacion")) between 1 and 300)
);
--> statement-breakpoint
ALTER TABLE "libro_de_ventas"."documentos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "libro_de_ventas"."lineas_de_documento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"documento_id" uuid NOT NULL,
	"orden" smallint NOT NULL,
	"concepto_de_ingreso_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"clase_fiscal" text NOT NULL,
	"descripcion" text,
	"total" numeric(14, 2) NOT NULL,
	"base" numeric(14, 2) NOT NULL,
	"iva" numeric(14, 2) NOT NULL,
	"otros_impuestos" numeric(14, 2) DEFAULT '0' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "lineas_de_documento_orden_unico" UNIQUE("documento_id","orden"),
	CONSTRAINT "lineas_llave_unica" UNIQUE("id","documento_id","empresa_id"),
	CONSTRAINT "lineas_de_documento_orden_positivo" CHECK ("libro_de_ventas"."lineas_de_documento"."orden" > 0),
	CONSTRAINT "lineas_de_documento_tipo_valido" CHECK ("libro_de_ventas"."lineas_de_documento"."tipo" in ('bien', 'servicio')),
	CONSTRAINT "lineas_de_documento_clase_valida" CHECK ("libro_de_ventas"."lineas_de_documento"."clase_fiscal" in ('gravada', 'exenta', 'exportacion', 'no_afecta')),
	CONSTRAINT "lineas_de_documento_descripcion_largo" CHECK ("libro_de_ventas"."lineas_de_documento"."descripcion" is null or char_length(btrim("libro_de_ventas"."lineas_de_documento"."descripcion")) between 1 and 300),
	CONSTRAINT "lineas_de_documento_montos_validos" CHECK ("libro_de_ventas"."lineas_de_documento"."total" > 0 and "libro_de_ventas"."lineas_de_documento"."base" >= 0 and "libro_de_ventas"."lineas_de_documento"."iva" >= 0 and "libro_de_ventas"."lineas_de_documento"."otros_impuestos" >= 0),
	CONSTRAINT "lineas_de_documento_totales_cuadran" CHECK ("libro_de_ventas"."lineas_de_documento"."total" = "libro_de_ventas"."lineas_de_documento"."base" + "libro_de_ventas"."lineas_de_documento"."iva" + "libro_de_ventas"."lineas_de_documento"."otros_impuestos"),
	CONSTRAINT "lineas_de_documento_solo_la_gravada_lleva_iva" CHECK ("libro_de_ventas"."lineas_de_documento"."clase_fiscal" = 'gravada' or "libro_de_ventas"."lineas_de_documento"."iva" = 0)
);
--> statement-breakpoint
ALTER TABLE "libro_de_ventas"."lineas_de_documento" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "libro_de_ventas"."documentos" ADD CONSTRAINT "documentos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_ventas"."documentos" ADD CONSTRAINT "documentos_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_ventas"."documentos" ADD CONSTRAINT "documentos_moneda_monedas_codigo_fk" FOREIGN KEY ("moneda") REFERENCES "core"."monedas"("codigo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_ventas"."documentos" ADD CONSTRAINT "documentos_cliente_fk" FOREIGN KEY ("cliente_id","cuenta_id") REFERENCES "terceros"."clientes"("id","cuenta_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_ventas"."documentos" ADD CONSTRAINT "documentos_afectado_fk" FOREIGN KEY ("documento_afectado_id","empresa_id") REFERENCES "libro_de_ventas"."documentos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_ventas"."documentos" ADD CONSTRAINT "documentos_localidad_fk" FOREIGN KEY ("localidad_id","empresa_id") REFERENCES "empresas"."localidades"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_ventas"."lineas_de_documento" ADD CONSTRAINT "lineas_de_documento_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_ventas"."lineas_de_documento" ADD CONSTRAINT "lineas_de_documento_documento_fk" FOREIGN KEY ("documento_id","empresa_id") REFERENCES "libro_de_ventas"."documentos"("id","empresa_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_ventas"."lineas_de_documento" ADD CONSTRAINT "lineas_de_documento_concepto_fk" FOREIGN KEY ("concepto_de_ingreso_id","empresa_id") REFERENCES "libro_de_ventas"."conceptos_de_ingreso"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "documentos_serie_y_numero_unicos" ON "libro_de_ventas"."documentos" USING btree ("empresa_id",coalesce("tipo_dte", "tipo"),coalesce("serie", ''),"numero");--> statement-breakpoint
CREATE UNIQUE INDEX "documentos_autorizacion_fel_unica" ON "libro_de_ventas"."documentos" USING btree ("empresa_id","autorizacion_fel") WHERE "libro_de_ventas"."documentos"."autorizacion_fel" is not null;--> statement-breakpoint
CREATE INDEX "documentos_libro_idx" ON "libro_de_ventas"."documentos" USING btree ("empresa_id","periodo","estado");--> statement-breakpoint
CREATE INDEX "documentos_cliente_idx" ON "libro_de_ventas"."documentos" USING btree ("empresa_id","cliente_id","fecha_emision");--> statement-breakpoint
CREATE INDEX "documentos_destino_idx" ON "libro_de_ventas"."documentos" USING btree ("empresa_id","destino") WHERE "libro_de_ventas"."documentos"."destino" is not null;--> statement-breakpoint
CREATE INDEX "documentos_afectado_idx" ON "libro_de_ventas"."documentos" USING btree ("documento_afectado_id","empresa_id") WHERE "libro_de_ventas"."documentos"."documento_afectado_id" is not null;--> statement-breakpoint
CREATE INDEX "documentos_localidad_idx" ON "libro_de_ventas"."documentos" USING btree ("localidad_id") WHERE "libro_de_ventas"."documentos"."localidad_id" is not null;--> statement-breakpoint
CREATE INDEX "documentos_cliente_cuenta_idx" ON "libro_de_ventas"."documentos" USING btree ("cuenta_id");--> statement-breakpoint
CREATE INDEX "lineas_de_documento_documento_idx" ON "libro_de_ventas"."lineas_de_documento" USING btree ("documento_id","empresa_id");--> statement-breakpoint
CREATE INDEX "lineas_de_documento_concepto_idx" ON "libro_de_ventas"."lineas_de_documento" USING btree ("concepto_de_ingreso_id","empresa_id");--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "libro_de_ventas"."documentos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "libro_de_ventas"."lineas_de_documento" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);