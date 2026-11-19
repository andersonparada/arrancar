CREATE TABLE "activos_fijos"."cierres" (
	"empresa_id" uuid NOT NULL,
	"periodo" date NOT NULL,
	"estado" text NOT NULL,
	"cerrado_en" timestamp with time zone NOT NULL,
	"cerrado_por" uuid NOT NULL,
	"reabierto_en" timestamp with time zone,
	"reabierto_por" uuid,
	"motivo_de_reapertura" text,
	"regimen_isr" text,
	"total_contable" numeric(14, 2) NOT NULL,
	"total_fiscal" numeric(14, 2) NOT NULL,
	"activos_depreciados" integer NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "cierres_pk" PRIMARY KEY("empresa_id","periodo"),
	CONSTRAINT "cierres_primer_dia" CHECK (extract(day from "activos_fijos"."cierres"."periodo") = 1),
	CONSTRAINT "cierres_estado" CHECK ("activos_fijos"."cierres"."estado" in ('cerrado', 'reabierto')),
	CONSTRAINT "cierres_reapertura_completa" CHECK (("activos_fijos"."cierres"."estado" = 'reabierto') = ("activos_fijos"."cierres"."reabierto_en" is not null and "activos_fijos"."cierres"."reabierto_por" is not null and "activos_fijos"."cierres"."motivo_de_reapertura" is not null)),
	CONSTRAINT "cierres_motivo_acotado" CHECK ("activos_fijos"."cierres"."motivo_de_reapertura" is null or char_length("activos_fijos"."cierres"."motivo_de_reapertura") between 1 and 500),
	CONSTRAINT "cierres_montos" CHECK ("activos_fijos"."cierres"."total_contable" >= 0 and "activos_fijos"."cierres"."total_fiscal" >= 0 and "activos_fijos"."cierres"."activos_depreciados" >= 0)
);
--> statement-breakpoint
ALTER TABLE "activos_fijos"."cierres" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "activos_fijos"."tramos" ADD CONSTRAINT "tramos_id_empresa_unico" UNIQUE("id","empresa_id");--> statement-breakpoint
CREATE TABLE "activos_fijos"."cuotas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"periodo" date NOT NULL,
	"activo_id" uuid NOT NULL,
	"libro" text NOT NULL,
	"tramo_id" uuid NOT NULL,
	"monto" numeric(14, 2) NOT NULL,
	"acumulada" numeric(14, 2) NOT NULL,
	"localidad_id" uuid,
	"departamento_id" uuid,
	"ocioso" boolean DEFAULT false NOT NULL,
	"vigente" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "cuotas_libro" CHECK ("activos_fijos"."cuotas"."libro" in ('contable', 'fiscal')),
	CONSTRAINT "cuotas_primer_dia" CHECK (extract(day from "activos_fijos"."cuotas"."periodo") = 1),
	CONSTRAINT "cuotas_montos" CHECK ("activos_fijos"."cuotas"."monto" >= 0 and "activos_fijos"."cuotas"."acumulada" >= 0)
);
--> statement-breakpoint
ALTER TABLE "activos_fijos"."cuotas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "activos_fijos"."cierres" ADD CONSTRAINT "cierres_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."cuotas" ADD CONSTRAINT "cuotas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."cuotas" ADD CONSTRAINT "cuotas_cierre_fk" FOREIGN KEY ("empresa_id","periodo") REFERENCES "activos_fijos"."cierres"("empresa_id","periodo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."cuotas" ADD CONSTRAINT "cuotas_activo_fk" FOREIGN KEY ("activo_id","empresa_id") REFERENCES "activos_fijos"."activos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."cuotas" ADD CONSTRAINT "cuotas_tramo_fk" FOREIGN KEY ("tramo_id","empresa_id") REFERENCES "activos_fijos"."tramos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."cuotas" ADD CONSTRAINT "cuotas_localidad_fk" FOREIGN KEY ("localidad_id","empresa_id") REFERENCES "empresas"."localidades"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."cuotas" ADD CONSTRAINT "cuotas_departamento_fk" FOREIGN KEY ("departamento_id","empresa_id") REFERENCES "empresas"."departamentos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cuotas_vigente_unica" ON "activos_fijos"."cuotas" USING btree ("activo_id","libro","periodo") WHERE "activos_fijos"."cuotas"."vigente";--> statement-breakpoint
CREATE INDEX "cuotas_periodo_idx" ON "activos_fijos"."cuotas" USING btree ("empresa_id","periodo") WHERE "activos_fijos"."cuotas"."vigente";--> statement-breakpoint
CREATE INDEX "cuotas_activo_libro_idx" ON "activos_fijos"."cuotas" USING btree ("activo_id","libro","periodo") WHERE "activos_fijos"."cuotas"."vigente";--> statement-breakpoint
CREATE INDEX "cuotas_tramo_idx" ON "activos_fijos"."cuotas" USING btree ("tramo_id");--> statement-breakpoint
CREATE INDEX "cuotas_localidad_idx" ON "activos_fijos"."cuotas" USING btree ("localidad_id") WHERE "activos_fijos"."cuotas"."localidad_id" is not null;--> statement-breakpoint
CREATE INDEX "cuotas_departamento_idx" ON "activos_fijos"."cuotas" USING btree ("departamento_id") WHERE "activos_fijos"."cuotas"."departamento_id" is not null;--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "activos_fijos"."cierres" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "activos_fijos"."cuotas" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);