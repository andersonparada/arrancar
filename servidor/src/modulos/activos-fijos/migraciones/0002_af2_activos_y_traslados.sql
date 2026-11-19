CREATE TABLE "activos_fijos"."activos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"descripcion" text NOT NULL,
	"clase_id" uuid NOT NULL,
	"activo_padre_id" uuid,
	"tipo_de_registro" text NOT NULL,
	"origen" text,
	"propietario" text,
	"forma_de_tenencia" text,
	"estado" text NOT NULL,
	"ocioso" boolean DEFAULT false NOT NULL,
	"ocioso_desde" date,
	"motivo_de_ocio" text,
	"fecha_de_adquisicion" date NOT NULL,
	"fecha_de_inicio_de_uso" date,
	"fecha_de_baja" date,
	"porcentaje_fiscal" numeric(5, 2),
	"vida_util_contable_meses" smallint,
	"valor_residual" numeric(14, 2),
	"valor_como_ganado_comun" numeric(14, 2),
	"valor_de_matricula" numeric(14, 2),
	"valor_catastral" numeric(14, 2),
	"valores_del_inmueble_completo" boolean DEFAULT false NOT NULL,
	"marca" text,
	"modelo" text,
	"numero_de_serie" text,
	"placa" text,
	"cantidad" integer DEFAULT 1 NOT NULL,
	"en_bodega" boolean DEFAULT false NOT NULL,
	"alta_conjunta_id" uuid,
	"localidad_id" uuid,
	"departamento_id" uuid,
	"responsable" text,
	"responsable_usuario_id" uuid,
	"foto_archivo_id" uuid,
	"observaciones" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "activos_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "activos_tipo_de_registro" CHECK ("activos_fijos"."activos"."tipo_de_registro" in ('activo', 'bien_de_control', 'de_terceros')),
	CONSTRAINT "activos_origen" CHECK ("activos_fijos"."activos"."origen" in ('compra', 'construccion', 'importacion', 'aporte', 'donacion', 'saldo_inicial', 'otro')),
	CONSTRAINT "activos_forma_de_tenencia" CHECK ("activos_fijos"."activos"."forma_de_tenencia" in ('arrendamiento', 'comodato', 'otra')),
	CONSTRAINT "activos_estado" CHECK ("activos_fijos"."activos"."estado" in ('en_construccion', 'en_uso', 'dado_de_baja')),
	CONSTRAINT "activos_en_construccion_solo_activos" CHECK ("activos_fijos"."activos"."estado" <> 'en_construccion' or "activos_fijos"."activos"."tipo_de_registro" = 'activo'),
	CONSTRAINT "activos_origen_de_terceros" CHECK (("activos_fijos"."activos"."tipo_de_registro" = 'de_terceros') = ("activos_fijos"."activos"."origen" is null)),
	CONSTRAINT "activos_propietario_de_terceros" CHECK (("activos_fijos"."activos"."tipo_de_registro" = 'de_terceros') = ("activos_fijos"."activos"."propietario" is not null)),
	CONSTRAINT "activos_tenencia_de_terceros" CHECK (("activos_fijos"."activos"."tipo_de_registro" = 'de_terceros') = ("activos_fijos"."activos"."forma_de_tenencia" is not null)),
	CONSTRAINT "activos_codigo_valido" CHECK ("activos_fijos"."activos"."codigo" ~ '^[A-Za-z0-9./-]{1,30}$'),
	CONSTRAINT "activos_descripcion_larga" CHECK (char_length(btrim("activos_fijos"."activos"."descripcion")) between 1 and 200),
	CONSTRAINT "activos_motivo_de_ocio_largo" CHECK ("activos_fijos"."activos"."motivo_de_ocio" is null or char_length(btrim("activos_fijos"."activos"."motivo_de_ocio")) between 1 and 300),
	CONSTRAINT "activos_propietario_largo" CHECK ("activos_fijos"."activos"."propietario" is null or char_length(btrim("activos_fijos"."activos"."propietario")) between 1 and 150),
	CONSTRAINT "activos_responsable_largo" CHECK ("activos_fijos"."activos"."responsable" is null or char_length(btrim("activos_fijos"."activos"."responsable")) between 1 and 150),
	CONSTRAINT "activos_observaciones_largas" CHECK ("activos_fijos"."activos"."observaciones" is null or char_length(btrim("activos_fijos"."activos"."observaciones")) between 1 and 500),
	CONSTRAINT "activos_marca_larga" CHECK ("activos_fijos"."activos"."marca" is null or char_length(btrim("activos_fijos"."activos"."marca")) between 1 and 80),
	CONSTRAINT "activos_modelo_largo" CHECK ("activos_fijos"."activos"."modelo" is null or char_length(btrim("activos_fijos"."activos"."modelo")) between 1 and 80),
	CONSTRAINT "activos_serie_larga" CHECK ("activos_fijos"."activos"."numero_de_serie" is null or char_length(btrim("activos_fijos"."activos"."numero_de_serie")) between 1 and 80),
	CONSTRAINT "activos_placa_larga" CHECK ("activos_fijos"."activos"."placa" is null or char_length(btrim("activos_fijos"."activos"."placa")) between 1 and 80),
	CONSTRAINT "activos_ocioso_coherente" CHECK ("activos_fijos"."activos"."ocioso" = ("activos_fijos"."activos"."ocioso_desde" is not null and "activos_fijos"."activos"."motivo_de_ocio" is not null)),
	CONSTRAINT "activos_ocioso_en_uso" CHECK (not "activos_fijos"."activos"."ocioso" or "activos_fijos"."activos"."estado" = 'en_uso'),
	CONSTRAINT "activos_inicio_de_uso" CHECK (("activos_fijos"."activos"."estado" = 'en_construccion') = ("activos_fijos"."activos"."fecha_de_inicio_de_uso" is null)),
	CONSTRAINT "activos_fecha_de_baja" CHECK (("activos_fijos"."activos"."estado" = 'dado_de_baja') = ("activos_fijos"."activos"."fecha_de_baja" is not null)),
	CONSTRAINT "activos_libros_con_uso" CHECK (("activos_fijos"."activos"."tipo_de_registro" = 'activo' and "activos_fijos"."activos"."estado" <> 'en_construccion') = ("activos_fijos"."activos"."porcentaje_fiscal" is not null)),
	CONSTRAINT "activos_porcentaje_fiscal" CHECK ("activos_fijos"."activos"."porcentaje_fiscal" between 0 and 100),
	CONSTRAINT "activos_vida_util" CHECK ("activos_fijos"."activos"."vida_util_contable_meses" between 1 and 1200),
	CONSTRAINT "activos_montos_positivos" CHECK ("activos_fijos"."activos"."valor_residual" >= 0 and "activos_fijos"."activos"."valor_como_ganado_comun" >= 0),
	CONSTRAINT "activos_valores_del_inmueble" CHECK ("activos_fijos"."activos"."valor_de_matricula" > 0 and "activos_fijos"."activos"."valor_catastral" > 0),
	CONSTRAINT "activos_inmueble_completo" CHECK (not "activos_fijos"."activos"."valores_del_inmueble_completo" or "activos_fijos"."activos"."valor_de_matricula" is not null or "activos_fijos"."activos"."valor_catastral" is not null),
	CONSTRAINT "activos_cantidad" CHECK ("activos_fijos"."activos"."cantidad" >= 1),
	CONSTRAINT "activos_padre_distinto" CHECK ("activos_fijos"."activos"."activo_padre_id" <> "activos_fijos"."activos"."id")
);
--> statement-breakpoint
ALTER TABLE "activos_fijos"."activos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "activos_fijos"."traslados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"activo_id" uuid NOT NULL,
	"es_alta" boolean DEFAULT false NOT NULL,
	"grupo_id" uuid,
	"numero" integer,
	"anio_de_numero" smallint,
	"fecha" date NOT NULL,
	"localidad_id" uuid,
	"departamento_id" uuid,
	"responsable" text,
	"responsable_usuario_id" uuid,
	"recibido_por" text,
	"motivo" text,
	"inventario_id" uuid,
	"a_bodega" boolean DEFAULT false NOT NULL,
	"estado" text DEFAULT 'vigente' NOT NULL,
	"anulado_en" timestamp with time zone,
	"anulado_por" uuid,
	"motivo_de_anulacion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "traslados_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "traslados_grupo_activo_unico" UNIQUE("grupo_id","activo_id"),
	CONSTRAINT "traslados_alta_sin_boleta" CHECK ("activos_fijos"."traslados"."es_alta" = ("activos_fijos"."traslados"."numero" is null and "activos_fijos"."traslados"."grupo_id" is null)),
	CONSTRAINT "traslados_numero_con_anio" CHECK (("activos_fijos"."traslados"."numero" is null) = ("activos_fijos"."traslados"."anio_de_numero" is null)),
	CONSTRAINT "traslados_datos_de_entrega" CHECK ("activos_fijos"."traslados"."es_alta" or ("activos_fijos"."traslados"."recibido_por" is not null and "activos_fijos"."traslados"."motivo" is not null)),
	CONSTRAINT "traslados_estado" CHECK ("activos_fijos"."traslados"."estado" in ('vigente', 'anulado')),
	CONSTRAINT "traslados_anulacion_completa" CHECK (("activos_fijos"."traslados"."estado" = 'anulado') = ("activos_fijos"."traslados"."anulado_en" is not null and "activos_fijos"."traslados"."anulado_por" is not null and "activos_fijos"."traslados"."motivo_de_anulacion" is not null)),
	CONSTRAINT "traslados_motivo_largo" CHECK ("activos_fijos"."traslados"."motivo" is null or char_length(btrim("activos_fijos"."traslados"."motivo")) between 1 and 300)
);
--> statement-breakpoint
ALTER TABLE "activos_fijos"."traslados" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "activos_fijos"."activos" ADD CONSTRAINT "activos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."activos" ADD CONSTRAINT "activos_responsable_usuario_id_usuarios_id_fk" FOREIGN KEY ("responsable_usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."activos" ADD CONSTRAINT "activos_foto_archivo_id_archivos_id_fk" FOREIGN KEY ("foto_archivo_id") REFERENCES "core"."archivos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."activos" ADD CONSTRAINT "activos_clase_fk" FOREIGN KEY ("clase_id","empresa_id") REFERENCES "activos_fijos"."clases"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."activos" ADD CONSTRAINT "activos_padre_fk" FOREIGN KEY ("activo_padre_id","empresa_id") REFERENCES "activos_fijos"."activos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."activos" ADD CONSTRAINT "activos_localidad_fk" FOREIGN KEY ("localidad_id","empresa_id") REFERENCES "empresas"."localidades"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."activos" ADD CONSTRAINT "activos_departamento_fk" FOREIGN KEY ("departamento_id","empresa_id") REFERENCES "empresas"."departamentos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."traslados" ADD CONSTRAINT "traslados_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."traslados" ADD CONSTRAINT "traslados_responsable_usuario_id_usuarios_id_fk" FOREIGN KEY ("responsable_usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."traslados" ADD CONSTRAINT "traslados_activo_fk" FOREIGN KEY ("activo_id","empresa_id") REFERENCES "activos_fijos"."activos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."traslados" ADD CONSTRAINT "traslados_localidad_fk" FOREIGN KEY ("localidad_id","empresa_id") REFERENCES "empresas"."localidades"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."traslados" ADD CONSTRAINT "traslados_departamento_fk" FOREIGN KEY ("departamento_id","empresa_id") REFERENCES "empresas"."departamentos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "activos_codigo_unico" ON "activos_fijos"."activos" USING btree ("empresa_id",upper("codigo"));--> statement-breakpoint
CREATE UNIQUE INDEX "activos_foto_unica" ON "activos_fijos"."activos" USING btree ("foto_archivo_id") WHERE "activos_fijos"."activos"."foto_archivo_id" is not null;--> statement-breakpoint
CREATE INDEX "activos_existencias_idx" ON "activos_fijos"."activos" USING btree ("empresa_id","clase_id","estado");--> statement-breakpoint
CREATE INDEX "activos_padre_idx" ON "activos_fijos"."activos" USING btree ("activo_padre_id") WHERE "activos_fijos"."activos"."activo_padre_id" is not null;--> statement-breakpoint
CREATE INDEX "activos_localidad_idx" ON "activos_fijos"."activos" USING btree ("empresa_id","localidad_id") WHERE "activos_fijos"."activos"."localidad_id" is not null;--> statement-breakpoint
CREATE INDEX "activos_departamento_idx" ON "activos_fijos"."activos" USING btree ("departamento_id") WHERE "activos_fijos"."activos"."departamento_id" is not null;--> statement-breakpoint
CREATE INDEX "activos_responsable_usuario_idx" ON "activos_fijos"."activos" USING btree ("responsable_usuario_id") WHERE "activos_fijos"."activos"."responsable_usuario_id" is not null;--> statement-breakpoint
CREATE INDEX "activos_en_bodega_idx" ON "activos_fijos"."activos" USING btree ("empresa_id") WHERE "activos_fijos"."activos"."en_bodega" and "activos_fijos"."activos"."estado" <> 'dado_de_baja';--> statement-breakpoint
CREATE INDEX "activos_alta_conjunta_idx" ON "activos_fijos"."activos" USING btree ("alta_conjunta_id") WHERE "activos_fijos"."activos"."alta_conjunta_id" is not null;--> statement-breakpoint
CREATE INDEX "activos_serie_idx" ON "activos_fijos"."activos" USING btree ("empresa_id",upper("numero_de_serie")) WHERE "activos_fijos"."activos"."numero_de_serie" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "traslados_alta_unica" ON "activos_fijos"."traslados" USING btree ("activo_id") WHERE "activos_fijos"."traslados"."es_alta";--> statement-breakpoint
CREATE INDEX "traslados_activo_fecha_idx" ON "activos_fijos"."traslados" USING btree ("activo_id","fecha" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "traslados_grupo_idx" ON "activos_fijos"."traslados" USING btree ("grupo_id") WHERE "activos_fijos"."traslados"."grupo_id" is not null;--> statement-breakpoint
CREATE INDEX "traslados_localidad_idx" ON "activos_fijos"."traslados" USING btree ("localidad_id") WHERE "activos_fijos"."traslados"."localidad_id" is not null;--> statement-breakpoint
CREATE INDEX "traslados_departamento_idx" ON "activos_fijos"."traslados" USING btree ("departamento_id") WHERE "activos_fijos"."traslados"."departamento_id" is not null;--> statement-breakpoint
CREATE INDEX "traslados_usuario_idx" ON "activos_fijos"."traslados" USING btree ("responsable_usuario_id") WHERE "activos_fijos"."traslados"."responsable_usuario_id" is not null;--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "activos_fijos"."activos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "activos_fijos"."traslados" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);