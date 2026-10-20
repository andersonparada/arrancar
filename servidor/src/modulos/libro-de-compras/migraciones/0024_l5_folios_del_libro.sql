CREATE TABLE "libro_de_compras"."emisiones_del_libro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"periodo" date NOT NULL,
	"tipo_de_libro" text NOT NULL,
	"folio_desde" integer NOT NULL,
	"folio_hasta" integer NOT NULL,
	"paginas" smallint NOT NULL,
	"archivo_id" uuid,
	"huella_de_datos" char(64) NOT NULL,
	"version_de_plantilla" smallint NOT NULL,
	"totales" jsonb NOT NULL,
	"motivo" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "emisiones_del_libro_folio_unico" UNIQUE("empresa_id","folio_desde"),
	CONSTRAINT "emisiones_del_libro_periodo_primer_dia" CHECK ("libro_de_compras"."emisiones_del_libro"."periodo" = date_trunc('month', "libro_de_compras"."emisiones_del_libro"."periodo")::date),
	CONSTRAINT "emisiones_del_libro_tipo_valido" CHECK ("libro_de_compras"."emisiones_del_libro"."tipo_de_libro" in ('completo', 'simplificado')),
	CONSTRAINT "emisiones_del_libro_folios_validos" CHECK ("libro_de_compras"."emisiones_del_libro"."folio_desde" >= 1 and "libro_de_compras"."emisiones_del_libro"."folio_hasta" >= "libro_de_compras"."emisiones_del_libro"."folio_desde"),
	CONSTRAINT "emisiones_del_libro_paginas_cuadran" CHECK ("libro_de_compras"."emisiones_del_libro"."paginas" = "libro_de_compras"."emisiones_del_libro"."folio_hasta" - "libro_de_compras"."emisiones_del_libro"."folio_desde" + 1),
	CONSTRAINT "emisiones_del_libro_totales_acotados" CHECK (pg_column_size("libro_de_compras"."emisiones_del_libro"."totales") <= 65536),
	CONSTRAINT "emisiones_del_libro_motivo_valido" CHECK ("libro_de_compras"."emisiones_del_libro"."motivo" is null or char_length("libro_de_compras"."emisiones_del_libro"."motivo") between 1 and 300)
);
--> statement-breakpoint
ALTER TABLE "libro_de_compras"."emisiones_del_libro" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "libro_de_compras"."foliacion_del_libro" (
	"empresa_id" uuid PRIMARY KEY NOT NULL,
	"ultimo_folio" integer DEFAULT 0 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "foliacion_del_libro_folio_no_negativo" CHECK ("libro_de_compras"."foliacion_del_libro"."ultimo_folio" >= 0)
);
--> statement-breakpoint
ALTER TABLE "libro_de_compras"."foliacion_del_libro" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."emisiones_del_libro" ADD CONSTRAINT "emisiones_del_libro_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."emisiones_del_libro" ADD CONSTRAINT "emisiones_del_libro_archivo_id_archivos_id_fk" FOREIGN KEY ("archivo_id") REFERENCES "core"."archivos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."foliacion_del_libro" ADD CONSTRAINT "foliacion_del_libro_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "emisiones_del_libro_periodo_idx" ON "libro_de_compras"."emisiones_del_libro" USING btree ("empresa_id","periodo","creado_en" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "emisiones_del_libro_archivo_idx" ON "libro_de_compras"."emisiones_del_libro" USING btree ("archivo_id") WHERE "libro_de_compras"."emisiones_del_libro"."archivo_id" is not null;--> statement-breakpoint
CREATE POLICY "agregar_en_la_empresa" ON "libro_de_compras"."emisiones_del_libro" AS PERMISSIVE FOR INSERT TO "arrancar_app" WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "leer_en_la_empresa" ON "libro_de_compras"."emisiones_del_libro" AS PERMISSIVE FOR SELECT TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "libro_de_compras"."foliacion_del_libro" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);