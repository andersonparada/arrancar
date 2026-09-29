CREATE TABLE "empresas"."tipos_de_localidad" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "tipos_de_localidad_nombre_unico" UNIQUE("empresa_id","nombre"),
	CONSTRAINT "tipos_de_localidad_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "tipos_de_localidad_nombre_valido" CHECK (char_length(trim("empresas"."tipos_de_localidad"."nombre")) between 1 and 60)
);
--> statement-breakpoint
ALTER TABLE "empresas"."tipos_de_localidad" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "empresas"."tipos_de_localidad" ADD CONSTRAINT "tipos_de_localidad_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "empresas"."tipos_de_localidad" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);