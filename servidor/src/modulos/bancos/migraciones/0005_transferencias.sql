CREATE TABLE "bancos"."transferencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"cuenta_origen_id" uuid NOT NULL,
	"cuenta_destino_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"monto" numeric(14, 2) NOT NULL,
	"referencia" text,
	"observaciones" text,
	"anulada_en" timestamp with time zone,
	"motivo_de_anulacion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "transferencias_monto_positivo" CHECK ("bancos"."transferencias"."monto" > 0),
	CONSTRAINT "transferencias_cuentas_distintas" CHECK ("bancos"."transferencias"."cuenta_origen_id" <> "bancos"."transferencias"."cuenta_destino_id")
);
--> statement-breakpoint
ALTER TABLE "bancos"."transferencias" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ADD COLUMN "transferencia_id" uuid;--> statement-breakpoint
ALTER TABLE "bancos"."transferencias" ADD CONSTRAINT "transferencias_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bancos"."transferencias" ADD CONSTRAINT "transferencias_cuenta_origen_id_cuentas_bancarias_id_fk" FOREIGN KEY ("cuenta_origen_id") REFERENCES "bancos"."cuentas_bancarias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bancos"."transferencias" ADD CONSTRAINT "transferencias_cuenta_destino_id_cuentas_bancarias_id_fk" FOREIGN KEY ("cuenta_destino_id") REFERENCES "bancos"."cuentas_bancarias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transferencias_origen_idx" ON "bancos"."transferencias" USING btree ("cuenta_origen_id");--> statement-breakpoint
CREATE INDEX "transferencias_destino_idx" ON "bancos"."transferencias" USING btree ("cuenta_destino_id");--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ADD CONSTRAINT "movimientos_transferencia_id_transferencias_id_fk" FOREIGN KEY ("transferencia_id") REFERENCES "bancos"."transferencias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "movimientos_transferencia_idx" ON "bancos"."movimientos" USING btree ("transferencia_id");--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "bancos"."transferencias" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);