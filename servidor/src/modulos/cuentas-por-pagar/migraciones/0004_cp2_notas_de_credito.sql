CREATE TABLE "cuentas_por_pagar"."ajustes_de_saldo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"proveedor_id" uuid NOT NULL,
	"documento_id" uuid NOT NULL,
	"monto" numeric(14, 2) NOT NULL,
	"fecha" date NOT NULL,
	"causa" text NOT NULL,
	"motivo" text NOT NULL,
	"referencia" text,
	"estado" text DEFAULT 'vigente' NOT NULL,
	"anulado_en" timestamp with time zone,
	"anulado_por" uuid,
	"motivo_de_anulacion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "ajustes_monto_positivo" CHECK ("cuentas_por_pagar"."ajustes_de_saldo"."monto" > 0),
	CONSTRAINT "ajustes_causa_valida" CHECK ("cuentas_por_pagar"."ajustes_de_saldo"."causa" in ('no_recuperable', 'diferencia_menor', 'compensado_con_otra_cuenta')),
	CONSTRAINT "ajustes_motivo_rango" CHECK (char_length("cuentas_por_pagar"."ajustes_de_saldo"."motivo") between 1 and 300),
	CONSTRAINT "ajustes_referencia_valida" CHECK ("cuentas_por_pagar"."ajustes_de_saldo"."referencia" is null or (char_length("cuentas_por_pagar"."ajustes_de_saldo"."referencia") between 1 and 100 and "cuentas_por_pagar"."ajustes_de_saldo"."referencia" = btrim("cuentas_por_pagar"."ajustes_de_saldo"."referencia"))),
	CONSTRAINT "ajustes_referencia_de_compensacion" CHECK ("cuentas_por_pagar"."ajustes_de_saldo"."causa" <> 'compensado_con_otra_cuenta' or "cuentas_por_pagar"."ajustes_de_saldo"."referencia" is not null),
	CONSTRAINT "ajustes_estado_valido" CHECK ("cuentas_por_pagar"."ajustes_de_saldo"."estado" in ('vigente', 'anulado')),
	CONSTRAINT "ajustes_motivo_de_anulacion_rango" CHECK ("cuentas_por_pagar"."ajustes_de_saldo"."motivo_de_anulacion" is null or char_length("cuentas_por_pagar"."ajustes_de_saldo"."motivo_de_anulacion") between 1 and 300),
	CONSTRAINT "ajustes_anulacion_completa" CHECK (("cuentas_por_pagar"."ajustes_de_saldo"."estado" = 'anulado') = ("cuentas_por_pagar"."ajustes_de_saldo"."anulado_en" is not null and "cuentas_por_pagar"."ajustes_de_saldo"."anulado_por" is not null and "cuentas_por_pagar"."ajustes_de_saldo"."motivo_de_anulacion" is not null))
);
--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."ajustes_de_saldo" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."aplicaciones_de_notas" DROP CONSTRAINT "aplicaciones_nota_cargo_unico";--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."aplicaciones_de_notas" ADD COLUMN "forma" text DEFAULT 'automatica' NOT NULL;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."aplicaciones_de_notas" ADD COLUMN "fecha" date;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."aplicaciones_de_notas" ADD COLUMN "referencia" text;--> statement-breakpoint
-- Relleno de la fecha: la recepción de la nota en el Libro de compras (el propietario ve todas las empresas); lo que no la tenga, la fecha de creación.
UPDATE "cuentas_por_pagar"."aplicaciones_de_notas" a SET "fecha" = l."fecha_recepcion" FROM "cuentas_por_pagar"."documentos" n JOIN "libro_de_compras"."documentos" l ON l."id" = n."documento_id" WHERE n."id" = a."nota_id";--> statement-breakpoint
UPDATE "cuentas_por_pagar"."aplicaciones_de_notas" SET "fecha" = "creado_en"::date WHERE "fecha" IS NULL;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."aplicaciones_de_notas" ALTER COLUMN "fecha" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."ajustes_de_saldo" ADD CONSTRAINT "ajustes_de_saldo_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."ajustes_de_saldo" ADD CONSTRAINT "ajustes_documento_fk" FOREIGN KEY ("documento_id","empresa_id","proveedor_id") REFERENCES "cuentas_por_pagar"."documentos"("id","empresa_id","proveedor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ajustes_documento_idx" ON "cuentas_por_pagar"."ajustes_de_saldo" USING btree ("documento_id");--> statement-breakpoint
CREATE UNIQUE INDEX "aplicaciones_automatica_unica" ON "cuentas_por_pagar"."aplicaciones_de_notas" USING btree ("nota_id","cargo_id") WHERE "cuentas_por_pagar"."aplicaciones_de_notas"."forma" = 'automatica';--> statement-breakpoint
CREATE INDEX "aplicaciones_nota_idx" ON "cuentas_por_pagar"."aplicaciones_de_notas" USING btree ("nota_id");--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."aplicaciones_de_notas" ADD CONSTRAINT "aplicaciones_forma_valida" CHECK ("cuentas_por_pagar"."aplicaciones_de_notas"."forma" in ('automatica', 'manual'));--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."aplicaciones_de_notas" ADD CONSTRAINT "aplicaciones_referencia_valida" CHECK ("cuentas_por_pagar"."aplicaciones_de_notas"."referencia" is null or ("cuentas_por_pagar"."aplicaciones_de_notas"."forma" = 'manual' and char_length("cuentas_por_pagar"."aplicaciones_de_notas"."referencia") between 1 and 100 and "cuentas_por_pagar"."aplicaciones_de_notas"."referencia" = btrim("cuentas_por_pagar"."aplicaciones_de_notas"."referencia")));--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "cuentas_por_pagar"."ajustes_de_saldo" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);