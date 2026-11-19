CREATE TABLE "activos_fijos"."saldos_iniciales" (
	"activo_id" uuid PRIMARY KEY NOT NULL,
	"empresa_id" uuid NOT NULL,
	"fecha_de_corte" date NOT NULL,
	"costo" numeric(14, 2) NOT NULL,
	"depreciacion_acumulada_contable" numeric(14, 2) NOT NULL,
	"costo_fiscal" numeric(14, 2) NOT NULL,
	"base_fiscal" numeric(14, 2) NOT NULL,
	"depreciacion_acumulada_fiscal" numeric(14, 2) NOT NULL,
	"vida_util_restante_meses" smallint,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "saldos_iniciales_costo" CHECK ("activos_fijos"."saldos_iniciales"."costo" > 0 and "activos_fijos"."saldos_iniciales"."costo_fiscal" > 0),
	CONSTRAINT "saldos_iniciales_acumulada_contable" CHECK ("activos_fijos"."saldos_iniciales"."depreciacion_acumulada_contable" >= 0 and "activos_fijos"."saldos_iniciales"."depreciacion_acumulada_contable" <= "activos_fijos"."saldos_iniciales"."costo"),
	CONSTRAINT "saldos_iniciales_base_fiscal" CHECK ("activos_fijos"."saldos_iniciales"."base_fiscal" >= 0 and "activos_fijos"."saldos_iniciales"."base_fiscal" <= "activos_fijos"."saldos_iniciales"."costo_fiscal"),
	CONSTRAINT "saldos_iniciales_acumulada_fiscal" CHECK ("activos_fijos"."saldos_iniciales"."depreciacion_acumulada_fiscal" >= 0 and "activos_fijos"."saldos_iniciales"."depreciacion_acumulada_fiscal" <= "activos_fijos"."saldos_iniciales"."base_fiscal"),
	CONSTRAINT "saldos_iniciales_vida_restante" CHECK ("activos_fijos"."saldos_iniciales"."vida_util_restante_meses" between 0 and 1200)
);
--> statement-breakpoint
ALTER TABLE "activos_fijos"."saldos_iniciales" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "activos_fijos"."saldos_iniciales" ADD CONSTRAINT "saldos_iniciales_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activos_fijos"."saldos_iniciales" ADD CONSTRAINT "saldos_iniciales_activo_fk" FOREIGN KEY ("activo_id","empresa_id") REFERENCES "activos_fijos"."activos"("id","empresa_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "activos_fijos"."saldos_iniciales" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);