CREATE TABLE "inventarios"."cierres" (
	"empresa_id" uuid NOT NULL,
	"periodo" date NOT NULL,
	"estado" text NOT NULL,
	"cerrado_en" timestamp with time zone NOT NULL,
	"cerrado_por" uuid NOT NULL,
	"reabierto_en" timestamp with time zone,
	"reabierto_por" uuid,
	"motivo_de_reapertura" text,
	"metodo" text NOT NULL,
	"regimen_isr" text,
	"valor_total" numeric(14, 2) NOT NULL,
	"articulos_con_existencia" integer NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "cierres_pk" PRIMARY KEY("empresa_id","periodo"),
	CONSTRAINT "cierres_primer_dia" CHECK (extract(day from "inventarios"."cierres"."periodo") = 1),
	CONSTRAINT "cierres_estado" CHECK ("inventarios"."cierres"."estado" in ('cerrado', 'reabierto')),
	CONSTRAINT "cierres_metodo" CHECK ("inventarios"."cierres"."metodo" in ('promedio_ponderado', 'peps')),
	CONSTRAINT "cierres_reapertura_completa" CHECK (("inventarios"."cierres"."estado" = 'reabierto') = ("inventarios"."cierres"."reabierto_en" is not null and "inventarios"."cierres"."reabierto_por" is not null and "inventarios"."cierres"."motivo_de_reapertura" is not null)),
	CONSTRAINT "cierres_motivo_acotado" CHECK ("inventarios"."cierres"."motivo_de_reapertura" is null or char_length("inventarios"."cierres"."motivo_de_reapertura") between 1 and 500),
	CONSTRAINT "cierres_montos" CHECK ("inventarios"."cierres"."valor_total" >= 0 and "inventarios"."cierres"."articulos_con_existencia" >= 0)
);
--> statement-breakpoint
ALTER TABLE "inventarios"."cierres" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventarios"."existencias_al_cierre" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"periodo" date NOT NULL,
	"articulo_id" uuid NOT NULL,
	"bodega_id" uuid NOT NULL,
	"tipo_de_inventario" text NOT NULL,
	"cantidad" numeric(16, 4) NOT NULL,
	"costo_unitario" numeric(15, 6) NOT NULL,
	"valor" numeric(14, 2) NOT NULL,
	"en_transito_interno" boolean DEFAULT false NOT NULL,
	"vigente" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "existencias_al_cierre_tipo" CHECK ("inventarios"."existencias_al_cierre"."tipo_de_inventario" in ('mercaderia', 'materia_prima', 'suministros', 'producto_en_proceso', 'producto_terminado', 'repuestos', 'empaques')),
	CONSTRAINT "existencias_al_cierre_montos" CHECK ("inventarios"."existencias_al_cierre"."cantidad" > 0 and "inventarios"."existencias_al_cierre"."costo_unitario" >= 0 and "inventarios"."existencias_al_cierre"."valor" >= 0)
);
--> statement-breakpoint
ALTER TABLE "inventarios"."existencias_al_cierre" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inventarios"."cierres" ADD CONSTRAINT "cierres_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."existencias_al_cierre" ADD CONSTRAINT "existencias_al_cierre_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."existencias_al_cierre" ADD CONSTRAINT "existencias_al_cierre_cierre_fk" FOREIGN KEY ("empresa_id","periodo") REFERENCES "inventarios"."cierres"("empresa_id","periodo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."existencias_al_cierre" ADD CONSTRAINT "existencias_al_cierre_articulo_fk" FOREIGN KEY ("articulo_id","empresa_id") REFERENCES "inventarios"."articulos"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."existencias_al_cierre" ADD CONSTRAINT "existencias_al_cierre_bodega_fk" FOREIGN KEY ("bodega_id","empresa_id") REFERENCES "inventarios"."bodegas"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "existencias_al_cierre_vigente_unica" ON "inventarios"."existencias_al_cierre" USING btree ("articulo_id","bodega_id","en_transito_interno","periodo") WHERE "inventarios"."existencias_al_cierre"."vigente";--> statement-breakpoint
CREATE INDEX "existencias_al_cierre_periodo_idx" ON "inventarios"."existencias_al_cierre" USING btree ("empresa_id","periodo") WHERE "inventarios"."existencias_al_cierre"."vigente";--> statement-breakpoint
CREATE INDEX "existencias_al_cierre_bodega_idx" ON "inventarios"."existencias_al_cierre" USING btree ("bodega_id");--> statement-breakpoint
CREATE INDEX "existencias_al_cierre_articulo_idx" ON "inventarios"."existencias_al_cierre" USING btree ("articulo_id");--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "inventarios"."cierres" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "inventarios"."existencias_al_cierre" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "alcance_inventarios_bodegas" ON "inventarios"."existencias_al_cierre" AS RESTRICTIVE FOR ALL TO "arrancar_app" USING ('inventarios.bodegas' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or bodega_id in (
      select a.bodega_id from inventarios.accesos_a_bodegas a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    )) WITH CHECK ('inventarios.bodegas' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or bodega_id in (
      select a.bodega_id from inventarios.accesos_a_bodegas a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    ));