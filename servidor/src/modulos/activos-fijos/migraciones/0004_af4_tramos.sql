CREATE TABLE "activos_fijos"."tramos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"activo_id" uuid NOT NULL,
	"libro" text NOT NULL,
	"desde_periodo" date NOT NULL,
	"causa" text NOT NULL,
	"por_depreciar" numeric(14, 2) NOT NULL,
	"valor_residual" numeric(14, 2) NOT NULL,
	"meses" smallint,
	"porcentaje" numeric(5, 2),
	"base_del_porcentaje" numeric(14, 2),
	"cuota_mensual" numeric(14, 2) NOT NULL,
	"exceso_de_nota_de_credito" numeric(14, 2) DEFAULT '0' NOT NULL,
	"vigente" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "tramos_libro" CHECK ("activos_fijos"."tramos"."libro" in ('contable', 'fiscal')),
	CONSTRAINT "tramos_causa" CHECK ("activos_fijos"."tramos"."causa" in ('inicio_de_uso', 'saldo_inicial', 'mejora', 'costo_posterior', 'revision_de_estimacion', 'cambio_de_matricula', 'division')),
	CONSTRAINT "tramos_causa_de_matricula_fiscal" CHECK ("activos_fijos"."tramos"."causa" <> 'cambio_de_matricula' or "activos_fijos"."tramos"."libro" = 'fiscal'),
	CONSTRAINT "tramos_primer_dia" CHECK (extract(day from "activos_fijos"."tramos"."desde_periodo") = 1),
	CONSTRAINT "tramos_montos" CHECK ("activos_fijos"."tramos"."por_depreciar" >= 0 and "activos_fijos"."tramos"."valor_residual" >= 0 and "activos_fijos"."tramos"."cuota_mensual" >= 0 and "activos_fijos"."tramos"."exceso_de_nota_de_credito" >= 0),
	CONSTRAINT "tramos_residual_fiscal" CHECK ("activos_fijos"."tramos"."libro" <> 'fiscal' or "activos_fijos"."tramos"."valor_residual" = 0),
	CONSTRAINT "tramos_meses_contables" CHECK (("activos_fijos"."tramos"."libro" = 'contable') = ("activos_fijos"."tramos"."meses" is not null)),
	CONSTRAINT "tramos_porcentaje_fiscal" CHECK (("activos_fijos"."tramos"."libro" = 'fiscal') = ("activos_fijos"."tramos"."porcentaje" is not null and "activos_fijos"."tramos"."base_del_porcentaje" is not null))
);
--> statement-breakpoint
ALTER TABLE "activos_fijos"."tramos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "activos_fijos"."tramos" ADD CONSTRAINT "tramos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."tramos" ADD CONSTRAINT "tramos_activo_fk" FOREIGN KEY ("activo_id","empresa_id") REFERENCES "activos_fijos"."activos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tramos_vigente_unico" ON "activos_fijos"."tramos" USING btree ("activo_id","libro","desde_periodo") WHERE "activos_fijos"."tramos"."vigente";--> statement-breakpoint
CREATE INDEX "tramos_activo_libro_idx" ON "activos_fijos"."tramos" USING btree ("activo_id","libro","desde_periodo" DESC NULLS LAST) WHERE "activos_fijos"."tramos"."vigente";--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "activos_fijos"."tramos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);