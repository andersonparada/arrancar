CREATE TABLE "core"."auditoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cuenta_id" uuid DEFAULT nullif(current_setting('app.cuenta_id', true), '')::uuid NOT NULL,
	"empresa_id" uuid DEFAULT nullif(current_setting('app.empresa_id', true), '')::uuid,
	"usuario_id" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"recurso" text NOT NULL,
	"registro_id" text NOT NULL,
	"accion" text NOT NULL,
	"motivo" text,
	"anterior" jsonb,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."auditoria" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "core"."empresas" ADD COLUMN "creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid;--> statement-breakpoint
ALTER TABLE "core"."empresas" ADD COLUMN "actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid;--> statement-breakpoint
ALTER TABLE "core"."auditoria" ADD CONSTRAINT "auditoria_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."auditoria" ADD CONSTRAINT "auditoria_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auditoria_registro_idx" ON "core"."auditoria" USING btree ("recurso","registro_id");--> statement-breakpoint
CREATE INDEX "auditoria_cuenta_fecha_idx" ON "core"."auditoria" USING btree ("cuenta_id","creado_en");--> statement-breakpoint
CREATE POLICY "agregar_en_la_cuenta" ON "core"."auditoria" AS PERMISSIVE FOR INSERT TO "arrancar_app" WITH CHECK (cuenta_id = nullif(current_setting('app.cuenta_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "leer_en_la_cuenta" ON "core"."auditoria" AS PERMISSIVE FOR SELECT TO "arrancar_app" USING (cuenta_id = nullif(current_setting('app.cuenta_id', true), '')::uuid);