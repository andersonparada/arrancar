CREATE TABLE "inventarios"."accesos_a_bodegas" (
	"empresa_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"bodega_id" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "accesos_a_bodegas_empresa_id_usuario_id_bodega_id_pk" PRIMARY KEY("empresa_id","usuario_id","bodega_id")
);
--> statement-breakpoint
ALTER TABLE "inventarios"."accesos_a_bodegas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventarios"."bodegas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"localidad_id" uuid,
	"responsable" text,
	"responsable_usuario_id" uuid,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "bodegas_codigo_unico" UNIQUE("empresa_id","codigo"),
	CONSTRAINT "bodegas_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "bodegas_codigo_valido" CHECK ("inventarios"."bodegas"."codigo" ~ '^[A-Z0-9-]{1,12}$'),
	CONSTRAINT "bodegas_nombre_largo" CHECK (char_length(btrim("inventarios"."bodegas"."nombre")) between 1 and 120),
	CONSTRAINT "bodegas_responsable_largo" CHECK ("inventarios"."bodegas"."responsable" is null or char_length(btrim("inventarios"."bodegas"."responsable")) between 1 and 150)
);
--> statement-breakpoint
ALTER TABLE "inventarios"."bodegas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inventarios"."accesos_a_bodegas" ADD CONSTRAINT "accesos_a_bodegas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."accesos_a_bodegas" ADD CONSTRAINT "accesos_a_bodegas_bodega_fk" FOREIGN KEY ("bodega_id","empresa_id") REFERENCES "inventarios"."bodegas"("id","empresa_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."accesos_a_bodegas" ADD CONSTRAINT "accesos_a_bodegas_miembro_fk" FOREIGN KEY ("empresa_id","usuario_id") REFERENCES "core"."empresa_usuarios"("empresa_id","usuario_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."bodegas" ADD CONSTRAINT "bodegas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."bodegas" ADD CONSTRAINT "bodegas_responsable_usuario_id_usuarios_id_fk" FOREIGN KEY ("responsable_usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."bodegas" ADD CONSTRAINT "bodegas_localidad_fk" FOREIGN KEY ("localidad_id","empresa_id") REFERENCES "empresas"."localidades"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accesos_a_bodegas_bodega_idx" ON "inventarios"."accesos_a_bodegas" USING btree ("bodega_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bodegas_nombre_unico" ON "inventarios"."bodegas" USING btree ("empresa_id",core.nombre_normalizado("nombre"));--> statement-breakpoint
CREATE INDEX "bodegas_localidad_idx" ON "inventarios"."bodegas" USING btree ("localidad_id") WHERE "inventarios"."bodegas"."localidad_id" is not null;--> statement-breakpoint
CREATE INDEX "bodegas_responsable_idx" ON "inventarios"."bodegas" USING btree ("responsable_usuario_id") WHERE "inventarios"."bodegas"."responsable_usuario_id" is not null;--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "inventarios"."accesos_a_bodegas" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "asignar_para_asignar" ON "inventarios"."accesos_a_bodegas" AS RESTRICTIVE FOR INSERT TO "arrancar_app" WITH CHECK ('inventarios.bodegas' = any (string_to_array((select current_setting('app.alcance_para_asignar', true)), ',')));--> statement-breakpoint
CREATE POLICY "cambiar_para_asignar" ON "inventarios"."accesos_a_bodegas" AS RESTRICTIVE FOR UPDATE TO "arrancar_app" USING ('inventarios.bodegas' = any (string_to_array((select current_setting('app.alcance_para_asignar', true)), ','))) WITH CHECK ('inventarios.bodegas' = any (string_to_array((select current_setting('app.alcance_para_asignar', true)), ',')));--> statement-breakpoint
CREATE POLICY "quitar_para_asignar" ON "inventarios"."accesos_a_bodegas" AS RESTRICTIVE FOR DELETE TO "arrancar_app" USING ('inventarios.bodegas' = any (string_to_array((select current_setting('app.alcance_para_asignar', true)), ',')));--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "inventarios"."bodegas" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "alcance_ver" ON "inventarios"."bodegas" AS RESTRICTIVE FOR SELECT TO "arrancar_app" USING ('inventarios.bodegas' = any (string_to_array((select current_setting('app.alcance_para_asignar', true)), ',')) or 'inventarios.bodegas' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or id in (
      select a.bodega_id from inventarios.accesos_a_bodegas a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    ));--> statement-breakpoint
CREATE POLICY "alcance_cambiar" ON "inventarios"."bodegas" AS RESTRICTIVE FOR UPDATE TO "arrancar_app" USING ('inventarios.bodegas' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or id in (
      select a.bodega_id from inventarios.accesos_a_bodegas a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    )) WITH CHECK ('inventarios.bodegas' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or id in (
      select a.bodega_id from inventarios.accesos_a_bodegas a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    ));--> statement-breakpoint
CREATE POLICY "alcance_eliminar" ON "inventarios"."bodegas" AS RESTRICTIVE FOR DELETE TO "arrancar_app" USING ('inventarios.bodegas' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or id in (
      select a.bodega_id from inventarios.accesos_a_bodegas a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    ));
--> statement-breakpoint
-- Quien crea una bodega queda con acceso a ella (la función es del core y sirve a cualquier tabla de accesos; no actúa
-- al importar desde Excel ni sin usuario en la transacción). Corre como el dueño de la tabla (sin RLS).
CREATE TRIGGER asignar_al_creador AFTER INSERT ON inventarios.bodegas
  FOR EACH ROW EXECUTE FUNCTION core.asignar_registro_al_creador('inventarios.accesos_a_bodegas', 'bodega_id');--> statement-breakpoint
-- El responsable que es usuario de la empresa recibe acceso a su bodega al nombrarlo, sin necesitar el permiso de
-- asignar. Al cambiar de responsable el anterior conserva su acceso (se quita en la ventana de asignación). Corre como
-- el dueño (sin RLS), con `search_path` vacío; solo da acceso a un miembro de la empresa de la propia bodega.
CREATE FUNCTION inventarios.asignar_bodega_al_responsable() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  quien uuid := nullif(current_setting('app.usuario_id', true), '')::uuid;
BEGIN
  IF new.responsable_usuario_id IS NULL THEN RETURN NULL; END IF;
  INSERT INTO inventarios.accesos_a_bodegas (empresa_id, usuario_id, bodega_id, creado_por, actualizado_por)
  SELECT new.empresa_id, new.responsable_usuario_id, new.id, quien, quien
  WHERE EXISTS (SELECT 1 FROM core.empresa_usuarios eu
                WHERE eu.empresa_id = new.empresa_id AND eu.usuario_id = new.responsable_usuario_id)
  ON CONFLICT DO NOTHING;
  RETURN NULL;
END $$;--> statement-breakpoint
REVOKE ALL ON FUNCTION inventarios.asignar_bodega_al_responsable() FROM PUBLIC;--> statement-breakpoint
CREATE TRIGGER asignar_bodega_al_responsable AFTER INSERT OR UPDATE OF responsable_usuario_id ON inventarios.bodegas
  FOR EACH ROW EXECUTE FUNCTION inventarios.asignar_bodega_al_responsable();
