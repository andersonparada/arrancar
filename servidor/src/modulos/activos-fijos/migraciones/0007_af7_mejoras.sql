CREATE TABLE "activos_fijos"."mejoras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"activo_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"anio_de_numero" smallint NOT NULL,
	"clase" text NOT NULL,
	"fecha" date NOT NULL,
	"descripcion" text NOT NULL,
	"vida_util_restante_contable_meses" smallint,
	"no_es_edificacion" boolean DEFAULT false NOT NULL,
	"estado" text DEFAULT 'vigente' NOT NULL,
	"anulada_en" timestamp with time zone,
	"anulada_por" uuid,
	"motivo_de_anulacion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "mejoras_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "mejoras_clase" CHECK ("activos_fijos"."mejoras"."clase" in ('mejora', 'costo_posterior')),
	CONSTRAINT "mejoras_estado" CHECK ("activos_fijos"."mejoras"."estado" in ('vigente', 'anulada')),
	CONSTRAINT "mejoras_descripcion" CHECK (char_length(btrim("activos_fijos"."mejoras"."descripcion")) between 1 and 300),
	CONSTRAINT "mejoras_vida_restante" CHECK ("activos_fijos"."mejoras"."vida_util_restante_contable_meses" is null or ("activos_fijos"."mejoras"."clase" = 'mejora' and "activos_fijos"."mejoras"."vida_util_restante_contable_meses" >= 1)),
	CONSTRAINT "mejoras_anulacion_completa" CHECK (("activos_fijos"."mejoras"."estado" = 'anulada') = ("activos_fijos"."mejoras"."anulada_en" is not null and "activos_fijos"."mejoras"."anulada_por" is not null and "activos_fijos"."mejoras"."motivo_de_anulacion" is not null))
);
--> statement-breakpoint
ALTER TABLE "activos_fijos"."mejoras" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "activos_fijos"."costos" ADD COLUMN "mejora_id" uuid;--> statement-breakpoint
ALTER TABLE "activos_fijos"."tramos" ADD COLUMN "mejora_id" uuid;--> statement-breakpoint
ALTER TABLE "activos_fijos"."mejoras" ADD CONSTRAINT "mejoras_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."mejoras" ADD CONSTRAINT "mejoras_activo_fk" FOREIGN KEY ("activo_id","empresa_id") REFERENCES "activos_fijos"."activos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mejoras_numero_unico" ON "activos_fijos"."mejoras" USING btree ("empresa_id","anio_de_numero","numero");--> statement-breakpoint
CREATE INDEX "mejoras_activo_fecha_idx" ON "activos_fijos"."mejoras" USING btree ("activo_id","fecha");--> statement-breakpoint
ALTER TABLE "activos_fijos"."costos" ADD CONSTRAINT "costos_mejora_fk" FOREIGN KEY ("mejora_id","empresa_id") REFERENCES "activos_fijos"."mejoras"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."tramos" ADD CONSTRAINT "tramos_mejora_fk" FOREIGN KEY ("mejora_id","empresa_id") REFERENCES "activos_fijos"."mejoras"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "costos_mejora_idx" ON "activos_fijos"."costos" USING btree ("mejora_id") WHERE "activos_fijos"."costos"."mejora_id" is not null;--> statement-breakpoint
CREATE INDEX "tramos_mejora_idx" ON "activos_fijos"."tramos" USING btree ("mejora_id") WHERE "activos_fijos"."tramos"."mejora_id" is not null;--> statement-breakpoint
ALTER TABLE "activos_fijos"."tramos" ADD CONSTRAINT "tramos_de_mejora" CHECK (("activos_fijos"."tramos"."causa" in ('mejora', 'costo_posterior')) = ("activos_fijos"."tramos"."mejora_id" is not null));--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "activos_fijos"."mejoras" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);