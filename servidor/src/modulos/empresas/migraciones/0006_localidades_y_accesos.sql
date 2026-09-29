CREATE TABLE "empresas"."accesos_a_localidades" (
	"empresa_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"localidad_id" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "accesos_a_localidades_empresa_id_usuario_id_localidad_id_pk" PRIMARY KEY("empresa_id","usuario_id","localidad_id")
);
--> statement-breakpoint
ALTER TABLE "empresas"."accesos_a_localidades" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "empresas"."localidades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"tipo_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"codigo_establecimiento_sat" integer,
	"nombre_comercial_sat" text,
	"departamento_codigo" char(2),
	"municipio_codigo" char(2),
	"direccion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "localidades_codigo_unico" UNIQUE("empresa_id","codigo"),
	CONSTRAINT "localidades_nombre_unico" UNIQUE("empresa_id","nombre"),
	CONSTRAINT "localidades_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "localidades_codigo_valido" CHECK ("empresas"."localidades"."codigo" ~ '^[A-Z0-9-]{1,12}$'),
	CONSTRAINT "localidades_nombre_valido" CHECK (char_length(trim("empresas"."localidades"."nombre")) between 1 and 120),
	CONSTRAINT "localidades_establecimiento_sat_positivo" CHECK ("empresas"."localidades"."codigo_establecimiento_sat" > 0),
	CONSTRAINT "localidades_nombre_sat_valido" CHECK ("empresas"."localidades"."nombre_comercial_sat" is null or char_length(trim("empresas"."localidades"."nombre_comercial_sat")) between 1 and 200),
	CONSTRAINT "localidades_direccion_valida" CHECK ("empresas"."localidades"."direccion" is null or char_length(trim("empresas"."localidades"."direccion")) between 1 and 300),
	CONSTRAINT "localidades_ubicacion_completa" CHECK (("empresas"."localidades"."departamento_codigo" is null) = ("empresas"."localidades"."municipio_codigo" is null)),
	CONSTRAINT "localidades_nombre_sat_con_codigo" CHECK ("empresas"."localidades"."nombre_comercial_sat" is null or "empresas"."localidades"."codigo_establecimiento_sat" is not null)
);
--> statement-breakpoint
ALTER TABLE "empresas"."localidades" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "empresas"."accesos_a_localidades" ADD CONSTRAINT "accesos_a_localidades_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresas"."accesos_a_localidades" ADD CONSTRAINT "accesos_a_localidades_localidad_fk" FOREIGN KEY ("localidad_id","empresa_id") REFERENCES "empresas"."localidades"("id","empresa_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresas"."accesos_a_localidades" ADD CONSTRAINT "accesos_a_localidades_miembro_fk" FOREIGN KEY ("empresa_id","usuario_id") REFERENCES "core"."empresa_usuarios"("empresa_id","usuario_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresas"."localidades" ADD CONSTRAINT "localidades_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresas"."localidades" ADD CONSTRAINT "localidades_tipo_fk" FOREIGN KEY ("tipo_id","empresa_id") REFERENCES "empresas"."tipos_de_localidad"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresas"."localidades" ADD CONSTRAINT "localidades_municipio_fk" FOREIGN KEY ("departamento_codigo","municipio_codigo") REFERENCES "core"."municipios"("departamento_codigo","codigo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accesos_a_localidades_localidad_idx" ON "empresas"."accesos_a_localidades" USING btree ("localidad_id");--> statement-breakpoint
CREATE UNIQUE INDEX "localidades_establecimiento_sat_unico" ON "empresas"."localidades" USING btree ("empresa_id","codigo_establecimiento_sat") WHERE "empresas"."localidades"."codigo_establecimiento_sat" is not null;--> statement-breakpoint
CREATE INDEX "localidades_tipo_idx" ON "empresas"."localidades" USING btree ("tipo_id");--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "empresas"."accesos_a_localidades" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "asignar_para_asignar" ON "empresas"."accesos_a_localidades" AS RESTRICTIVE FOR INSERT TO "arrancar_app" WITH CHECK ('empresas.localidades' = any (string_to_array((select current_setting('app.alcance_para_asignar', true)), ',')));--> statement-breakpoint
CREATE POLICY "cambiar_para_asignar" ON "empresas"."accesos_a_localidades" AS RESTRICTIVE FOR UPDATE TO "arrancar_app" USING ('empresas.localidades' = any (string_to_array((select current_setting('app.alcance_para_asignar', true)), ','))) WITH CHECK ('empresas.localidades' = any (string_to_array((select current_setting('app.alcance_para_asignar', true)), ',')));--> statement-breakpoint
CREATE POLICY "quitar_para_asignar" ON "empresas"."accesos_a_localidades" AS RESTRICTIVE FOR DELETE TO "arrancar_app" USING ('empresas.localidades' = any (string_to_array((select current_setting('app.alcance_para_asignar', true)), ',')));--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "empresas"."localidades" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "alcance_ver" ON "empresas"."localidades" AS RESTRICTIVE FOR SELECT TO "arrancar_app" USING ('empresas.localidades' = any (string_to_array((select current_setting('app.alcance_para_asignar', true)), ',')) or 'empresas.localidades' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or id in (
      select a.localidad_id from empresas.accesos_a_localidades a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    ));--> statement-breakpoint
CREATE POLICY "alcance_cambiar" ON "empresas"."localidades" AS RESTRICTIVE FOR UPDATE TO "arrancar_app" USING ('empresas.localidades' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or id in (
      select a.localidad_id from empresas.accesos_a_localidades a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    )) WITH CHECK ('empresas.localidades' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or id in (
      select a.localidad_id from empresas.accesos_a_localidades a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    ));--> statement-breakpoint
CREATE POLICY "alcance_eliminar" ON "empresas"."localidades" AS RESTRICTIVE FOR DELETE TO "arrancar_app" USING ('empresas.localidades' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or id in (
      select a.localidad_id from empresas.accesos_a_localidades a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    ));