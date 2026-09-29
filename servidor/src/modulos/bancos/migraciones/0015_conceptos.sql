CREATE TABLE "bancos"."conceptos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"aplica_a" text NOT NULL,
	"actividad_de_flujo" text NOT NULL,
	"grupo_de_flujo" text,
	"es_cargo_bancario" boolean DEFAULT false NOT NULL,
	"pide_datos_de_intereses" boolean DEFAULT false NOT NULL,
	"admite_factura" boolean DEFAULT false NOT NULL,
	"clave_de_sistema" text,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "conceptos_nombre_unico" UNIQUE("empresa_id","nombre")
);
--> statement-breakpoint
ALTER TABLE "bancos"."conceptos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bancos"."conceptos" ADD CONSTRAINT "conceptos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "conceptos_clave_de_sistema_unica" ON "bancos"."conceptos" USING btree ("empresa_id","clave_de_sistema") WHERE "bancos"."conceptos"."clave_de_sistema" is not null;--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "bancos"."conceptos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);