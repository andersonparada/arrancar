CREATE TABLE "bancos"."cuentas_bancarias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"banco_id" uuid NOT NULL,
	"numero" text NOT NULL,
	"tipo" text NOT NULL,
	"observaciones" text,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "cuentas_bancarias_nombre_unico" UNIQUE("empresa_id","nombre"),
	CONSTRAINT "cuentas_bancarias_numero_unico" UNIQUE("empresa_id","numero")
);
--> statement-breakpoint
ALTER TABLE "bancos"."cuentas_bancarias" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bancos"."cuentas_bancarias" ADD CONSTRAINT "cuentas_bancarias_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bancos"."cuentas_bancarias" ADD CONSTRAINT "cuentas_bancarias_banco_id_bancos_id_fk" FOREIGN KEY ("banco_id") REFERENCES "bancos"."bancos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cuentas_bancarias_banco_idx" ON "bancos"."cuentas_bancarias" USING btree ("banco_id");--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "bancos"."cuentas_bancarias" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);