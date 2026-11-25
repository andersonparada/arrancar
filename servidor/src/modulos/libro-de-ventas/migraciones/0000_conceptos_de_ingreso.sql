CREATE SCHEMA "libro_de_ventas";
--> statement-breakpoint
CREATE TABLE "libro_de_ventas"."conceptos_de_ingreso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"tipo" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "conceptos_de_ingreso_nombre_unico" UNIQUE("empresa_id","nombre")
);
--> statement-breakpoint
ALTER TABLE "libro_de_ventas"."conceptos_de_ingreso" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "libro_de_ventas"."conceptos_de_ingreso" ADD CONSTRAINT "conceptos_de_ingreso_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "libro_de_ventas"."conceptos_de_ingreso" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);