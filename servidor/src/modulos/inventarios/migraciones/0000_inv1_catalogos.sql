CREATE SCHEMA "inventarios";
--> statement-breakpoint
CREATE TABLE "inventarios"."articulos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"categoria_id" uuid NOT NULL,
	"tipo_de_inventario" text NOT NULL,
	"unidad_base_id" uuid NOT NULL,
	"maneja_lotes" boolean DEFAULT false NOT NULL,
	"maneja_vencimiento" boolean DEFAULT false NOT NULL,
	"codigo_de_barras" text,
	"concepto_de_gasto_id" uuid,
	"existencia_minima" numeric(14, 4),
	"peso_kg_por_unidad_base" numeric(14, 4),
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "articulos_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "articulos_codigo_forma" CHECK ("inventarios"."articulos"."codigo" ~ '^[A-Za-z0-9./-]{1,30}$'),
	CONSTRAINT "articulos_nombre_largo" CHECK (char_length(btrim("inventarios"."articulos"."nombre")) between 1 and 150),
	CONSTRAINT "articulos_descripcion_largo" CHECK (char_length("inventarios"."articulos"."descripcion") between 1 and 500),
	CONSTRAINT "articulos_tipo_de_inventario" CHECK ("inventarios"."articulos"."tipo_de_inventario" in ('mercaderia', 'materia_prima', 'suministros', 'producto_en_proceso', 'producto_terminado', 'repuestos', 'empaques')),
	CONSTRAINT "articulos_vencimiento_con_lotes" CHECK (not "inventarios"."articulos"."maneja_vencimiento" or "inventarios"."articulos"."maneja_lotes"),
	CONSTRAINT "articulos_codigo_de_barras_largo" CHECK (char_length("inventarios"."articulos"."codigo_de_barras") between 1 and 60),
	CONSTRAINT "articulos_existencia_minima" CHECK ("inventarios"."articulos"."existencia_minima" >= 0),
	CONSTRAINT "articulos_peso_positivo" CHECK ("inventarios"."articulos"."peso_kg_por_unidad_base" > 0)
);
--> statement-breakpoint
ALTER TABLE "inventarios"."articulos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventarios"."categorias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"tipo_de_inventario_por_omision" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "categorias_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "categorias_nombre_largo" CHECK (char_length(btrim("inventarios"."categorias"."nombre")) between 1 and 80),
	CONSTRAINT "categorias_tipo_de_inventario" CHECK ("inventarios"."categorias"."tipo_de_inventario_por_omision" in ('mercaderia', 'materia_prima', 'suministros', 'producto_en_proceso', 'producto_terminado', 'repuestos', 'empaques'))
);
--> statement-breakpoint
ALTER TABLE "inventarios"."categorias" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventarios"."conversiones" (
	"empresa_id" uuid NOT NULL,
	"articulo_id" uuid NOT NULL,
	"unidad_id" uuid NOT NULL,
	"factor" numeric(18, 8) NOT NULL,
	"para_compras" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "conversiones_pk" PRIMARY KEY("articulo_id","unidad_id"),
	CONSTRAINT "conversiones_factor_positivo" CHECK ("inventarios"."conversiones"."factor" > 0)
);
--> statement-breakpoint
ALTER TABLE "inventarios"."conversiones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventarios"."lotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"articulo_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"fecha_de_vencimiento" date,
	"fecha_de_fabricacion" date,
	"observaciones" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "lotes_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "lotes_codigo_largo" CHECK (char_length(btrim("inventarios"."lotes"."codigo")) between 1 and 40),
	CONSTRAINT "lotes_observaciones_largo" CHECK (char_length("inventarios"."lotes"."observaciones") between 1 and 500)
);
--> statement-breakpoint
ALTER TABLE "inventarios"."lotes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventarios"."unidades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"simbolo" text NOT NULL,
	"magnitud" text NOT NULL,
	"factor_a_la_referencia" numeric(18, 8),
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "unidades_id_empresa_unico" UNIQUE("id","empresa_id"),
	CONSTRAINT "unidades_nombre_largo" CHECK (char_length(btrim("inventarios"."unidades"."nombre")) between 1 and 40),
	CONSTRAINT "unidades_simbolo_largo" CHECK (char_length(btrim("inventarios"."unidades"."simbolo")) between 1 and 10),
	CONSTRAINT "unidades_magnitud" CHECK ("inventarios"."unidades"."magnitud" in ('cantidad', 'masa', 'volumen', 'longitud', 'superficie', 'empaque')),
	CONSTRAINT "unidades_factor_positivo" CHECK ("inventarios"."unidades"."factor_a_la_referencia" > 0),
	CONSTRAINT "unidades_factor_segun_magnitud" CHECK (("inventarios"."unidades"."magnitud" in ('masa', 'volumen', 'longitud', 'superficie')) = ("inventarios"."unidades"."factor_a_la_referencia" is not null))
);
--> statement-breakpoint
ALTER TABLE "inventarios"."unidades" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inventarios"."articulos" ADD CONSTRAINT "articulos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."articulos" ADD CONSTRAINT "articulos_categoria_fk" FOREIGN KEY ("categoria_id","empresa_id") REFERENCES "inventarios"."categorias"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."articulos" ADD CONSTRAINT "articulos_unidad_base_fk" FOREIGN KEY ("unidad_base_id","empresa_id") REFERENCES "inventarios"."unidades"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."articulos" ADD CONSTRAINT "articulos_concepto_de_gasto_fk" FOREIGN KEY ("concepto_de_gasto_id","empresa_id") REFERENCES "libro_de_compras"."conceptos_de_gasto"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."categorias" ADD CONSTRAINT "categorias_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."conversiones" ADD CONSTRAINT "conversiones_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."conversiones" ADD CONSTRAINT "conversiones_articulo_fk" FOREIGN KEY ("articulo_id","empresa_id") REFERENCES "inventarios"."articulos"("id","empresa_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."conversiones" ADD CONSTRAINT "conversiones_unidad_fk" FOREIGN KEY ("unidad_id","empresa_id") REFERENCES "inventarios"."unidades"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."lotes" ADD CONSTRAINT "lotes_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."lotes" ADD CONSTRAINT "lotes_articulo_fk" FOREIGN KEY ("articulo_id","empresa_id") REFERENCES "inventarios"."articulos"("id","empresa_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventarios"."unidades" ADD CONSTRAINT "unidades_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "articulos_codigo_unico" ON "inventarios"."articulos" USING btree ("empresa_id",upper("codigo"));--> statement-breakpoint
CREATE UNIQUE INDEX "articulos_nombre_unico" ON "inventarios"."articulos" USING btree ("empresa_id",core.nombre_normalizado("nombre"));--> statement-breakpoint
CREATE UNIQUE INDEX "articulos_codigo_de_barras_unico" ON "inventarios"."articulos" USING btree ("empresa_id","codigo_de_barras") WHERE "inventarios"."articulos"."codigo_de_barras" is not null;--> statement-breakpoint
CREATE INDEX "articulos_empresa_activo_categoria_idx" ON "inventarios"."articulos" USING btree ("empresa_id","activo","categoria_id");--> statement-breakpoint
CREATE INDEX "articulos_categoria_idx" ON "inventarios"."articulos" USING btree ("categoria_id");--> statement-breakpoint
CREATE INDEX "articulos_unidad_base_idx" ON "inventarios"."articulos" USING btree ("unidad_base_id");--> statement-breakpoint
CREATE INDEX "articulos_concepto_de_gasto_idx" ON "inventarios"."articulos" USING btree ("concepto_de_gasto_id") WHERE "inventarios"."articulos"."concepto_de_gasto_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "categorias_nombre_unico" ON "inventarios"."categorias" USING btree ("empresa_id",core.nombre_normalizado("nombre"));--> statement-breakpoint
CREATE INDEX "categorias_empresa_activo_idx" ON "inventarios"."categorias" USING btree ("empresa_id","activo");--> statement-breakpoint
CREATE UNIQUE INDEX "conversiones_para_compras_unica" ON "inventarios"."conversiones" USING btree ("articulo_id") WHERE "inventarios"."conversiones"."para_compras";--> statement-breakpoint
CREATE INDEX "conversiones_unidad_idx" ON "inventarios"."conversiones" USING btree ("unidad_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lotes_codigo_unico" ON "inventarios"."lotes" USING btree ("articulo_id",upper("codigo"));--> statement-breakpoint
CREATE INDEX "lotes_por_vencer_idx" ON "inventarios"."lotes" USING btree ("empresa_id","fecha_de_vencimiento") WHERE "inventarios"."lotes"."fecha_de_vencimiento" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "unidades_nombre_unico" ON "inventarios"."unidades" USING btree ("empresa_id",core.nombre_normalizado("nombre"));--> statement-breakpoint
CREATE UNIQUE INDEX "unidades_simbolo_unico" ON "inventarios"."unidades" USING btree ("empresa_id",upper("simbolo"));--> statement-breakpoint
CREATE INDEX "unidades_empresa_activo_idx" ON "inventarios"."unidades" USING btree ("empresa_id","activo");--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "inventarios"."articulos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "inventarios"."categorias" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "inventarios"."conversiones" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "inventarios"."lotes" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "inventarios"."unidades" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);