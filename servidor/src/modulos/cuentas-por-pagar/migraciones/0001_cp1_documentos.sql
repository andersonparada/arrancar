CREATE TABLE "cuentas_por_pagar"."aplicaciones_de_notas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"proveedor_id" uuid NOT NULL,
	"nota_id" uuid NOT NULL,
	"cargo_id" uuid NOT NULL,
	"monto" numeric(14, 2) NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "aplicaciones_nota_cargo_unico" UNIQUE("nota_id","cargo_id"),
	CONSTRAINT "aplicaciones_distintos" CHECK ("cuentas_por_pagar"."aplicaciones_de_notas"."nota_id" <> "cuentas_por_pagar"."aplicaciones_de_notas"."cargo_id"),
	CONSTRAINT "aplicaciones_monto_positivo" CHECK ("cuentas_por_pagar"."aplicaciones_de_notas"."monto" > 0)
);
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."aplicaciones_de_notas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cuentas_por_pagar"."condiciones_de_proveedor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cuenta_id" uuid DEFAULT nullif(current_setting('app.cuenta_id', true), '')::uuid NOT NULL,
	"proveedor_id" uuid NOT NULL,
	"dias_de_credito" smallint,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "condiciones_proveedor_unico" UNIQUE("proveedor_id"),
	CONSTRAINT "condiciones_dias_de_credito_rango" CHECK ("cuentas_por_pagar"."condiciones_de_proveedor"."dias_de_credito" is null or "cuentas_por_pagar"."condiciones_de_proveedor"."dias_de_credito" between 0 and 365)
);
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."condiciones_de_proveedor" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cuentas_por_pagar"."documentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"documento_id" uuid NOT NULL,
	"destino" text DEFAULT 'cuentas-por-pagar' NOT NULL,
	"tipo" text NOT NULL,
	"proveedor_id" uuid NOT NULL,
	"documento_afectado_id" uuid,
	"fecha_emision" date NOT NULL,
	"total" numeric(14, 2) NOT NULL,
	"retenciones" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tiene_activo_fijo" boolean DEFAULT false NOT NULL,
	"vencimiento" date,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"registrado_en" timestamp with time zone,
	"registrado_por" uuid,
	"autorizado_en" timestamp with time zone,
	"autorizado_por" uuid,
	"autorizacion_propia" boolean DEFAULT false NOT NULL,
	"anulado_en" timestamp with time zone,
	"anulado_por" uuid,
	"motivo_de_anulacion" text,
	"estaba_autorizado" boolean,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "documentos_documento_unico" UNIQUE("documento_id"),
	CONSTRAINT "documentos_para_notas_unico" UNIQUE("documento_id","empresa_id","proveedor_id"),
	CONSTRAINT "documentos_id_proveedor_unico" UNIQUE("id","empresa_id","proveedor_id"),
	CONSTRAINT "documentos_destino_propio" CHECK ("cuentas_por_pagar"."documentos"."destino" = 'cuentas-por-pagar'),
	CONSTRAINT "documentos_tipo_valido" CHECK ("cuentas_por_pagar"."documentos"."tipo" in ('factura', 'factura_pequeno_contribuyente', 'factura_pequeno_contribuyente_electronico', 'factura_contribuyente_agropecuario', 'factura_primario_pecuario', 'factura_especial', 'nota_de_credito', 'nota_de_debito', 'recibo')),
	CONSTRAINT "documentos_estado_valido" CHECK ("cuentas_por_pagar"."documentos"."estado" in ('pendiente', 'registrado', 'autorizado', 'anulado')),
	CONSTRAINT "documentos_nota_con_factura" CHECK (("cuentas_por_pagar"."documentos"."tipo" in ('nota_de_credito', 'nota_de_debito')) = ("cuentas_por_pagar"."documentos"."documento_afectado_id" is not null)),
	CONSTRAINT "documentos_total_positivo" CHECK ("cuentas_por_pagar"."documentos"."total" > 0),
	CONSTRAINT "documentos_retenciones_validas" CHECK ("cuentas_por_pagar"."documentos"."retenciones" >= 0 and "cuentas_por_pagar"."documentos"."retenciones" <= "cuentas_por_pagar"."documentos"."total"),
	CONSTRAINT "documentos_nota_de_credito_sin_retenciones" CHECK ("cuentas_por_pagar"."documentos"."tipo" <> 'nota_de_credito' or "cuentas_por_pagar"."documentos"."retenciones" = 0),
	CONSTRAINT "documentos_vencimiento_de_cargos" CHECK (("cuentas_por_pagar"."documentos"."tipo" = 'nota_de_credito') = ("cuentas_por_pagar"."documentos"."vencimiento" is null)),
	CONSTRAINT "documentos_vencimiento_desde_emision" CHECK ("cuentas_por_pagar"."documentos"."vencimiento" is null or "cuentas_por_pagar"."documentos"."vencimiento" >= "cuentas_por_pagar"."documentos"."fecha_emision"),
	CONSTRAINT "documentos_motivo_rango" CHECK ("cuentas_por_pagar"."documentos"."motivo_de_anulacion" is null or char_length("cuentas_por_pagar"."documentos"."motivo_de_anulacion") between 1 and 300),
	CONSTRAINT "documentos_registro_completo" CHECK (("cuentas_por_pagar"."documentos"."registrado_en" is null) = ("cuentas_por_pagar"."documentos"."registrado_por" is null) and ("cuentas_por_pagar"."documentos"."estado" not in ('registrado', 'autorizado') or "cuentas_por_pagar"."documentos"."registrado_en" is not null)),
	CONSTRAINT "documentos_autorizacion_completa" CHECK (("cuentas_por_pagar"."documentos"."autorizado_en" is null) = ("cuentas_por_pagar"."documentos"."autorizado_por" is null) and ("cuentas_por_pagar"."documentos"."estado" <> 'autorizado' or "cuentas_por_pagar"."documentos"."autorizado_en" is not null) and ("cuentas_por_pagar"."documentos"."autorizado_en" is not null or not "cuentas_por_pagar"."documentos"."autorizacion_propia")),
	CONSTRAINT "documentos_separacion_de_funciones" CHECK ("cuentas_por_pagar"."documentos"."autorizado_por" is null or "cuentas_por_pagar"."documentos"."autorizacion_propia" or ("cuentas_por_pagar"."documentos"."autorizado_por" is distinct from "cuentas_por_pagar"."documentos"."registrado_por" and "cuentas_por_pagar"."documentos"."autorizado_por" is distinct from "cuentas_por_pagar"."documentos"."creado_por")),
	CONSTRAINT "documentos_anulacion_completa" CHECK (("cuentas_por_pagar"."documentos"."estado" = 'anulado') = ("cuentas_por_pagar"."documentos"."anulado_en" is not null and "cuentas_por_pagar"."documentos"."anulado_por" is not null and "cuentas_por_pagar"."documentos"."motivo_de_anulacion" is not null and "cuentas_por_pagar"."documentos"."estaba_autorizado" is not null))
);
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."documentos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."aplicaciones_de_notas" ADD CONSTRAINT "aplicaciones_de_notas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."aplicaciones_de_notas" ADD CONSTRAINT "aplicaciones_nota_fk" FOREIGN KEY ("nota_id","empresa_id","proveedor_id") REFERENCES "cuentas_por_pagar"."documentos"("id","empresa_id","proveedor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."aplicaciones_de_notas" ADD CONSTRAINT "aplicaciones_cargo_fk" FOREIGN KEY ("cargo_id","empresa_id","proveedor_id") REFERENCES "cuentas_por_pagar"."documentos"("id","empresa_id","proveedor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."condiciones_de_proveedor" ADD CONSTRAINT "condiciones_de_proveedor_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."condiciones_de_proveedor" ADD CONSTRAINT "condiciones_proveedor_fk" FOREIGN KEY ("proveedor_id","cuenta_id") REFERENCES "terceros"."proveedores"("id","cuenta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."documentos" ADD CONSTRAINT "documentos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."documentos" ADD CONSTRAINT "documentos_documento_fk" FOREIGN KEY ("documento_id","empresa_id","proveedor_id","destino") REFERENCES "libro_de_compras"."documentos"("id","empresa_id","proveedor_id","destino") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "aplicaciones_cargo_idx" ON "cuentas_por_pagar"."aplicaciones_de_notas" USING btree ("cargo_id");--> statement-breakpoint
CREATE INDEX "documentos_afectado_idx" ON "cuentas_por_pagar"."documentos" USING btree ("documento_afectado_id") WHERE "cuentas_por_pagar"."documentos"."documento_afectado_id" is not null;--> statement-breakpoint
CREATE INDEX "documentos_bandeja_idx" ON "cuentas_por_pagar"."documentos" USING btree ("empresa_id","creado_en") WHERE "cuentas_por_pagar"."documentos"."estado" = 'pendiente';--> statement-breakpoint
CREATE INDEX "documentos_estado_idx" ON "cuentas_por_pagar"."documentos" USING btree ("empresa_id","estado","fecha_emision");--> statement-breakpoint
CREATE INDEX "documentos_proveedor_vencimiento_idx" ON "cuentas_por_pagar"."documentos" USING btree ("empresa_id","proveedor_id","vencimiento") WHERE "cuentas_por_pagar"."documentos"."estado" <> 'anulado';--> statement-breakpoint
CREATE INDEX "documentos_vencimiento_idx" ON "cuentas_por_pagar"."documentos" USING btree ("empresa_id","vencimiento") WHERE "cuentas_por_pagar"."documentos"."estado" <> 'anulado' and "cuentas_por_pagar"."documentos"."vencimiento" is not null;--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "cuentas_por_pagar"."aplicaciones_de_notas" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_cuenta" ON "cuentas_por_pagar"."condiciones_de_proveedor" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (cuenta_id = nullif(current_setting('app.cuenta_id', true), '')::uuid) WITH CHECK (cuenta_id = nullif(current_setting('app.cuenta_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "cuentas_por_pagar"."documentos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);
--> statement-breakpoint
-- La factura de una nota también está en Cuentas por pagar y es del mismo proveedor (drizzle-kit no escribe llaves
-- foráneas autorreferentes). Con MATCH SIMPLE, las filas sin documento_afectado_id (no son notas) no se revisan.
ALTER TABLE "cuentas_por_pagar"."documentos" ADD CONSTRAINT "documentos_factura_fk" FOREIGN KEY ("documento_afectado_id","empresa_id","proveedor_id") REFERENCES "cuentas_por_pagar"."documentos"("documento_id","empresa_id","proveedor_id") ON DELETE no action ON UPDATE no action;
