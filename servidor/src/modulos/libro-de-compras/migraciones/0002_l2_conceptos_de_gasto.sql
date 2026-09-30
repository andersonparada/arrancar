CREATE TABLE "libro_de_compras"."conceptos_de_gasto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"tipo_por_omision" text NOT NULL,
	"es_producto_agropecuario" boolean DEFAULT false NOT NULL,
	"es_activo_fijo" boolean DEFAULT false NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "conceptos_de_gasto_nombre_unico" UNIQUE("empresa_id","nombre"),
	CONSTRAINT "conceptos_de_gasto_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "conceptos_de_gasto_nombre_largo" CHECK (char_length(btrim("libro_de_compras"."conceptos_de_gasto"."nombre")) between 1 and 120),
	CONSTRAINT "conceptos_de_gasto_tipo" CHECK ("libro_de_compras"."conceptos_de_gasto"."tipo_por_omision" in ('bien', 'servicio')),
	CONSTRAINT "conceptos_de_gasto_activo_fijo_es_bien" CHECK (not "libro_de_compras"."conceptos_de_gasto"."es_activo_fijo" or "libro_de_compras"."conceptos_de_gasto"."tipo_por_omision" = 'bien')
);
--> statement-breakpoint
ALTER TABLE "libro_de_compras"."conceptos_de_gasto" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."conceptos_de_gasto" ADD CONSTRAINT "conceptos_de_gasto_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "libro_de_compras"."conceptos_de_gasto" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);