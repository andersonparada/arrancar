CREATE TABLE "bancos"."chequeras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"cuenta_bancaria_id" uuid NOT NULL,
	"serie" text,
	"desde" integer NOT NULL,
	"hasta" integer NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "chequeras_desde_positivo" CHECK ("bancos"."chequeras"."desde" > 0),
	CONSTRAINT "chequeras_hasta_valido" CHECK ("bancos"."chequeras"."hasta" >= "bancos"."chequeras"."desde")
);
--> statement-breakpoint
ALTER TABLE "bancos"."chequeras" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bancos"."cheques" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"chequera_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"estado" text DEFAULT 'disponible' NOT NULL,
	"no_negociable" boolean DEFAULT true NOT NULL,
	"movimiento_id" uuid,
	"anulado_en" timestamp with time zone,
	"motivo_de_anulacion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "cheques_chequera_numero_unico" UNIQUE("chequera_id","numero"),
	CONSTRAINT "cheques_estado_valido" CHECK ("bancos"."cheques"."estado" in ('disponible', 'emitido', 'anulado'))
);
--> statement-breakpoint
ALTER TABLE "bancos"."cheques" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" DROP CONSTRAINT "movimientos_tipo_valido";--> statement-breakpoint
ALTER TABLE "bancos"."chequeras" ADD CONSTRAINT "chequeras_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bancos"."chequeras" ADD CONSTRAINT "chequeras_cuenta_bancaria_id_cuentas_bancarias_id_fk" FOREIGN KEY ("cuenta_bancaria_id") REFERENCES "bancos"."cuentas_bancarias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bancos"."cheques" ADD CONSTRAINT "cheques_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bancos"."cheques" ADD CONSTRAINT "cheques_chequera_id_chequeras_id_fk" FOREIGN KEY ("chequera_id") REFERENCES "bancos"."chequeras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bancos"."cheques" ADD CONSTRAINT "cheques_movimiento_id_movimientos_id_fk" FOREIGN KEY ("movimiento_id") REFERENCES "bancos"."movimientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chequeras_cuenta_idx" ON "bancos"."chequeras" USING btree ("cuenta_bancaria_id");--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ADD CONSTRAINT "movimientos_tipo_valido" CHECK ("bancos"."movimientos"."tipo" in ('credito', 'debito', 'cheque'));--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "bancos"."chequeras" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "bancos"."cheques" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);