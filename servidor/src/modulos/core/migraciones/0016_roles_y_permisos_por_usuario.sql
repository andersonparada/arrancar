CREATE TABLE "core"."usuario_permisos" (
	"cuenta_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"permiso" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "usuario_permisos_cuenta_id_usuario_id_permiso_pk" PRIMARY KEY("cuenta_id","usuario_id","permiso"),
	CONSTRAINT "usuario_permisos_formato" CHECK ("core"."usuario_permisos"."permiso" ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$')
);
--> statement-breakpoint
CREATE TABLE "core"."usuario_roles" (
	"cuenta_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"rol_id" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "usuario_roles_cuenta_id_usuario_id_rol_id_pk" PRIMARY KEY("cuenta_id","usuario_id","rol_id")
);
--> statement-breakpoint
ALTER TABLE "core"."empresa_usuarios" ALTER COLUMN "rol_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."usuario_permisos" ADD CONSTRAINT "usuario_permisos_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."usuario_permisos" ADD CONSTRAINT "usuario_permisos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."usuario_roles" ADD CONSTRAINT "usuario_roles_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."usuario_roles" ADD CONSTRAINT "usuario_roles_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "core"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."roles" ADD CONSTRAINT "roles_id_cuenta_unico" UNIQUE("id","cuenta_id");--> statement-breakpoint
ALTER TABLE "core"."usuario_roles" ADD CONSTRAINT "usuario_roles_rol_de_la_cuenta_fk" FOREIGN KEY ("rol_id","cuenta_id") REFERENCES "core"."roles"("id","cuenta_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "usuario_permisos_permiso_idx" ON "core"."usuario_permisos" USING btree ("permiso");--> statement-breakpoint
CREATE INDEX "usuario_roles_rol_idx" ON "core"."usuario_roles" USING btree ("rol_id");
