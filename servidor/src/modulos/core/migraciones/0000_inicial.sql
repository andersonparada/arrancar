CREATE SCHEMA "core";
--> statement-breakpoint
CREATE TABLE "core"."accesos_datos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"recurso" text NOT NULL,
	"registro_id" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accesos_datos_unico" UNIQUE("usuario_id","recurso","registro_id")
);
--> statement-breakpoint
ALTER TABLE "core"."accesos_datos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "core"."archivos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"ruta_original" text NOT NULL,
	"ruta_miniatura" text NOT NULL,
	"tipo_mime" text NOT NULL,
	"tamano_bytes" integer NOT NULL,
	"ancho" integer NOT NULL,
	"alto" integer NOT NULL,
	"nombre_original" text,
	"subido_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."archivos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "core"."bitacora_superacceso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"empresa_id" uuid,
	"accion" text NOT NULL,
	"detalle" jsonb,
	"direccion_ip" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."configuraciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nivel" text NOT NULL,
	"cuenta_id" uuid NOT NULL,
	"empresa_id" uuid,
	"clave" text NOT NULL,
	"valor" jsonb NOT NULL,
	"actualizado_por" uuid,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "configuraciones_nivel_coherente" CHECK ((nivel = 'cuenta' and empresa_id is null) or (nivel = 'empresa' and empresa_id is not null))
);
--> statement-breakpoint
CREATE TABLE "core"."cuenta_modulos" (
	"cuenta_id" uuid NOT NULL,
	"modulo_clave" text NOT NULL,
	"activado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cuenta_modulos_cuenta_id_modulo_clave_pk" PRIMARY KEY("cuenta_id","modulo_clave")
);
--> statement-breakpoint
CREATE TABLE "core"."cuentas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."empresa_usuarios" (
	"empresa_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"rol_id" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "empresa_usuarios_empresa_id_usuario_id_pk" PRIMARY KEY("empresa_id","usuario_id")
);
--> statement-breakpoint
CREATE TABLE "core"."empresas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cuenta_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"nit" text,
	"direccion" text,
	"telefono" text,
	"correo" text,
	"moneda_base" char(3) DEFAULT 'GTQ' NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."monedas" (
	"codigo" char(3) PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"simbolo" text NOT NULL,
	"decimales" smallint DEFAULT 2 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."rol_permisos" (
	"rol_id" uuid NOT NULL,
	"permiso" text NOT NULL,
	CONSTRAINT "rol_permisos_rol_id_permiso_pk" PRIMARY KEY("rol_id","permiso")
);
--> statement-breakpoint
CREATE TABLE "core"."roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cuenta_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"acceso_total" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_nombre_por_cuenta" UNIQUE("cuenta_id","nombre")
);
--> statement-breakpoint
CREATE TABLE "core"."sesiones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hash_token" text NOT NULL,
	"usuario_id" uuid NOT NULL,
	"empresa_activa_id" uuid,
	"direccion_ip" text,
	"agente_usuario" text,
	"expira_en" timestamp with time zone NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sesiones_hashToken_unique" UNIQUE("hash_token")
);
--> statement-breakpoint
CREATE TABLE "core"."usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"correo" text NOT NULL,
	"nombre" text NOT NULL,
	"hash_contrasena" text NOT NULL,
	"es_superacceso" boolean DEFAULT false NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"ultimo_acceso_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."accesos_datos" ADD CONSTRAINT "accesos_datos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."accesos_datos" ADD CONSTRAINT "accesos_datos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."archivos" ADD CONSTRAINT "archivos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."archivos" ADD CONSTRAINT "archivos_subido_por_usuarios_id_fk" FOREIGN KEY ("subido_por") REFERENCES "core"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."bitacora_superacceso" ADD CONSTRAINT "bitacora_superacceso_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."bitacora_superacceso" ADD CONSTRAINT "bitacora_superacceso_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."configuraciones" ADD CONSTRAINT "configuraciones_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."configuraciones" ADD CONSTRAINT "configuraciones_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."configuraciones" ADD CONSTRAINT "configuraciones_actualizado_por_usuarios_id_fk" FOREIGN KEY ("actualizado_por") REFERENCES "core"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."cuenta_modulos" ADD CONSTRAINT "cuenta_modulos_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."empresa_usuarios" ADD CONSTRAINT "empresa_usuarios_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."empresa_usuarios" ADD CONSTRAINT "empresa_usuarios_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."empresa_usuarios" ADD CONSTRAINT "empresa_usuarios_rol_id_roles_id_fk" FOREIGN KEY ("rol_id") REFERENCES "core"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."empresas" ADD CONSTRAINT "empresas_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."empresas" ADD CONSTRAINT "empresas_moneda_base_monedas_codigo_fk" FOREIGN KEY ("moneda_base") REFERENCES "core"."monedas"("codigo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."rol_permisos" ADD CONSTRAINT "rol_permisos_rol_id_roles_id_fk" FOREIGN KEY ("rol_id") REFERENCES "core"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."roles" ADD CONSTRAINT "roles_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."sesiones" ADD CONSTRAINT "sesiones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."sesiones" ADD CONSTRAINT "sesiones_empresa_activa_id_empresas_id_fk" FOREIGN KEY ("empresa_activa_id") REFERENCES "core"."empresas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accesos_datos_busqueda_idx" ON "core"."accesos_datos" USING btree ("recurso","registro_id","usuario_id");--> statement-breakpoint
CREATE INDEX "archivos_empresa_idx" ON "core"."archivos" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "bitacora_superacceso_fecha_idx" ON "core"."bitacora_superacceso" USING btree ("creado_en");--> statement-breakpoint
CREATE UNIQUE INDEX "configuraciones_por_cuenta" ON "core"."configuraciones" USING btree ("cuenta_id","clave") WHERE nivel = 'cuenta';--> statement-breakpoint
CREATE UNIQUE INDEX "configuraciones_por_empresa" ON "core"."configuraciones" USING btree ("empresa_id","clave") WHERE nivel = 'empresa';--> statement-breakpoint
CREATE INDEX "empresa_usuarios_usuario_idx" ON "core"."empresa_usuarios" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "empresas_cuenta_idx" ON "core"."empresas" USING btree ("cuenta_id");--> statement-breakpoint
CREATE INDEX "sesiones_usuario_idx" ON "core"."sesiones" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_correo_unico" ON "core"."usuarios" USING btree (lower("correo"));--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "core"."accesos_datos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "core"."archivos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);