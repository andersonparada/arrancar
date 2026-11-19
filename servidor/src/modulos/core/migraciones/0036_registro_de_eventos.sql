CREATE TABLE "core"."registro_de_eventos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"numero" bigint GENERATED ALWAYS AS IDENTITY (sequence name "core"."registro_de_eventos_numero_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"cuenta_id" uuid DEFAULT nullif(current_setting('app.cuenta_id', true), '')::uuid NOT NULL,
	"empresa_id" uuid DEFAULT nullif(current_setting('app.empresa_id', true), '')::uuid NOT NULL,
	"nombre" text NOT NULL,
	"version" smallint NOT NULL,
	"datos" jsonb NOT NULL,
	"ocurrido_en" timestamp with time zone NOT NULL,
	"usuario_id" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "registro_de_eventos_nombre_valido" CHECK ("core"."registro_de_eventos"."nombre" ~ '^[a-z0-9-]+\.[a-z_]+$'),
	CONSTRAINT "registro_de_eventos_version_valida" CHECK ("core"."registro_de_eventos"."version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "core"."registro_de_eventos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "core"."registro_de_eventos" ADD CONSTRAINT "registro_de_eventos_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."registro_de_eventos" ADD CONSTRAINT "registro_de_eventos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "registro_de_eventos_empresa_nombre_idx" ON "core"."registro_de_eventos" USING btree ("empresa_id","nombre","numero");--> statement-breakpoint
CREATE INDEX "registro_de_eventos_empresa_numero_idx" ON "core"."registro_de_eventos" USING btree ("empresa_id","numero");--> statement-breakpoint
CREATE POLICY "agregar_en_la_empresa" ON "core"."registro_de_eventos" AS PERMISSIVE FOR INSERT TO "arrancar_app" WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "leer_en_la_empresa" ON "core"."registro_de_eventos" AS PERMISSIVE FOR SELECT TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);