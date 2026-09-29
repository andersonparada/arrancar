CREATE TABLE "libro_de_compras"."datos_fiscales_de_empresa" (
	"empresa_id" uuid PRIMARY KEY NOT NULL,
	"regimen_iva" text DEFAULT 'general' NOT NULL,
	"regimen_isr" text DEFAULT 'utilidades' NOT NULL,
	"agente_de_retencion_iva" text DEFAULT 'ninguno' NOT NULL,
	"es_agente_de_retencion_isr" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "datos_fiscales_de_empresa_regimen_iva" CHECK ("libro_de_compras"."datos_fiscales_de_empresa"."regimen_iva" in ('general', 'pequeno_contribuyente')),
	CONSTRAINT "datos_fiscales_de_empresa_regimen_isr" CHECK ("libro_de_compras"."datos_fiscales_de_empresa"."regimen_isr" in ('utilidades', 'opcional_simplificado')),
	CONSTRAINT "datos_fiscales_de_empresa_agente_de_iva" CHECK ("libro_de_compras"."datos_fiscales_de_empresa"."agente_de_retencion_iva" in ('ninguno', 'exportador', 'contribuyente_especial', 'sector_publico', 'otro')),
	CONSTRAINT "datos_fiscales_de_empresa_pequeno_no_retiene" CHECK ("libro_de_compras"."datos_fiscales_de_empresa"."regimen_iva" <> 'pequeno_contribuyente' or "libro_de_compras"."datos_fiscales_de_empresa"."agente_de_retencion_iva" = 'ninguno')
);
--> statement-breakpoint
ALTER TABLE "libro_de_compras"."datos_fiscales_de_empresa" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "libro_de_compras"."datos_fiscales_de_proveedor" (
	"proveedor_id" uuid PRIMARY KEY NOT NULL,
	"cuenta_id" uuid DEFAULT nullif(current_setting('app.cuenta_id', true), '')::uuid NOT NULL,
	"es_pequeno_contribuyente" boolean DEFAULT false NOT NULL,
	"regimen_isr" text,
	"es_agente_de_retencion_iva" boolean DEFAULT false NOT NULL,
	"se_le_retiene_iva" boolean NOT NULL,
	"se_le_retiene_isr" boolean NOT NULL,
	"se_le_retiene_iva_pequeno_contribuyente" boolean NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "datos_fiscales_de_proveedor_regimen_isr_valido" CHECK ("libro_de_compras"."datos_fiscales_de_proveedor"."regimen_isr" is null or "libro_de_compras"."datos_fiscales_de_proveedor"."regimen_isr" in ('utilidades', 'opcional_simplificado', 'no_domiciliado')),
	CONSTRAINT "datos_fiscales_de_proveedor_regimen_isr" CHECK (("libro_de_compras"."datos_fiscales_de_proveedor"."es_pequeno_contribuyente" and "libro_de_compras"."datos_fiscales_de_proveedor"."regimen_isr" is null) or (not "libro_de_compras"."datos_fiscales_de_proveedor"."es_pequeno_contribuyente" and "libro_de_compras"."datos_fiscales_de_proveedor"."regimen_isr" is not null)),
	CONSTRAINT "datos_fiscales_de_proveedor_pequeno_no_es_agente" CHECK (not ("libro_de_compras"."datos_fiscales_de_proveedor"."es_pequeno_contribuyente" and "libro_de_compras"."datos_fiscales_de_proveedor"."es_agente_de_retencion_iva")),
	CONSTRAINT "datos_fiscales_de_proveedor_retencion_iva_pequeno" CHECK (not "libro_de_compras"."datos_fiscales_de_proveedor"."se_le_retiene_iva_pequeno_contribuyente" or "libro_de_compras"."datos_fiscales_de_proveedor"."es_pequeno_contribuyente"),
	CONSTRAINT "datos_fiscales_de_proveedor_retencion_iva_general" CHECK (not ("libro_de_compras"."datos_fiscales_de_proveedor"."se_le_retiene_iva" and "libro_de_compras"."datos_fiscales_de_proveedor"."es_pequeno_contribuyente")),
	CONSTRAINT "datos_fiscales_de_proveedor_retencion_isr" CHECK (not ("libro_de_compras"."datos_fiscales_de_proveedor"."se_le_retiene_isr" and "libro_de_compras"."datos_fiscales_de_proveedor"."es_pequeno_contribuyente"))
);
--> statement-breakpoint
ALTER TABLE "libro_de_compras"."datos_fiscales_de_proveedor" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."datos_fiscales_de_empresa" ADD CONSTRAINT "datos_fiscales_de_empresa_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."datos_fiscales_de_proveedor" ADD CONSTRAINT "datos_fiscales_de_proveedor_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."datos_fiscales_de_proveedor" ADD CONSTRAINT "datos_fiscales_de_proveedor_proveedor_fk" FOREIGN KEY ("proveedor_id","cuenta_id") REFERENCES "terceros"."proveedores"("id","cuenta_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "datos_fiscales_de_proveedor_cuenta_idx" ON "libro_de_compras"."datos_fiscales_de_proveedor" USING btree ("cuenta_id");--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "libro_de_compras"."datos_fiscales_de_empresa" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_cuenta" ON "libro_de_compras"."datos_fiscales_de_proveedor" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (cuenta_id = nullif(current_setting('app.cuenta_id', true), '')::uuid) WITH CHECK (cuenta_id = nullif(current_setting('app.cuenta_id', true), '')::uuid);