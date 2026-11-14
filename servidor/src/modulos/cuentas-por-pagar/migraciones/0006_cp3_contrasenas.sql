CREATE TABLE "cuentas_por_pagar"."contrasena_documentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"proveedor_id" uuid NOT NULL,
	"contrasena_id" uuid NOT NULL,
	"documento_id" uuid NOT NULL,
	"vigente" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "contrasena_documentos_par_unico" UNIQUE("contrasena_id","documento_id")
);
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."contrasena_documentos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cuentas_por_pagar"."contrasenas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"proveedor_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"anio_de_numero" integer DEFAULT 0 NOT NULL,
	"fecha" date NOT NULL,
	"fecha_de_pago" date NOT NULL,
	"observaciones" text,
	"estado" text DEFAULT 'vigente' NOT NULL,
	"anulada_en" timestamp with time zone,
	"anulada_por" uuid,
	"motivo_de_anulacion" text,
	"impresa_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "contrasenas_numero_unico" UNIQUE("empresa_id","anio_de_numero","numero"),
	CONSTRAINT "contrasenas_id_proveedor_unico" UNIQUE("id","empresa_id","proveedor_id"),
	CONSTRAINT "contrasenas_numero_positivo" CHECK ("cuentas_por_pagar"."contrasenas"."numero" > 0),
	CONSTRAINT "contrasenas_pago_desde_la_fecha" CHECK ("cuentas_por_pagar"."contrasenas"."fecha_de_pago" >= "cuentas_por_pagar"."contrasenas"."fecha"),
	CONSTRAINT "contrasenas_observaciones_validas" CHECK ("cuentas_por_pagar"."contrasenas"."observaciones" is null or (char_length("cuentas_por_pagar"."contrasenas"."observaciones") between 1 and 500 and "cuentas_por_pagar"."contrasenas"."observaciones" = btrim("cuentas_por_pagar"."contrasenas"."observaciones"))),
	CONSTRAINT "contrasenas_estado_valido" CHECK ("cuentas_por_pagar"."contrasenas"."estado" in ('vigente', 'anulada')),
	CONSTRAINT "contrasenas_anulacion_completa" CHECK (("cuentas_por_pagar"."contrasenas"."estado" = 'anulada') = ("cuentas_por_pagar"."contrasenas"."anulada_en" is not null and "cuentas_por_pagar"."contrasenas"."anulada_por" is not null and "cuentas_por_pagar"."contrasenas"."motivo_de_anulacion" is not null)),
	CONSTRAINT "contrasenas_motivo_rango" CHECK ("cuentas_por_pagar"."contrasenas"."motivo_de_anulacion" is null or char_length("cuentas_por_pagar"."contrasenas"."motivo_de_anulacion") between 1 and 300)
);
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."contrasenas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."aplicaciones_de_notas" DROP CONSTRAINT "aplicaciones_forma_valida";--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."aplicaciones_de_notas" ADD COLUMN "contrasena_id" uuid;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."contrasena_documentos" ADD CONSTRAINT "contrasena_documentos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."contrasena_documentos" ADD CONSTRAINT "contrasena_documentos_contrasena_fk" FOREIGN KEY ("contrasena_id","empresa_id","proveedor_id") REFERENCES "cuentas_por_pagar"."contrasenas"("id","empresa_id","proveedor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."contrasena_documentos" ADD CONSTRAINT "contrasena_documentos_documento_fk" FOREIGN KEY ("documento_id","empresa_id","proveedor_id") REFERENCES "cuentas_por_pagar"."documentos"("id","empresa_id","proveedor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."contrasenas" ADD CONSTRAINT "contrasenas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."contrasenas" ADD CONSTRAINT "contrasenas_proveedor_fk" FOREIGN KEY ("proveedor_id") REFERENCES "terceros"."proveedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contrasena_documentos_vigente_unico" ON "cuentas_por_pagar"."contrasena_documentos" USING btree ("documento_id") WHERE "cuentas_por_pagar"."contrasena_documentos"."vigente";--> statement-breakpoint
CREATE INDEX "contrasena_documentos_documento_idx" ON "cuentas_por_pagar"."contrasena_documentos" USING btree ("documento_id");--> statement-breakpoint
CREATE INDEX "contrasenas_proveedor_idx" ON "cuentas_por_pagar"."contrasenas" USING btree ("proveedor_id");--> statement-breakpoint
CREATE INDEX "contrasenas_lista_idx" ON "cuentas_por_pagar"."contrasenas" USING btree ("empresa_id","estado","fecha");--> statement-breakpoint
CREATE INDEX "contrasenas_pago_idx" ON "cuentas_por_pagar"."contrasenas" USING btree ("empresa_id","fecha_de_pago") WHERE "cuentas_por_pagar"."contrasenas"."estado" = 'vigente';--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."aplicaciones_de_notas" ADD CONSTRAINT "aplicaciones_contrasena_fk" FOREIGN KEY ("contrasena_id") REFERENCES "cuentas_por_pagar"."contrasenas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "aplicaciones_contrasena_idx" ON "cuentas_por_pagar"."aplicaciones_de_notas" USING btree ("contrasena_id") WHERE "cuentas_por_pagar"."aplicaciones_de_notas"."contrasena_id" is not null;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."aplicaciones_de_notas" ADD CONSTRAINT "aplicaciones_contrasena_de_su_forma" CHECK (("cuentas_por_pagar"."aplicaciones_de_notas"."forma" = 'contrasena') = ("cuentas_por_pagar"."aplicaciones_de_notas"."contrasena_id" is not null));--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."aplicaciones_de_notas" ADD CONSTRAINT "aplicaciones_forma_valida" CHECK ("cuentas_por_pagar"."aplicaciones_de_notas"."forma" in ('automatica', 'manual', 'contrasena'));--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "cuentas_por_pagar"."contrasena_documentos" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "cuentas_por_pagar"."contrasenas" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);