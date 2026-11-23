CREATE TABLE "activos_fijos"."boletas_firmadas" (
	"empresa_id" uuid NOT NULL,
	"grupo_id" uuid NOT NULL,
	"archivo_id" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "boletas_firmadas_pk" PRIMARY KEY("empresa_id","grupo_id"),
	CONSTRAINT "boletas_firmadas_archivo_unico" UNIQUE("archivo_id")
);
--> statement-breakpoint
ALTER TABLE "activos_fijos"."boletas_firmadas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "activos_fijos"."boletas_firmadas" ADD CONSTRAINT "boletas_firmadas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."boletas_firmadas" ADD CONSTRAINT "boletas_firmadas_archivo_id_archivos_id_fk" FOREIGN KEY ("archivo_id") REFERENCES "core"."archivos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "activos_fijos"."boletas_firmadas" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);