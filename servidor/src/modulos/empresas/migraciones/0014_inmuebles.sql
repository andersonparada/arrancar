CREATE TABLE "empresas"."inmuebles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"situacion_registral" text NOT NULL,
	"registro" text,
	"numero_de_finca" text,
	"folio" text,
	"libro" text,
	"departamento_registral" char(2),
	"documento_posesorio" text,
	"titulacion_supletoria_en_tramite" boolean DEFAULT false NOT NULL,
	"titularidad" text NOT NULL,
	"porcentaje_de_copropiedad" numeric(5, 2),
	"titular" text,
	"matricula_fiscal" text,
	"administra_iusi" text,
	"codigo_catastral" text,
	"departamento_codigo" char(2),
	"municipio_codigo" char(2),
	"direccion" text,
	"superficie_registral_m2" numeric(14, 2),
	"cantidad_original" numeric(16, 4),
	"unidad_original" text,
	"varas_por_lado_de_cuerda" smallint,
	"localidad_id" uuid,
	"observaciones" text,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "inmuebles_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "inmuebles_situacion_valida" CHECK ("empresas"."inmuebles"."situacion_registral" in ('inscrito', 'posesorio')),
	CONSTRAINT "inmuebles_registro_valido" CHECK ("empresas"."inmuebles"."registro" is null or "empresas"."inmuebles"."registro" in ('general', 'segundo')),
	CONSTRAINT "inmuebles_registro_completo" CHECK (("empresas"."inmuebles"."situacion_registral" = 'inscrito') = ("empresas"."inmuebles"."registro" is not null and "empresas"."inmuebles"."numero_de_finca" is not null and "empresas"."inmuebles"."folio" is not null and "empresas"."inmuebles"."libro" is not null and "empresas"."inmuebles"."departamento_registral" is not null)),
	CONSTRAINT "inmuebles_finca_valida" CHECK ("empresas"."inmuebles"."numero_de_finca" is null or (char_length("empresas"."inmuebles"."numero_de_finca") between 1 and 20 and "empresas"."inmuebles"."numero_de_finca" ~ '^[A-Za-z0-9 ./-]+$')),
	CONSTRAINT "inmuebles_folio_valido" CHECK ("empresas"."inmuebles"."folio" is null or (char_length("empresas"."inmuebles"."folio") between 1 and 20 and "empresas"."inmuebles"."folio" ~ '^[A-Za-z0-9 ./-]+$')),
	CONSTRAINT "inmuebles_libro_valido" CHECK ("empresas"."inmuebles"."libro" is null or (char_length("empresas"."inmuebles"."libro") between 1 and 20 and "empresas"."inmuebles"."libro" ~ '^[A-Za-z0-9 ./-]+$')),
	CONSTRAINT "inmuebles_documento_posesorio_valido" CHECK ("empresas"."inmuebles"."documento_posesorio" is null or char_length(trim("empresas"."inmuebles"."documento_posesorio")) between 1 and 300),
	CONSTRAINT "inmuebles_documento_solo_posesorio" CHECK ("empresas"."inmuebles"."documento_posesorio" is null or "empresas"."inmuebles"."situacion_registral" = 'posesorio'),
	CONSTRAINT "inmuebles_titulacion_solo_posesorio" CHECK (not "empresas"."inmuebles"."titulacion_supletoria_en_tramite" or "empresas"."inmuebles"."situacion_registral" = 'posesorio'),
	CONSTRAINT "inmuebles_nombre_valido" CHECK (char_length(trim("empresas"."inmuebles"."nombre")) between 1 and 120),
	CONSTRAINT "inmuebles_titularidad_valida" CHECK ("empresas"."inmuebles"."titularidad" in ('propia', 'copropiedad', 'de_tercero')),
	CONSTRAINT "inmuebles_porcentaje_valido" CHECK ("empresas"."inmuebles"."porcentaje_de_copropiedad" is null or ("empresas"."inmuebles"."porcentaje_de_copropiedad" > 0 and "empresas"."inmuebles"."porcentaje_de_copropiedad" < 100)),
	CONSTRAINT "inmuebles_copropiedad_con_porcentaje" CHECK (("empresas"."inmuebles"."titularidad" = 'copropiedad') = ("empresas"."inmuebles"."porcentaje_de_copropiedad" is not null)),
	CONSTRAINT "inmuebles_titular_valido" CHECK ("empresas"."inmuebles"."titular" is null or char_length(trim("empresas"."inmuebles"."titular")) between 1 and 150),
	CONSTRAINT "inmuebles_matricula_valida" CHECK ("empresas"."inmuebles"."matricula_fiscal" is null or char_length(trim("empresas"."inmuebles"."matricula_fiscal")) between 1 and 30),
	CONSTRAINT "inmuebles_iusi_valido" CHECK ("empresas"."inmuebles"."administra_iusi" is null or "empresas"."inmuebles"."administra_iusi" in ('dicabi', 'municipalidad')),
	CONSTRAINT "inmuebles_catastro_valido" CHECK ("empresas"."inmuebles"."codigo_catastral" is null or char_length(trim("empresas"."inmuebles"."codigo_catastral")) between 1 and 40),
	CONSTRAINT "inmuebles_ubicacion_completa" CHECK (("empresas"."inmuebles"."departamento_codigo" is null) = ("empresas"."inmuebles"."municipio_codigo" is null)),
	CONSTRAINT "inmuebles_direccion_valida" CHECK ("empresas"."inmuebles"."direccion" is null or char_length(trim("empresas"."inmuebles"."direccion")) between 1 and 300),
	CONSTRAINT "inmuebles_superficie_positiva" CHECK ("empresas"."inmuebles"."superficie_registral_m2" is null or "empresas"."inmuebles"."superficie_registral_m2" > 0),
	CONSTRAINT "inmuebles_cantidad_positiva" CHECK ("empresas"."inmuebles"."cantidad_original" is null or "empresas"."inmuebles"."cantidad_original" > 0),
	CONSTRAINT "inmuebles_unidad_valida" CHECK ("empresas"."inmuebles"."unidad_original" is null or "empresas"."inmuebles"."unidad_original" in ('m2', 'hectarea', 'manzana', 'cuerda', 'vara_cuadrada', 'caballeria')),
	CONSTRAINT "inmuebles_cifra_completa" CHECK (("empresas"."inmuebles"."cantidad_original" is null) = ("empresas"."inmuebles"."unidad_original" is null)),
	CONSTRAINT "inmuebles_varas_validas" CHECK (("empresas"."inmuebles"."unidad_original" is not distinct from 'cuerda') = ("empresas"."inmuebles"."varas_por_lado_de_cuerda" is not null) and ("empresas"."inmuebles"."varas_por_lado_de_cuerda" is null or "empresas"."inmuebles"."varas_por_lado_de_cuerda" between 1 and 100)),
	CONSTRAINT "inmuebles_observaciones_validas" CHECK ("empresas"."inmuebles"."observaciones" is null or char_length(trim("empresas"."inmuebles"."observaciones")) between 1 and 500)
);
--> statement-breakpoint
ALTER TABLE "empresas"."inmuebles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "empresas"."inmuebles" ADD CONSTRAINT "inmuebles_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresas"."inmuebles" ADD CONSTRAINT "inmuebles_departamento_registral_departamentos_codigo_fk" FOREIGN KEY ("departamento_registral") REFERENCES "core"."departamentos"("codigo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresas"."inmuebles" ADD CONSTRAINT "inmuebles_localidad_fk" FOREIGN KEY ("localidad_id","empresa_id") REFERENCES "empresas"."localidades"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresas"."inmuebles" ADD CONSTRAINT "inmuebles_municipio_fk" FOREIGN KEY ("departamento_codigo","municipio_codigo") REFERENCES "core"."municipios"("departamento_codigo","codigo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inmuebles_nombre_unico" ON "empresas"."inmuebles" USING btree ("empresa_id",core.nombre_normalizado("nombre"));--> statement-breakpoint
CREATE UNIQUE INDEX "inmuebles_registro_unico" ON "empresas"."inmuebles" USING btree ("empresa_id","registro","departamento_registral",upper("numero_de_finca"),upper("folio"),upper("libro")) WHERE "empresas"."inmuebles"."situacion_registral" = 'inscrito';--> statement-breakpoint
CREATE INDEX "inmuebles_matricula_idx" ON "empresas"."inmuebles" USING btree ("empresa_id","matricula_fiscal") WHERE "empresas"."inmuebles"."matricula_fiscal" is not null;--> statement-breakpoint
CREATE INDEX "inmuebles_localidad_idx" ON "empresas"."inmuebles" USING btree ("localidad_id") WHERE "empresas"."inmuebles"."localidad_id" is not null;--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "empresas"."inmuebles" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "alcance_empresas_localidades" ON "empresas"."inmuebles" AS RESTRICTIVE FOR ALL TO "arrancar_app" USING (localidad_id is null or 'empresas.localidades' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or localidad_id in (
      select a.localidad_id from empresas.accesos_a_localidades a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    )) WITH CHECK (localidad_id is null or 'empresas.localidades' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or localidad_id in (
      select a.localidad_id from empresas.accesos_a_localidades a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    ));--> statement-breakpoint
-- PA-0a: la auditoría de los inmuebles no se depura mientras exista la empresa (catálogo de la migración 0024 del core).
INSERT INTO "core"."recursos_de_auditoria_permanente" ("recurso", "motivo")
VALUES (
  'empresas.inmuebles',
  'Contratos y títulos de inmuebles: plazos de hasta décadas más la prescripción (Código Tributario arts. 47 y 112) y la conservación de libros y documentos (Código de Comercio art. 382).'
)
ON CONFLICT DO NOTHING;
