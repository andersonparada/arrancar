CREATE SCHEMA "parcelas";
--> statement-breakpoint
CREATE TABLE "parcelas"."mediciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"parcela_id" uuid NOT NULL,
	"vigente_desde" date NOT NULL,
	"fuente" text NOT NULL,
	"superficie_total_m2" numeric(14, 2) NOT NULL,
	"superficie_util_m2" numeric(14, 2) NOT NULL,
	"cantidad_original" numeric(16, 4) NOT NULL,
	"unidad_original" text NOT NULL,
	"varas_por_lado_de_cuerda" smallint,
	"documento" text,
	"archivo_id" uuid,
	"estado" text DEFAULT 'vigente' NOT NULL,
	"anulada_en" timestamp with time zone,
	"anulada_por" uuid,
	"motivo_de_anulacion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "mediciones_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "mediciones_fuente_valida" CHECK ("parcelas"."mediciones"."fuente" in ('escritura', 'plano_topografico', 'gps', 'estimacion', 'otra')),
	CONSTRAINT "mediciones_superficie_valida" CHECK ("parcelas"."mediciones"."superficie_total_m2" > 0 and "parcelas"."mediciones"."superficie_util_m2" > 0 and "parcelas"."mediciones"."superficie_util_m2" <= "parcelas"."mediciones"."superficie_total_m2"),
	CONSTRAINT "mediciones_cantidad_positiva" CHECK ("parcelas"."mediciones"."cantidad_original" > 0),
	CONSTRAINT "mediciones_unidad_valida" CHECK ("parcelas"."mediciones"."unidad_original" in ('m2', 'hectarea', 'manzana', 'cuerda', 'vara_cuadrada', 'caballeria')),
	CONSTRAINT "mediciones_varas_validas" CHECK (("parcelas"."mediciones"."unidad_original" = 'cuerda') = ("parcelas"."mediciones"."varas_por_lado_de_cuerda" is not null) and ("parcelas"."mediciones"."varas_por_lado_de_cuerda" is null or "parcelas"."mediciones"."varas_por_lado_de_cuerda" between 1 and 100)),
	CONSTRAINT "mediciones_documento_valido" CHECK ("parcelas"."mediciones"."documento" is null or char_length(trim("parcelas"."mediciones"."documento")) between 1 and 150),
	CONSTRAINT "mediciones_estado_valido" CHECK ("parcelas"."mediciones"."estado" in ('vigente', 'anulada')),
	CONSTRAINT "mediciones_anulacion_completa" CHECK (("parcelas"."mediciones"."estado" = 'anulada') = ("parcelas"."mediciones"."anulada_en" is not null and "parcelas"."mediciones"."anulada_por" is not null and "parcelas"."mediciones"."motivo_de_anulacion" is not null)),
	CONSTRAINT "mediciones_motivo_valido" CHECK ("parcelas"."mediciones"."motivo_de_anulacion" is null or char_length(trim("parcelas"."mediciones"."motivo_de_anulacion")) between 1 and 300)
);
--> statement-breakpoint
ALTER TABLE "parcelas"."mediciones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "parcelas"."parcelas_de_inmuebles" (
	"parcela_id" uuid NOT NULL,
	"inmueble_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"superficie_m2" numeric(14, 2),
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "parcelas_de_inmuebles_pk" PRIMARY KEY("parcela_id","inmueble_id"),
	CONSTRAINT "parcelas_de_inmuebles_superficie_valida" CHECK ("parcelas"."parcelas_de_inmuebles"."superficie_m2" is null or "parcelas"."parcelas_de_inmuebles"."superficie_m2" > 0)
);
--> statement-breakpoint
ALTER TABLE "parcelas"."parcelas_de_inmuebles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "parcelas"."parcelas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"localidad_id" uuid NOT NULL,
	"parcela_madre_id" uuid,
	"nivel" smallint NOT NULL,
	"tipo_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"forma_de_tenencia" text NOT NULL,
	"superficie_total_m2" numeric(14, 2),
	"superficie_util_m2" numeric(14, 2),
	"latitud" numeric(9, 6),
	"longitud" numeric(9, 6),
	"colindancia_norte" text,
	"colindancia_sur" text,
	"colindancia_oriente" text,
	"colindancia_poniente" text,
	"activo" boolean DEFAULT true NOT NULL,
	"observaciones" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "parcelas_codigo_unico" UNIQUE("empresa_id","codigo"),
	CONSTRAINT "parcelas_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "parcelas_id_empresa_localidad_unico" UNIQUE("id","empresa_id","localidad_id"),
	CONSTRAINT "parcelas_codigo_valido" CHECK ("parcelas"."parcelas"."codigo" ~ '^[A-Z0-9-]{1,20}$'),
	CONSTRAINT "parcelas_nombre_valido" CHECK (char_length(trim("parcelas"."parcelas"."nombre")) between 1 and 120),
	CONSTRAINT "parcelas_tenencia_valida" CHECK ("parcelas"."parcelas"."forma_de_tenencia" in ('propia', 'posesion', 'copropiedad', 'arrendada', 'usufructo', 'comodato', 'aparceria', 'otra')),
	CONSTRAINT "parcelas_nivel_valido" CHECK ("parcelas"."parcelas"."nivel" between 1 and 5),
	CONSTRAINT "parcelas_nivel_y_madre" CHECK (("parcelas"."parcelas"."nivel" = 1) = ("parcelas"."parcelas"."parcela_madre_id" is null)),
	CONSTRAINT "parcelas_madre_distinta" CHECK ("parcelas"."parcelas"."parcela_madre_id" is null or "parcelas"."parcelas"."parcela_madre_id" <> "parcelas"."parcelas"."id"),
	CONSTRAINT "parcelas_superficie_completa" CHECK (("parcelas"."parcelas"."superficie_total_m2" is null) = ("parcelas"."parcelas"."superficie_util_m2" is null)),
	CONSTRAINT "parcelas_superficie_valida" CHECK ("parcelas"."parcelas"."superficie_total_m2" is null or ("parcelas"."parcelas"."superficie_total_m2" > 0 and "parcelas"."parcelas"."superficie_util_m2" > 0 and "parcelas"."parcelas"."superficie_util_m2" <= "parcelas"."parcelas"."superficie_total_m2")),
	CONSTRAINT "parcelas_punto_completo" CHECK (("parcelas"."parcelas"."latitud" is null) = ("parcelas"."parcelas"."longitud" is null)),
	CONSTRAINT "parcelas_punto_valido" CHECK ("parcelas"."parcelas"."latitud" is null or ("parcelas"."parcelas"."latitud" between -90 and 90 and "parcelas"."parcelas"."longitud" between -180 and 180)),
	CONSTRAINT "parcelas_colindancia_norte_valida" CHECK ("parcelas"."parcelas"."colindancia_norte" is null or char_length(trim("parcelas"."parcelas"."colindancia_norte")) between 1 and 300),
	CONSTRAINT "parcelas_colindancia_sur_valida" CHECK ("parcelas"."parcelas"."colindancia_sur" is null or char_length(trim("parcelas"."parcelas"."colindancia_sur")) between 1 and 300),
	CONSTRAINT "parcelas_colindancia_oriente_valida" CHECK ("parcelas"."parcelas"."colindancia_oriente" is null or char_length(trim("parcelas"."parcelas"."colindancia_oriente")) between 1 and 300),
	CONSTRAINT "parcelas_colindancia_poniente_valida" CHECK ("parcelas"."parcelas"."colindancia_poniente" is null or char_length(trim("parcelas"."parcelas"."colindancia_poniente")) between 1 and 300),
	CONSTRAINT "parcelas_observaciones_validas" CHECK ("parcelas"."parcelas"."observaciones" is null or char_length(trim("parcelas"."parcelas"."observaciones")) between 1 and 500)
);
--> statement-breakpoint
ALTER TABLE "parcelas"."parcelas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "parcelas"."tipos_de_parcela" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "tipos_de_parcela_id_empresa_unico" UNIQUE("id","empresa_id")
);
--> statement-breakpoint
ALTER TABLE "parcelas"."tipos_de_parcela" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "parcelas"."mediciones" ADD CONSTRAINT "mediciones_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcelas"."mediciones" ADD CONSTRAINT "mediciones_archivo_id_archivos_id_fk" FOREIGN KEY ("archivo_id") REFERENCES "core"."archivos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcelas"."mediciones" ADD CONSTRAINT "mediciones_parcela_fk" FOREIGN KEY ("parcela_id","empresa_id") REFERENCES "parcelas"."parcelas"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcelas"."parcelas_de_inmuebles" ADD CONSTRAINT "parcelas_de_inmuebles_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcelas"."parcelas_de_inmuebles" ADD CONSTRAINT "parcelas_de_inmuebles_parcela_fk" FOREIGN KEY ("parcela_id","empresa_id") REFERENCES "parcelas"."parcelas"("id","empresa_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcelas"."parcelas_de_inmuebles" ADD CONSTRAINT "parcelas_de_inmuebles_inmueble_fk" FOREIGN KEY ("inmueble_id","empresa_id") REFERENCES "empresas"."inmuebles"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcelas"."parcelas" ADD CONSTRAINT "parcelas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcelas"."parcelas" ADD CONSTRAINT "parcelas_localidad_fk" FOREIGN KEY ("localidad_id","empresa_id") REFERENCES "empresas"."localidades"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcelas"."parcelas" ADD CONSTRAINT "parcelas_tipo_fk" FOREIGN KEY ("tipo_id","empresa_id") REFERENCES "parcelas"."tipos_de_parcela"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcelas"."parcelas" ADD CONSTRAINT "parcelas_madre_fk" FOREIGN KEY ("parcela_madre_id","empresa_id","localidad_id") REFERENCES "parcelas"."parcelas"("id","empresa_id","localidad_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcelas"."tipos_de_parcela" ADD CONSTRAINT "tipos_de_parcela_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mediciones_fecha_unica" ON "parcelas"."mediciones" USING btree ("parcela_id","vigente_desde") WHERE "parcelas"."mediciones"."estado" = 'vigente';--> statement-breakpoint
CREATE UNIQUE INDEX "mediciones_archivo_unico" ON "parcelas"."mediciones" USING btree ("archivo_id") WHERE "parcelas"."mediciones"."archivo_id" is not null;--> statement-breakpoint
CREATE INDEX "mediciones_parcela_idx" ON "parcelas"."mediciones" USING btree ("parcela_id","vigente_desde" DESC NULLS LAST) WHERE "parcelas"."mediciones"."estado" = 'vigente';--> statement-breakpoint
CREATE INDEX "parcelas_de_inmuebles_inmueble_idx" ON "parcelas"."parcelas_de_inmuebles" USING btree ("inmueble_id");--> statement-breakpoint
CREATE UNIQUE INDEX "parcelas_nombre_unico" ON "parcelas"."parcelas" USING btree ("empresa_id","localidad_id",core.nombre_normalizado("nombre"));--> statement-breakpoint
CREATE INDEX "parcelas_localidad_idx" ON "parcelas"."parcelas" USING btree ("empresa_id","localidad_id","activo");--> statement-breakpoint
CREATE INDEX "parcelas_madre_idx" ON "parcelas"."parcelas" USING btree ("parcela_madre_id") WHERE "parcelas"."parcelas"."parcela_madre_id" is not null;--> statement-breakpoint
CREATE INDEX "parcelas_tipo_idx" ON "parcelas"."parcelas" USING btree ("tipo_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tipos_de_parcela_nombre_unico" ON "parcelas"."tipos_de_parcela" USING btree ("empresa_id",core.nombre_normalizado("nombre"));--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "parcelas"."mediciones" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "parcelas"."parcelas_de_inmuebles" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "parcelas"."parcelas" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "alcance_empresas_localidades" ON "parcelas"."parcelas" AS RESTRICTIVE FOR ALL TO "arrancar_app" USING ('empresas.localidades' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or localidad_id in (
      select a.localidad_id from empresas.accesos_a_localidades a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    )) WITH CHECK ('empresas.localidades' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or localidad_id in (
      select a.localidad_id from empresas.accesos_a_localidades a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    ));--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "parcelas"."tipos_de_parcela" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
-- PA-1: la auditoría de los contratos de tenencia no se depura mientras exista la empresa (catálogo de la migración 0024 del core).
INSERT INTO "core"."recursos_de_auditoria_permanente" ("recurso", "motivo")
VALUES (
  'parcelas.contratos',
  'Contratos de arrendamiento, usufructo y aparcería de la tierra: plazos de décadas más la prescripción (Código Tributario arts. 47 y 112) y la conservación de libros y documentos (Código de Comercio art. 382).'
)
ON CONFLICT DO NOTHING;
