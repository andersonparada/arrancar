CREATE SCHEMA "activos_fijos";
--> statement-breakpoint
CREATE TABLE "activos_fijos"."clases_por_concepto" (
	"empresa_id" uuid NOT NULL,
	"concepto_de_gasto_id" uuid NOT NULL,
	"clase_id" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "clases_por_concepto_pk" PRIMARY KEY("empresa_id","concepto_de_gasto_id")
);
--> statement-breakpoint
ALTER TABLE "activos_fijos"."clases_por_concepto" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "activos_fijos"."clases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"inciso_fiscal" text NOT NULL,
	"porcentaje_fiscal" numeric(5, 2) NOT NULL,
	"vida_util_contable_meses" smallint,
	"valor_residual_porcentaje" numeric(5, 2) DEFAULT '0' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "clases_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "clases_nombre_largo" CHECK (char_length(btrim("activos_fijos"."clases"."nombre")) between 1 and 80),
	CONSTRAINT "clases_inciso_fiscal" CHECK ("activos_fijos"."clases"."inciso_fiscal" in ('edificios', 'plantaciones', 'instalaciones_y_mobiliario', 'maquinaria_y_vehiculos', 'computo', 'herramientas', 'reproductores', 'otros_muebles', 'intangibles', 'llave', 'terrenos')),
	CONSTRAINT "clases_porcentaje_fiscal" CHECK ("activos_fijos"."clases"."porcentaje_fiscal" between 0 and 100),
	CONSTRAINT "clases_terrenos_sin_porcentaje" CHECK (("activos_fijos"."clases"."inciso_fiscal" = 'terrenos') = ("activos_fijos"."clases"."porcentaje_fiscal" = 0)),
	CONSTRAINT "clases_vida_util" CHECK ("activos_fijos"."clases"."vida_util_contable_meses" between 1 and 1200),
	CONSTRAINT "clases_terrenos_sin_vida_util" CHECK ("activos_fijos"."clases"."inciso_fiscal" <> 'terrenos' or "activos_fijos"."clases"."vida_util_contable_meses" is null),
	CONSTRAINT "clases_valor_residual" CHECK ("activos_fijos"."clases"."valor_residual_porcentaje" between 0 and 99.99)
);
--> statement-breakpoint
ALTER TABLE "activos_fijos"."clases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "activos_fijos"."clases_por_concepto" ADD CONSTRAINT "clases_por_concepto_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."clases_por_concepto" ADD CONSTRAINT "clases_por_concepto_concepto_fk" FOREIGN KEY ("concepto_de_gasto_id","empresa_id") REFERENCES "libro_de_compras"."conceptos_de_gasto"("id","empresa_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."clases_por_concepto" ADD CONSTRAINT "clases_por_concepto_clase_fk" FOREIGN KEY ("clase_id","empresa_id") REFERENCES "activos_fijos"."clases"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."clases" ADD CONSTRAINT "clases_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clases_por_concepto_clase_idx" ON "activos_fijos"."clases_por_concepto" USING btree ("clase_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clases_nombre_unico" ON "activos_fijos"."clases" USING btree ("empresa_id",core.nombre_normalizado("nombre"));--> statement-breakpoint
CREATE INDEX "clases_empresa_activo_idx" ON "activos_fijos"."clases" USING btree ("empresa_id","activo");--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "activos_fijos"."clases_por_concepto" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "activos_fijos"."clases" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);