CREATE SCHEMA "contabilidad";
--> statement-breakpoint
CREATE TABLE "contabilidad"."cuentas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"padre_id" uuid,
	"nivel" smallint NOT NULL,
	"es_de_detalle" boolean DEFAULT false NOT NULL,
	"naturaleza" text NOT NULL,
	"tipo" text NOT NULL,
	"rubro" text,
	"corriente" boolean DEFAULT false NOT NULL,
	"clase_de_flujo" text,
	"es_monetaria" boolean DEFAULT false NOT NULL,
	"moneda_codigo" char(3),
	"pide_tercero" boolean DEFAULT false NOT NULL,
	"pide_centro_de_costo" boolean DEFAULT false NOT NULL,
	"es_de_control" boolean DEFAULT false NOT NULL,
	"tratamiento_fiscal" text DEFAULT 'no_aplica' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "cuentas_codigo_unico" UNIQUE("empresa_id","codigo"),
	CONSTRAINT "cuentas_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "cuentas_padre_distinto" CHECK ("contabilidad"."cuentas"."padre_id" is null or "contabilidad"."cuentas"."padre_id" <> "contabilidad"."cuentas"."id"),
	CONSTRAINT "cuentas_nivel_valido" CHECK ("contabilidad"."cuentas"."nivel" between 1 and 6),
	CONSTRAINT "cuentas_nivel_sin_padre" CHECK (("contabilidad"."cuentas"."nivel" = 1) = ("contabilidad"."cuentas"."padre_id" is null)),
	CONSTRAINT "cuentas_nombre_largo" CHECK (char_length(btrim("contabilidad"."cuentas"."nombre")) between 1 and 150),
	CONSTRAINT "cuentas_naturaleza_valida" CHECK ("contabilidad"."cuentas"."naturaleza" in ('deudora', 'acreedora')),
	CONSTRAINT "cuentas_tipo_valido" CHECK ("contabilidad"."cuentas"."tipo" in ('balance', 'resultados')),
	CONSTRAINT "cuentas_rubro_valido" CHECK ("contabilidad"."cuentas"."rubro" is null or "contabilidad"."cuentas"."rubro" in ('efectivo', 'cuentas_por_cobrar', 'cuentas_por_cobrar_partes_relacionadas', 'anticipos_a_proveedores', 'inventarios', 'impuestos_por_recuperar', 'gastos_anticipados', 'inversiones', 'propiedad_planta_y_equipo', 'propiedades_de_inversion', 'intangibles', 'activos_biologicos', 'impuesto_diferido_activo', 'otros_activos', 'proveedores', 'cuentas_por_pagar_partes_relacionadas', 'prestamos_corto_plazo', 'impuestos_por_pagar', 'retenciones_por_pagar', 'beneficios_a_empleados', 'ingresos_diferidos', 'otras_cuentas_por_pagar', 'provisiones', 'prestamos_largo_plazo', 'impuesto_diferido_pasivo', 'otros_pasivos', 'capital', 'aportes_para_futuras_capitalizaciones', 'reservas', 'superavit_por_revaluacion', 'resultados_acumulados', 'resultado_del_ejercicio', 'ingresos_ordinarios', 'costo_de_ventas', 'costo_de_produccion', 'gastos_de_venta', 'gastos_de_administracion', 'otros_ingresos', 'otros_gastos', 'cambio_en_valor_razonable_de_activos_biologicos', 'ingresos_financieros', 'gastos_financieros', 'diferencial_cambiario', 'impuesto_sobre_la_renta')),
	CONSTRAINT "cuentas_clase_de_flujo_valida" CHECK ("contabilidad"."cuentas"."clase_de_flujo" is null or "contabilidad"."cuentas"."clase_de_flujo" in ('efectivo', 'operacion', 'inversion', 'financiamiento', 'ninguna')),
	CONSTRAINT "cuentas_tratamiento_fiscal_valido" CHECK ("contabilidad"."cuentas"."tratamiento_fiscal" in ('deducible', 'no_deducible', 'exento', 'costo_de_renta_exenta', 'renta_de_capital', 'no_aplica')),
	CONSTRAINT "cuentas_tratamiento_solo_en_resultados" CHECK ("contabilidad"."cuentas"."tipo" = 'resultados' or "contabilidad"."cuentas"."tratamiento_fiscal" = 'no_aplica'),
	CONSTRAINT "cuentas_detalle_con_rubro" CHECK (not "contabilidad"."cuentas"."es_de_detalle" or "contabilidad"."cuentas"."rubro" is not null)
);
--> statement-breakpoint
ALTER TABLE "contabilidad"."cuentas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "contabilidad"."inicios" (
	"empresa_id" uuid PRIMARY KEY NOT NULL,
	"fecha" date NOT NULL,
	"caso" text NOT NULL,
	"mascara" text NOT NULL,
	"plantilla" text,
	"iniciada_en" timestamp with time zone,
	"iniciada_por" uuid,
	"firma_representante" text,
	"firma_contador" text,
	"registro_del_contador" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "inicios_caso_valido" CHECK ("contabilidad"."inicios"."caso" in ('desde_la_carga', 'posterior')),
	CONSTRAINT "inicios_mascara_valida" CHECK ("contabilidad"."inicios"."mascara" ~ '^9+(\.9+){3,5}$'),
	CONSTRAINT "inicios_firma_representante_largo" CHECK ("contabilidad"."inicios"."firma_representante" is null or char_length(btrim("contabilidad"."inicios"."firma_representante")) between 1 and 150),
	CONSTRAINT "inicios_firma_contador_largo" CHECK ("contabilidad"."inicios"."firma_contador" is null or char_length(btrim("contabilidad"."inicios"."firma_contador")) between 1 and 150),
	CONSTRAINT "inicios_registro_largo" CHECK ("contabilidad"."inicios"."registro_del_contador" is null or char_length(btrim("contabilidad"."inicios"."registro_del_contador")) between 1 and 30),
	CONSTRAINT "inicios_contador_completo" CHECK (("contabilidad"."inicios"."firma_contador" is null) = ("contabilidad"."inicios"."registro_del_contador" is null))
);
--> statement-breakpoint
ALTER TABLE "contabilidad"."inicios" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "contabilidad"."cuentas" ADD CONSTRAINT "cuentas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contabilidad"."cuentas" ADD CONSTRAINT "cuentas_moneda_codigo_monedas_codigo_fk" FOREIGN KEY ("moneda_codigo") REFERENCES "core"."monedas"("codigo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contabilidad"."cuentas" ADD CONSTRAINT "cuentas_padre_fk" FOREIGN KEY ("padre_id","empresa_id") REFERENCES "contabilidad"."cuentas"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contabilidad"."inicios" ADD CONSTRAINT "inicios_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cuentas_nombre_unico" ON "contabilidad"."cuentas" USING btree ("empresa_id",coalesce("padre_id", '00000000-0000-0000-0000-000000000000'::uuid),core.nombre_normalizado("nombre"));--> statement-breakpoint
CREATE INDEX "cuentas_padre_idx" ON "contabilidad"."cuentas" USING btree ("empresa_id","padre_id");--> statement-breakpoint
CREATE INDEX "cuentas_codigo_prefijo_idx" ON "contabilidad"."cuentas" USING btree ("empresa_id","codigo" text_pattern_ops);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "contabilidad"."cuentas" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "contabilidad"."inicios" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);