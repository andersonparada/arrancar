CREATE TABLE "libro_de_compras"."documentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"cuenta_id" uuid DEFAULT nullif(current_setting('app.cuenta_id', true), '')::uuid NOT NULL,
	"tipo" text NOT NULL,
	"proveedor_id" uuid NOT NULL,
	"nit_emisor" text,
	"nombre_emisor" text NOT NULL,
	"nit_receptor" text,
	"serie" text,
	"numero" text NOT NULL,
	"autorizacion_fel" uuid,
	"fecha_emision" date NOT NULL,
	"fecha_recepcion" date NOT NULL,
	"periodo" date NOT NULL,
	"muestra_en_reportes_sat" boolean DEFAULT true NOT NULL,
	"motivo_sin_credito" text,
	"documento_afectado_id" uuid,
	"destino" text NOT NULL,
	"procesado_en_destino_en" timestamp with time zone,
	"total" numeric(14, 2) NOT NULL,
	"base" numeric(14, 2) NOT NULL,
	"iva" numeric(14, 2) NOT NULL,
	"iva_no_acreditable" numeric(14, 2) NOT NULL,
	"idp" numeric(14, 2) NOT NULL,
	"exento" numeric(14, 2) NOT NULL,
	"observaciones" text,
	"estado" text DEFAULT 'vigente' NOT NULL,
	"anulado_en" timestamp with time zone,
	"anulado_por" uuid,
	"motivo_de_anulacion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "documentos_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "documentos_para_notas_unico" UNIQUE("id","empresa_id","proveedor_id","destino"),
	CONSTRAINT "documentos_tipo_valido" CHECK ("libro_de_compras"."documentos"."tipo" in ('factura', 'factura_pequeno_contribuyente', 'nota_de_credito', 'recibo')),
	CONSTRAINT "documentos_destino_valido" CHECK ("libro_de_compras"."documentos"."destino" in ('cuentas-por-pagar', 'caja-chica', 'cuentas-por-liquidar')),
	CONSTRAINT "documentos_motivo_sin_credito_valido" CHECK ("libro_de_compras"."documentos"."motivo_sin_credito" is null or "libro_de_compras"."documentos"."motivo_sin_credito" in ('fuera_de_plazo', 'no_vinculado', 'pequeno_contribuyente', 'exento')),
	CONSTRAINT "documentos_estado_valido" CHECK ("libro_de_compras"."documentos"."estado" in ('vigente', 'anulado')),
	CONSTRAINT "documentos_nit_emisor_valido" CHECK ("libro_de_compras"."documentos"."nit_emisor" is null or "libro_de_compras"."documentos"."nit_emisor" ~ '^[0-9]{1,12}[0-9K]$'),
	CONSTRAINT "documentos_nombre_emisor_largo" CHECK (char_length(btrim("libro_de_compras"."documentos"."nombre_emisor")) between 1 and 200),
	CONSTRAINT "documentos_serie_valida" CHECK ("libro_de_compras"."documentos"."serie" is null or (char_length(btrim("libro_de_compras"."documentos"."serie")) between 1 and 40 and btrim("libro_de_compras"."documentos"."serie") = upper(btrim("libro_de_compras"."documentos"."serie")) and btrim("libro_de_compras"."documentos"."serie") !~ '\s')),
	CONSTRAINT "documentos_numero_valido" CHECK (char_length(btrim("libro_de_compras"."documentos"."numero")) between 1 and 40 and btrim("libro_de_compras"."documentos"."numero") = upper(btrim("libro_de_compras"."documentos"."numero")) and btrim("libro_de_compras"."documentos"."numero") !~ '\s'),
	CONSTRAINT "documentos_fechas_ordenadas" CHECK ("libro_de_compras"."documentos"."fecha_recepcion" >= "libro_de_compras"."documentos"."fecha_emision"),
	CONSTRAINT "documentos_total_positivo" CHECK ("libro_de_compras"."documentos"."total" > 0),
	CONSTRAINT "documentos_base_no_negativa" CHECK ("libro_de_compras"."documentos"."base" >= 0),
	CONSTRAINT "documentos_iva_no_negativo" CHECK ("libro_de_compras"."documentos"."iva" >= 0),
	CONSTRAINT "documentos_iva_no_acreditable_rango" CHECK ("libro_de_compras"."documentos"."iva_no_acreditable" between 0 and "libro_de_compras"."documentos"."iva"),
	CONSTRAINT "documentos_idp_no_negativo" CHECK ("libro_de_compras"."documentos"."idp" >= 0),
	CONSTRAINT "documentos_exento_no_negativo" CHECK ("libro_de_compras"."documentos"."exento" >= 0),
	CONSTRAINT "documentos_observaciones_largo" CHECK ("libro_de_compras"."documentos"."observaciones" is null or char_length(btrim("libro_de_compras"."documentos"."observaciones")) between 1 and 500),
	CONSTRAINT "documentos_motivo_de_anulacion_largo" CHECK ("libro_de_compras"."documentos"."motivo_de_anulacion" is null or char_length(btrim("libro_de_compras"."documentos"."motivo_de_anulacion")) between 1 and 300),
	CONSTRAINT "documentos_totales_cuadran" CHECK ("libro_de_compras"."documentos"."total" = "libro_de_compras"."documentos"."base" + "libro_de_compras"."documentos"."iva" + "libro_de_compras"."documentos"."idp" + "libro_de_compras"."documentos"."exento"),
	CONSTRAINT "documentos_periodo_primer_dia" CHECK (extract(day from "libro_de_compras"."documentos"."periodo") = 1),
	CONSTRAINT "documentos_periodo_desde_emision" CHECK ("libro_de_compras"."documentos"."periodo" >= date_trunc('month', "libro_de_compras"."documentos"."fecha_emision")::date),
	CONSTRAINT "documentos_plazo_del_credito" CHECK ("libro_de_compras"."documentos"."tipo" = 'nota_de_credito' or not "libro_de_compras"."documentos"."muestra_en_reportes_sat" or "libro_de_compras"."documentos"."motivo_sin_credito" is not null
        or "libro_de_compras"."documentos"."periodo" <= (date_trunc('month', "libro_de_compras"."documentos"."fecha_emision") + interval '2 months')::date),
	CONSTRAINT "documentos_fuera_de_plazo_real" CHECK (coalesce("libro_de_compras"."documentos"."motivo_sin_credito", '') <> 'fuera_de_plazo'
        or "libro_de_compras"."documentos"."periodo" > (date_trunc('month', "libro_de_compras"."documentos"."fecha_emision") + interval '2 months')::date),
	CONSTRAINT "documentos_nota_en_su_mes" CHECK ("libro_de_compras"."documentos"."tipo" <> 'nota_de_credito' or "libro_de_compras"."documentos"."periodo" = date_trunc('month', "libro_de_compras"."documentos"."fecha_recepcion")::date),
	CONSTRAINT "documentos_nota_con_factura" CHECK (("libro_de_compras"."documentos"."tipo" = 'nota_de_credito') = ("libro_de_compras"."documentos"."documento_afectado_id" is not null)),
	CONSTRAINT "documentos_datos_sat" CHECK (not "libro_de_compras"."documentos"."muestra_en_reportes_sat" or ("libro_de_compras"."documentos"."nit_emisor" is not null and "libro_de_compras"."documentos"."serie" is not null and "libro_de_compras"."documentos"."autorizacion_fel" is not null)),
	CONSTRAINT "documentos_sin_sat_sin_credito" CHECK ("libro_de_compras"."documentos"."muestra_en_reportes_sat" or ("libro_de_compras"."documentos"."iva" = 0 and "libro_de_compras"."documentos"."motivo_sin_credito" is null)),
	CONSTRAINT "documentos_pequeno_contribuyente" CHECK ("libro_de_compras"."documentos"."tipo" = 'nota_de_credito' or not "libro_de_compras"."documentos"."muestra_en_reportes_sat"
        or (("libro_de_compras"."documentos"."tipo" = 'factura_pequeno_contribuyente') = (coalesce("libro_de_compras"."documentos"."motivo_sin_credito", '') = 'pequeno_contribuyente'))),
	CONSTRAINT "documentos_pequeno_contribuyente_sin_iva" CHECK ("libro_de_compras"."documentos"."tipo" <> 'factura_pequeno_contribuyente' or "libro_de_compras"."documentos"."iva" = 0),
	CONSTRAINT "documentos_iva_no_acreditable_por_motivo" CHECK (("libro_de_compras"."documentos"."motivo_sin_credito" in ('fuera_de_plazo', 'no_vinculado') and "libro_de_compras"."documentos"."iva_no_acreditable" = "libro_de_compras"."documentos"."iva")
        or (coalesce("libro_de_compras"."documentos"."motivo_sin_credito", '') not in ('fuera_de_plazo', 'no_vinculado') and "libro_de_compras"."documentos"."iva_no_acreditable" = 0)),
	CONSTRAINT "documentos_exento_sin_iva" CHECK (coalesce("libro_de_compras"."documentos"."motivo_sin_credito", '') <> 'exento' or "libro_de_compras"."documentos"."iva" = 0),
	CONSTRAINT "documentos_anulacion_completa" CHECK (("libro_de_compras"."documentos"."estado" = 'anulado') = ("libro_de_compras"."documentos"."anulado_en" is not null and "libro_de_compras"."documentos"."anulado_por" is not null and "libro_de_compras"."documentos"."motivo_de_anulacion" is not null)),
	CONSTRAINT "documentos_recibo_desmarcado" CHECK ("libro_de_compras"."documentos"."tipo" <> 'recibo' or not "libro_de_compras"."documentos"."muestra_en_reportes_sat")
);
--> statement-breakpoint
ALTER TABLE "libro_de_compras"."documentos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "libro_de_compras"."lineas_de_documento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"documento_id" uuid NOT NULL,
	"numero" smallint NOT NULL,
	"concepto_id" uuid NOT NULL,
	"descripcion" text,
	"tipo" text NOT NULL,
	"es_activo_fijo" boolean DEFAULT false NOT NULL,
	"vigencia_de_combustible_id" uuid,
	"galones" numeric(12, 3),
	"idp_por_galon" numeric(8, 2),
	"porcentaje_de_etanol" numeric(5, 2),
	"total" numeric(14, 2) NOT NULL,
	"exento" numeric(14, 2) DEFAULT '0' NOT NULL,
	"idp" numeric(14, 2) NOT NULL,
	"base" numeric(14, 2) NOT NULL,
	"iva" numeric(14, 2) NOT NULL,
	"iva_no_acreditable" numeric(14, 2) NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "lineas_de_documento_numero_unico" UNIQUE("documento_id","numero"),
	CONSTRAINT "lineas_de_documento_numero_positivo" CHECK ("libro_de_compras"."lineas_de_documento"."numero" >= 1),
	CONSTRAINT "lineas_de_documento_tipo_valido" CHECK ("libro_de_compras"."lineas_de_documento"."tipo" in ('bien', 'servicio')),
	CONSTRAINT "lineas_de_documento_descripcion_largo" CHECK ("libro_de_compras"."lineas_de_documento"."descripcion" is null or char_length(btrim("libro_de_compras"."lineas_de_documento"."descripcion")) between 1 and 300),
	CONSTRAINT "lineas_de_documento_total_positivo" CHECK ("libro_de_compras"."lineas_de_documento"."total" > 0),
	CONSTRAINT "lineas_de_documento_exento_no_negativo" CHECK ("libro_de_compras"."lineas_de_documento"."exento" >= 0),
	CONSTRAINT "lineas_de_documento_idp_no_negativo" CHECK ("libro_de_compras"."lineas_de_documento"."idp" >= 0),
	CONSTRAINT "lineas_de_documento_base_no_negativa" CHECK ("libro_de_compras"."lineas_de_documento"."base" >= 0),
	CONSTRAINT "lineas_de_documento_iva_no_negativo" CHECK ("libro_de_compras"."lineas_de_documento"."iva" >= 0),
	CONSTRAINT "lineas_de_documento_iva_no_acreditable_rango" CHECK ("libro_de_compras"."lineas_de_documento"."iva_no_acreditable" between 0 and "libro_de_compras"."lineas_de_documento"."iva"),
	CONSTRAINT "lineas_de_documento_totales_cuadran" CHECK ("libro_de_compras"."lineas_de_documento"."total" = "libro_de_compras"."lineas_de_documento"."base" + "libro_de_compras"."lineas_de_documento"."iva" + "libro_de_compras"."lineas_de_documento"."idp" + "libro_de_compras"."lineas_de_documento"."exento"),
	CONSTRAINT "lineas_de_documento_galones_positivos" CHECK ("libro_de_compras"."lineas_de_documento"."galones" is null or "libro_de_compras"."lineas_de_documento"."galones" > 0),
	CONSTRAINT "lineas_de_documento_combustible_completo" CHECK (("libro_de_compras"."lineas_de_documento"."vigencia_de_combustible_id" is null and "libro_de_compras"."lineas_de_documento"."galones" is null and "libro_de_compras"."lineas_de_documento"."idp_por_galon" is null and "libro_de_compras"."lineas_de_documento"."porcentaje_de_etanol" is null)
        or ("libro_de_compras"."lineas_de_documento"."vigencia_de_combustible_id" is not null and "libro_de_compras"."lineas_de_documento"."galones" is not null and "libro_de_compras"."lineas_de_documento"."idp_por_galon" is not null and "libro_de_compras"."lineas_de_documento"."porcentaje_de_etanol" is not null)),
	CONSTRAINT "lineas_de_documento_combustible_es_bien" CHECK ("libro_de_compras"."lineas_de_documento"."vigencia_de_combustible_id" is null or "libro_de_compras"."lineas_de_documento"."tipo" = 'bien'),
	CONSTRAINT "lineas_de_documento_activo_fijo_es_bien" CHECK (not "libro_de_compras"."lineas_de_documento"."es_activo_fijo" or "libro_de_compras"."lineas_de_documento"."tipo" = 'bien'),
	CONSTRAINT "lineas_de_documento_idp_calculado" CHECK (("libro_de_compras"."lineas_de_documento"."vigencia_de_combustible_id" is null and "libro_de_compras"."lineas_de_documento"."idp" = 0)
        or "libro_de_compras"."lineas_de_documento"."idp" = round("libro_de_compras"."lineas_de_documento"."galones" * "libro_de_compras"."lineas_de_documento"."idp_por_galon" * (100 - "libro_de_compras"."lineas_de_documento"."porcentaje_de_etanol") / 100, 2))
);
--> statement-breakpoint
ALTER TABLE "libro_de_compras"."lineas_de_documento" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "libro_de_compras"."retenciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"documento_id" uuid NOT NULL,
	"impuesto" text NOT NULL,
	"regla" text NOT NULL,
	"base" numeric(14, 2) NOT NULL,
	"porcentaje" numeric(5, 2),
	"monto_propuesto" numeric(14, 2) NOT NULL,
	"monto" numeric(14, 2) NOT NULL,
	"motivo_del_ajuste" text,
	"fecha" date,
	"constancia_numero" text,
	"constancia_fecha" date,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "retenciones_documento_regla_unico" UNIQUE("documento_id","regla"),
	CONSTRAINT "retenciones_impuesto_valido" CHECK ("libro_de_compras"."retenciones"."impuesto" in ('iva', 'isr')),
	CONSTRAINT "retenciones_regla_valida" CHECK ("libro_de_compras"."retenciones"."regla" in ('iva_exportador_agropecuario', 'iva_exportador', 'iva_contribuyente_especial', 'iva_otro_agente', 'iva_sector_publico', 'iva_pequeno_contribuyente', 'isr_opcional_simplificado')),
	CONSTRAINT "retenciones_impuesto_de_la_regla" CHECK ("libro_de_compras"."retenciones"."impuesto" = split_part("libro_de_compras"."retenciones"."regla", '_', 1)),
	CONSTRAINT "retenciones_base_positiva" CHECK ("libro_de_compras"."retenciones"."base" > 0),
	CONSTRAINT "retenciones_porcentaje_rango" CHECK ("libro_de_compras"."retenciones"."porcentaje" is null or "libro_de_compras"."retenciones"."porcentaje" between 0 and 100),
	CONSTRAINT "retenciones_porcentaje_nulo_solo_isr" CHECK ("libro_de_compras"."retenciones"."porcentaje" is not null or "libro_de_compras"."retenciones"."regla" = 'isr_opcional_simplificado'),
	CONSTRAINT "retenciones_monto_propuesto_no_negativo" CHECK ("libro_de_compras"."retenciones"."monto_propuesto" >= 0),
	CONSTRAINT "retenciones_monto_rango" CHECK ("libro_de_compras"."retenciones"."monto" between 0 and "libro_de_compras"."retenciones"."base"),
	CONSTRAINT "retenciones_motivo_del_ajuste" CHECK ("libro_de_compras"."retenciones"."monto" = "libro_de_compras"."retenciones"."monto_propuesto" or "libro_de_compras"."retenciones"."motivo_del_ajuste" is not null),
	CONSTRAINT "retenciones_fecha_obligatoria" CHECK ("libro_de_compras"."retenciones"."regla" = 'iva_pequeno_contribuyente' or "libro_de_compras"."retenciones"."fecha" is not null),
	CONSTRAINT "retenciones_constancia_completa" CHECK (("libro_de_compras"."retenciones"."constancia_numero" is null) = ("libro_de_compras"."retenciones"."constancia_fecha" is null))
);
--> statement-breakpoint
ALTER TABLE "libro_de_compras"."retenciones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."documentos" ADD CONSTRAINT "documentos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."documentos" ADD CONSTRAINT "documentos_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."documentos" ADD CONSTRAINT "documentos_proveedor_fk" FOREIGN KEY ("proveedor_id","cuenta_id") REFERENCES "terceros"."proveedores"("id","cuenta_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."lineas_de_documento" ADD CONSTRAINT "lineas_de_documento_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."lineas_de_documento" ADD CONSTRAINT "lineas_de_documento_documento_fk" FOREIGN KEY ("documento_id","empresa_id") REFERENCES "libro_de_compras"."documentos"("id","empresa_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."lineas_de_documento" ADD CONSTRAINT "lineas_de_documento_concepto_fk" FOREIGN KEY ("concepto_id","empresa_id") REFERENCES "libro_de_compras"."conceptos_de_gasto"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."lineas_de_documento" ADD CONSTRAINT "lineas_de_documento_vigencia_fk" FOREIGN KEY ("vigencia_de_combustible_id","empresa_id") REFERENCES "libro_de_compras"."vigencias_de_combustible"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."retenciones" ADD CONSTRAINT "retenciones_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."retenciones" ADD CONSTRAINT "retenciones_documento_fk" FOREIGN KEY ("documento_id","empresa_id") REFERENCES "libro_de_compras"."documentos"("id","empresa_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "documentos_sat_unico" ON "libro_de_compras"."documentos" USING btree ("nit_emisor","tipo","serie","numero") WHERE "libro_de_compras"."documentos"."estado" = 'vigente' and "libro_de_compras"."documentos"."muestra_en_reportes_sat";--> statement-breakpoint
CREATE UNIQUE INDEX "documentos_autorizacion_fel_unica" ON "libro_de_compras"."documentos" USING btree ("autorizacion_fel") WHERE "libro_de_compras"."documentos"."estado" = 'vigente' and "libro_de_compras"."documentos"."autorizacion_fel" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "documentos_del_proveedor_unico" ON "libro_de_compras"."documentos" USING btree ("empresa_id","proveedor_id","tipo",coalesce("serie", ''),"numero") WHERE "libro_de_compras"."documentos"."estado" = 'vigente';--> statement-breakpoint
CREATE INDEX "documentos_libro_idx" ON "libro_de_compras"."documentos" USING btree ("empresa_id","periodo");--> statement-breakpoint
CREATE INDEX "documentos_proveedor_reciente_idx" ON "libro_de_compras"."documentos" USING btree ("empresa_id","proveedor_id","creado_en" desc);--> statement-breakpoint
CREATE INDEX "documentos_emision_idx" ON "libro_de_compras"."documentos" USING btree ("empresa_id","fecha_emision");--> statement-breakpoint
CREATE INDEX "documentos_proveedor_idx" ON "libro_de_compras"."documentos" USING btree ("proveedor_id");--> statement-breakpoint
CREATE INDEX "documentos_afectado_idx" ON "libro_de_compras"."documentos" USING btree ("documento_afectado_id") WHERE "libro_de_compras"."documentos"."documento_afectado_id" is not null;--> statement-breakpoint
CREATE INDEX "lineas_de_documento_concepto_idx" ON "libro_de_compras"."lineas_de_documento" USING btree ("concepto_id");--> statement-breakpoint
CREATE INDEX "lineas_de_documento_vigencia_idx" ON "libro_de_compras"."lineas_de_documento" USING btree ("vigencia_de_combustible_id") WHERE "libro_de_compras"."lineas_de_documento"."vigencia_de_combustible_id" is not null;--> statement-breakpoint
CREATE INDEX "retenciones_mes_idx" ON "libro_de_compras"."retenciones" USING btree ("empresa_id","fecha");--> statement-breakpoint
CREATE INDEX "retenciones_por_fechar_idx" ON "libro_de_compras"."retenciones" USING btree ("empresa_id") WHERE "libro_de_compras"."retenciones"."fecha" is null;--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "libro_de_compras"."documentos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "libro_de_compras"."lineas_de_documento" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "libro_de_compras"."retenciones" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);