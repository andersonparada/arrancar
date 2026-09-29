CREATE TABLE "empresas"."cargas_iniciales" (
	"empresa_id" uuid PRIMARY KEY NOT NULL,
	"fecha_de_inicio" date NOT NULL,
	"cerrada_en" timestamp with time zone,
	"cerrada_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "cargas_iniciales_cierre_completo" CHECK (("empresas"."cargas_iniciales"."cerrada_en" is null) = ("empresas"."cargas_iniciales"."cerrada_por" is null))
);
--> statement-breakpoint
ALTER TABLE "empresas"."cargas_iniciales" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "empresas"."datos_fiscales" (
	"empresa_id" uuid PRIMARY KEY NOT NULL,
	"razon_social" text,
	"nombre_comercial" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "datos_fiscales_razon_social_largo" CHECK ("empresas"."datos_fiscales"."razon_social" is null or char_length("empresas"."datos_fiscales"."razon_social") between 1 and 200),
	CONSTRAINT "datos_fiscales_nombre_comercial_largo" CHECK ("empresas"."datos_fiscales"."nombre_comercial" is null or char_length("empresas"."datos_fiscales"."nombre_comercial") between 1 and 200)
);
--> statement-breakpoint
ALTER TABLE "empresas"."datos_fiscales" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "empresas"."cargas_iniciales" ADD CONSTRAINT "cargas_iniciales_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresas"."datos_fiscales" ADD CONSTRAINT "datos_fiscales_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "empresas"."cargas_iniciales" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "empresas"."datos_fiscales" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);