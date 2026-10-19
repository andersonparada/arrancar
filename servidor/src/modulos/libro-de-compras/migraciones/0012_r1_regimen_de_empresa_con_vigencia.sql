-- R1: los datos fiscales de la empresa pasan a ser un historial con vigencia (escalones). La fila que ya existe
-- se vuelve la base (`vigente_desde` nulo) de persona jurídica. Escrita a mano porque drizzle-kit no sabe cambiar la llave primaria.
ALTER TABLE "libro_de_compras"."datos_fiscales_de_empresa" DROP CONSTRAINT "datos_fiscales_de_empresa_pequeno_no_retiene";--> statement-breakpoint
ALTER TABLE "libro_de_compras"."datos_fiscales_de_empresa" DROP CONSTRAINT "datos_fiscales_de_empresa_regimen_iva";--> statement-breakpoint
ALTER TABLE "libro_de_compras"."datos_fiscales_de_empresa" DROP CONSTRAINT "datos_fiscales_de_empresa_regimen_isr";--> statement-breakpoint
ALTER TABLE "libro_de_compras"."datos_fiscales_de_empresa" DROP CONSTRAINT "datos_fiscales_de_empresa_pkey";--> statement-breakpoint
ALTER TABLE "libro_de_compras"."datos_fiscales_de_empresa" ADD COLUMN "id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."datos_fiscales_de_empresa" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "libro_de_compras"."datos_fiscales_de_empresa" ADD COLUMN "vigente_desde" date;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."datos_fiscales_de_empresa" ADD COLUMN "tipo_de_persona" text;--> statement-breakpoint
UPDATE "libro_de_compras"."datos_fiscales_de_empresa" SET "tipo_de_persona" = 'juridica';--> statement-breakpoint
ALTER TABLE "libro_de_compras"."datos_fiscales_de_empresa" ALTER COLUMN "tipo_de_persona" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."datos_fiscales_de_empresa" ALTER COLUMN "regimen_isr" DROP NOT NULL;--> statement-breakpoint
UPDATE "libro_de_compras"."datos_fiscales_de_empresa" SET "regimen_isr" = NULL WHERE "regimen_iva" NOT IN ('general', 'no_afiliado');--> statement-breakpoint
ALTER TABLE "libro_de_compras"."datos_fiscales_de_empresa" ADD CONSTRAINT "datos_fiscales_de_empresa_vigencia_unica" UNIQUE NULLS NOT DISTINCT("empresa_id","vigente_desde");--> statement-breakpoint
ALTER TABLE "libro_de_compras"."datos_fiscales_de_empresa" ADD CONSTRAINT "datos_fiscales_de_empresa_regimen_isr_segun_iva" CHECK (("libro_de_compras"."datos_fiscales_de_empresa"."regimen_iva" in ('general', 'no_afiliado')) = ("libro_de_compras"."datos_fiscales_de_empresa"."regimen_isr" is not null));--> statement-breakpoint
ALTER TABLE "libro_de_compras"."datos_fiscales_de_empresa" ADD CONSTRAINT "datos_fiscales_de_empresa_agente_de_iva_solo_general" CHECK ("libro_de_compras"."datos_fiscales_de_empresa"."regimen_iva" = 'general' or "libro_de_compras"."datos_fiscales_de_empresa"."agente_de_retencion_iva" = 'ninguno');--> statement-breakpoint
ALTER TABLE "libro_de_compras"."datos_fiscales_de_empresa" ADD CONSTRAINT "datos_fiscales_de_empresa_tipo_de_persona" CHECK ("libro_de_compras"."datos_fiscales_de_empresa"."tipo_de_persona" in ('individual', 'juridica'));--> statement-breakpoint
ALTER TABLE "libro_de_compras"."datos_fiscales_de_empresa" ADD CONSTRAINT "datos_fiscales_de_empresa_agropecuario_individual" CHECK ("libro_de_compras"."datos_fiscales_de_empresa"."regimen_iva" <> 'contribuyente_agropecuario' or "libro_de_compras"."datos_fiscales_de_empresa"."tipo_de_persona" = 'individual');--> statement-breakpoint
ALTER TABLE "libro_de_compras"."datos_fiscales_de_empresa" ADD CONSTRAINT "datos_fiscales_de_empresa_exento_solo_juridica" CHECK ("libro_de_compras"."datos_fiscales_de_empresa"."regimen_isr" is distinct from 'exento' or "libro_de_compras"."datos_fiscales_de_empresa"."tipo_de_persona" = 'juridica');--> statement-breakpoint
ALTER TABLE "libro_de_compras"."datos_fiscales_de_empresa" ADD CONSTRAINT "datos_fiscales_de_empresa_vigente_desde_primer_dia" CHECK ("libro_de_compras"."datos_fiscales_de_empresa"."vigente_desde" is null or extract(day from "libro_de_compras"."datos_fiscales_de_empresa"."vigente_desde") = 1);--> statement-breakpoint
ALTER TABLE "libro_de_compras"."datos_fiscales_de_empresa" ADD CONSTRAINT "datos_fiscales_de_empresa_regimen_iva" CHECK ("libro_de_compras"."datos_fiscales_de_empresa"."regimen_iva" in ('general', 'pequeno_contribuyente', 'pequeno_contribuyente_electronico', 'contribuyente_agropecuario', 'primario_pecuario', 'no_afiliado'));--> statement-breakpoint
ALTER TABLE "libro_de_compras"."datos_fiscales_de_empresa" ADD CONSTRAINT "datos_fiscales_de_empresa_regimen_isr" CHECK ("libro_de_compras"."datos_fiscales_de_empresa"."regimen_isr" is null or "libro_de_compras"."datos_fiscales_de_empresa"."regimen_isr" in ('utilidades', 'opcional_simplificado', 'exento'));
