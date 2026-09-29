CREATE TABLE "empresas"."departamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"localidad_id" uuid,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "departamentos_codigo_unico" UNIQUE("empresa_id","codigo"),
	CONSTRAINT "departamentos_nombre_unico" UNIQUE("empresa_id","nombre"),
	CONSTRAINT "departamentos_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "departamentos_codigo_valido" CHECK ("empresas"."departamentos"."codigo" ~ '^[A-Z0-9-]{1,12}$'),
	CONSTRAINT "departamentos_nombre_valido" CHECK (char_length(trim("empresas"."departamentos"."nombre")) between 1 and 120)
);
--> statement-breakpoint
ALTER TABLE "empresas"."departamentos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "empresas"."departamentos" ADD CONSTRAINT "departamentos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresas"."departamentos" ADD CONSTRAINT "departamentos_localidad_fk" FOREIGN KEY ("localidad_id","empresa_id") REFERENCES "empresas"."localidades"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "departamentos_localidad_idx" ON "empresas"."departamentos" USING btree ("localidad_id");--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "empresas"."departamentos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "alcance_empresas_localidades" ON "empresas"."departamentos" AS RESTRICTIVE FOR ALL TO "arrancar_app" USING (localidad_id is null or 'empresas.localidades' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or localidad_id in (
      select a.localidad_id from empresas.accesos_a_localidades a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    )) WITH CHECK (localidad_id is null or 'empresas.localidades' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or localidad_id in (
      select a.localidad_id from empresas.accesos_a_localidades a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    ));