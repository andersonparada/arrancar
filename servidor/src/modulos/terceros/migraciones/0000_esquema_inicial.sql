CREATE SCHEMA "terceros";
--> statement-breakpoint
CREATE TABLE "terceros"."clientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cuenta_id" uuid NOT NULL,
	"tercero_id" uuid NOT NULL,
	"clase" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"notas" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "terceros"."clientes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "terceros"."contactos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cuenta_id" uuid NOT NULL,
	"tercero_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"cargo" text,
	"telefono" text,
	"whatsapp" text,
	"correo" text,
	"notas" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "terceros"."contactos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "terceros"."categorias_proveedor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cuenta_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categorias_proveedor_nombre_por_cuenta" UNIQUE("cuenta_id","nombre")
);
--> statement-breakpoint
ALTER TABLE "terceros"."categorias_proveedor" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "terceros"."proveedores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cuenta_id" uuid NOT NULL,
	"tercero_id" uuid NOT NULL,
	"categoria_id" uuid,
	"activo" boolean DEFAULT true NOT NULL,
	"notas" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "terceros"."proveedores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "terceros"."terceros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cuenta_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"nombres" text,
	"apellidos" text,
	"razon_social" text,
	"nombre_comercial" text,
	"nombre_mostrar" text NOT NULL,
	"nit" text,
	"dpi" text,
	"telefono" text,
	"whatsapp" text,
	"correo" text,
	"departamento_codigo" char(2),
	"municipio_codigo" char(2),
	"direccion" text,
	"foto_archivo_id" uuid,
	"notas" text,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "terceros"."terceros" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "terceros"."trabajadores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cuenta_id" uuid NOT NULL,
	"tercero_id" uuid NOT NULL,
	"cargo" text,
	"fecha_ingreso" date,
	"fecha_salida" date,
	"activo" boolean DEFAULT true NOT NULL,
	"notas" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "terceros"."trabajadores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "terceros"."clientes" ADD CONSTRAINT "clientes_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terceros"."clientes" ADD CONSTRAINT "clientes_tercero_id_terceros_id_fk" FOREIGN KEY ("tercero_id") REFERENCES "terceros"."terceros"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terceros"."contactos" ADD CONSTRAINT "contactos_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terceros"."contactos" ADD CONSTRAINT "contactos_tercero_id_terceros_id_fk" FOREIGN KEY ("tercero_id") REFERENCES "terceros"."terceros"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terceros"."categorias_proveedor" ADD CONSTRAINT "categorias_proveedor_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terceros"."proveedores" ADD CONSTRAINT "proveedores_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terceros"."proveedores" ADD CONSTRAINT "proveedores_tercero_id_terceros_id_fk" FOREIGN KEY ("tercero_id") REFERENCES "terceros"."terceros"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terceros"."proveedores" ADD CONSTRAINT "proveedores_categoria_id_categorias_proveedor_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "terceros"."categorias_proveedor"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terceros"."terceros" ADD CONSTRAINT "terceros_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terceros"."terceros" ADD CONSTRAINT "terceros_foto_archivo_id_archivos_id_fk" FOREIGN KEY ("foto_archivo_id") REFERENCES "core"."archivos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terceros"."terceros" ADD CONSTRAINT "terceros_departamento_codigo_municipio_codigo_municipios_departamento_codigo_codigo_fk" FOREIGN KEY ("departamento_codigo","municipio_codigo") REFERENCES "core"."municipios"("departamento_codigo","codigo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terceros"."trabajadores" ADD CONSTRAINT "trabajadores_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terceros"."trabajadores" ADD CONSTRAINT "trabajadores_tercero_id_terceros_id_fk" FOREIGN KEY ("tercero_id") REFERENCES "terceros"."terceros"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "clientes_tercero_idx" ON "terceros"."clientes" USING btree ("tercero_id");--> statement-breakpoint
CREATE INDEX "contactos_tercero_idx" ON "terceros"."contactos" USING btree ("tercero_id");--> statement-breakpoint
CREATE UNIQUE INDEX "proveedores_tercero_idx" ON "terceros"."proveedores" USING btree ("tercero_id");--> statement-breakpoint
CREATE INDEX "proveedores_categoria_idx" ON "terceros"."proveedores" USING btree ("categoria_id");--> statement-breakpoint
CREATE INDEX "terceros_cuenta_idx" ON "terceros"."terceros" USING btree ("cuenta_id");--> statement-breakpoint
CREATE UNIQUE INDEX "terceros_nit_por_cuenta_idx" ON "terceros"."terceros" USING btree ("cuenta_id","nit") WHERE nit <> 'CF';--> statement-breakpoint
CREATE UNIQUE INDEX "terceros_dpi_por_cuenta_idx" ON "terceros"."terceros" USING btree ("cuenta_id","dpi");--> statement-breakpoint
CREATE UNIQUE INDEX "trabajadores_tercero_idx" ON "terceros"."trabajadores" USING btree ("tercero_id");--> statement-breakpoint
CREATE POLICY "aislamiento_por_cuenta" ON "terceros"."clientes" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (cuenta_id = nullif(current_setting('app.cuenta_id', true), '')::uuid) WITH CHECK (cuenta_id = nullif(current_setting('app.cuenta_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_cuenta" ON "terceros"."contactos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (cuenta_id = nullif(current_setting('app.cuenta_id', true), '')::uuid) WITH CHECK (cuenta_id = nullif(current_setting('app.cuenta_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_cuenta" ON "terceros"."categorias_proveedor" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (cuenta_id = nullif(current_setting('app.cuenta_id', true), '')::uuid) WITH CHECK (cuenta_id = nullif(current_setting('app.cuenta_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_cuenta" ON "terceros"."proveedores" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (cuenta_id = nullif(current_setting('app.cuenta_id', true), '')::uuid) WITH CHECK (cuenta_id = nullif(current_setting('app.cuenta_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_cuenta" ON "terceros"."terceros" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (cuenta_id = nullif(current_setting('app.cuenta_id', true), '')::uuid) WITH CHECK (cuenta_id = nullif(current_setting('app.cuenta_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_cuenta" ON "terceros"."trabajadores" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (cuenta_id = nullif(current_setting('app.cuenta_id', true), '')::uuid) WITH CHECK (cuenta_id = nullif(current_setting('app.cuenta_id', true), '')::uuid);