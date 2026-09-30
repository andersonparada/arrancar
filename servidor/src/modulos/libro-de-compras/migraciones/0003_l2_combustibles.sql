CREATE TABLE "libro_de_compras"."combustibles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "combustibles_nombre_unico" UNIQUE("empresa_id","nombre"),
	CONSTRAINT "combustibles_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "combustibles_nombre_largo" CHECK (char_length(btrim("libro_de_compras"."combustibles"."nombre")) between 1 and 80)
);
--> statement-breakpoint
ALTER TABLE "libro_de_compras"."combustibles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "libro_de_compras"."vigencias_de_combustible" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"combustible_id" uuid NOT NULL,
	"idp_por_galon" numeric(8, 2) NOT NULL,
	"porcentaje_de_etanol" numeric(5, 2) DEFAULT '0' NOT NULL,
	"vigente_desde" date NOT NULL,
	"vigente_hasta" date,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "vigencias_de_combustible_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "vigencias_de_combustible_idp_no_negativo" CHECK ("libro_de_compras"."vigencias_de_combustible"."idp_por_galon" >= 0),
	CONSTRAINT "vigencias_de_combustible_etanol_valido" CHECK ("libro_de_compras"."vigencias_de_combustible"."porcentaje_de_etanol" between 0 and 100),
	CONSTRAINT "vigencias_de_combustible_fechas_ordenadas" CHECK ("libro_de_compras"."vigencias_de_combustible"."vigente_hasta" is null or "libro_de_compras"."vigencias_de_combustible"."vigente_hasta" >= "libro_de_compras"."vigencias_de_combustible"."vigente_desde")
);
--> statement-breakpoint
ALTER TABLE "libro_de_compras"."vigencias_de_combustible" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."combustibles" ADD CONSTRAINT "combustibles_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."vigencias_de_combustible" ADD CONSTRAINT "vigencias_de_combustible_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."vigencias_de_combustible" ADD CONSTRAINT "vigencias_de_combustible_combustible_fk" FOREIGN KEY ("combustible_id","empresa_id") REFERENCES "libro_de_compras"."combustibles"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "libro_de_compras"."combustibles" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "libro_de_compras"."vigencias_de_combustible" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);