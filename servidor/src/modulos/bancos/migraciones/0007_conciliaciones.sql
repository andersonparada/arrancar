CREATE TABLE "bancos"."conciliaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"cuenta_bancaria_id" uuid NOT NULL,
	"anio" integer NOT NULL,
	"mes" integer NOT NULL,
	"saldo_segun_banco" numeric(14, 2) NOT NULL,
	"cerrada_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "conciliaciones_cuenta_mes_unico" UNIQUE("cuenta_bancaria_id","anio","mes"),
	CONSTRAINT "conciliaciones_mes_valido" CHECK ("bancos"."conciliaciones"."mes" between 1 and 12)
);
--> statement-breakpoint
ALTER TABLE "bancos"."conciliaciones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ADD COLUMN "conciliacion_id" uuid;--> statement-breakpoint
ALTER TABLE "bancos"."conciliaciones" ADD CONSTRAINT "conciliaciones_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bancos"."conciliaciones" ADD CONSTRAINT "conciliaciones_cuenta_bancaria_id_cuentas_bancarias_id_fk" FOREIGN KEY ("cuenta_bancaria_id") REFERENCES "bancos"."cuentas_bancarias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ADD CONSTRAINT "movimientos_conciliacion_id_conciliaciones_id_fk" FOREIGN KEY ("conciliacion_id") REFERENCES "bancos"."conciliaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "movimientos_conciliacion_idx" ON "bancos"."movimientos" USING btree ("conciliacion_id");--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "bancos"."conciliaciones" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);