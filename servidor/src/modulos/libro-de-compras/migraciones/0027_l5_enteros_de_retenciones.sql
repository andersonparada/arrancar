CREATE TABLE "libro_de_compras"."enteros_de_retenciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"mes" date NOT NULL,
	"grupo" text NOT NULL,
	"fecha_de_pago" date NOT NULL,
	"documento_de_pago" text NOT NULL,
	"monto" numeric(14, 2) NOT NULL,
	"retenido_al_marcar" numeric(14, 2) NOT NULL,
	"observaciones" text,
	"estado" text DEFAULT 'vigente' NOT NULL,
	"anulado_en" timestamp with time zone,
	"anulado_por" uuid,
	"motivo_de_anulacion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "enteros_de_retenciones_mes_primer_dia" CHECK ("libro_de_compras"."enteros_de_retenciones"."mes" = date_trunc('month', "libro_de_compras"."enteros_de_retenciones"."mes")::date),
	CONSTRAINT "enteros_de_retenciones_grupo_valido" CHECK ("libro_de_compras"."enteros_de_retenciones"."grupo" in ('iva_agentes', 'isr_opcional', 'iva_factura_especial', 'isr_factura_especial')),
	CONSTRAINT "enteros_de_retenciones_fecha_de_pago" CHECK ("libro_de_compras"."enteros_de_retenciones"."fecha_de_pago" >= "libro_de_compras"."enteros_de_retenciones"."mes"),
	CONSTRAINT "enteros_de_retenciones_documento_de_pago" CHECK (char_length("libro_de_compras"."enteros_de_retenciones"."documento_de_pago") between 1 and 40 and "libro_de_compras"."enteros_de_retenciones"."documento_de_pago" !~ '\s'),
	CONSTRAINT "enteros_de_retenciones_monto_positivo" CHECK ("libro_de_compras"."enteros_de_retenciones"."monto" > 0),
	CONSTRAINT "enteros_de_retenciones_retenido_no_negativo" CHECK ("libro_de_compras"."enteros_de_retenciones"."retenido_al_marcar" >= 0),
	CONSTRAINT "enteros_de_retenciones_observaciones_rango" CHECK ("libro_de_compras"."enteros_de_retenciones"."observaciones" is null or char_length("libro_de_compras"."enteros_de_retenciones"."observaciones") between 1 and 300),
	CONSTRAINT "enteros_de_retenciones_estado_valido" CHECK ("libro_de_compras"."enteros_de_retenciones"."estado" in ('vigente', 'anulado')),
	CONSTRAINT "enteros_de_retenciones_anulacion_completa" CHECK (("libro_de_compras"."enteros_de_retenciones"."estado" = 'anulado') = ("libro_de_compras"."enteros_de_retenciones"."anulado_en" is not null and "libro_de_compras"."enteros_de_retenciones"."anulado_por" is not null and "libro_de_compras"."enteros_de_retenciones"."motivo_de_anulacion" is not null)),
	CONSTRAINT "enteros_de_retenciones_motivo_rango" CHECK ("libro_de_compras"."enteros_de_retenciones"."motivo_de_anulacion" is null or char_length("libro_de_compras"."enteros_de_retenciones"."motivo_de_anulacion") between 1 and 300)
);
--> statement-breakpoint
ALTER TABLE "libro_de_compras"."enteros_de_retenciones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."enteros_de_retenciones" ADD CONSTRAINT "enteros_de_retenciones_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "enteros_de_retenciones_mes_idx" ON "libro_de_compras"."enteros_de_retenciones" USING btree ("empresa_id","mes","grupo");--> statement-breakpoint
CREATE POLICY "aislamiento_por_empresa" ON "libro_de_compras"."enteros_de_retenciones" AS PERMISSIVE FOR ALL TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);