CREATE TABLE "core"."correlativos" (
	"empresa_id" uuid NOT NULL,
	"clave" text NOT NULL,
	"anio" integer DEFAULT 0 NOT NULL,
	"siguiente" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "correlativos_empresa_id_clave_anio_pk" PRIMARY KEY("empresa_id","clave","anio"),
	CONSTRAINT "correlativos_siguiente_positivo" CHECK ("core"."correlativos"."siguiente" > 0)
);
--> statement-breakpoint
ALTER TABLE "core"."correlativos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "core"."correlativos" ADD CONSTRAINT "correlativos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "core"."correlativos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);