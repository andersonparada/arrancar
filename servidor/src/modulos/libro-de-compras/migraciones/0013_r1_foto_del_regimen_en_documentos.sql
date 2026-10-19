ALTER TABLE "libro_de_compras"."documentos" ADD COLUMN "regimen_iva_de_la_empresa" text;--> statement-breakpoint
UPDATE "libro_de_compras"."documentos" d SET "regimen_iva_de_la_empresa" = coalesce((
  SELECT f."regimen_iva" FROM "libro_de_compras"."datos_fiscales_de_empresa" f
  WHERE f."empresa_id" = d."empresa_id" AND (f."vigente_desde" IS NULL OR f."vigente_desde" <= d."periodo")
  ORDER BY f."vigente_desde" DESC NULLS LAST LIMIT 1
), 'general');--> statement-breakpoint
ALTER TABLE "libro_de_compras"."documentos" ALTER COLUMN "regimen_iva_de_la_empresa" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."documentos" ADD CONSTRAINT "documentos_regimen_de_la_empresa_valido" CHECK ("libro_de_compras"."documentos"."regimen_iva_de_la_empresa" in ('general', 'pequeno_contribuyente', 'pequeno_contribuyente_electronico', 'contribuyente_agropecuario', 'primario_pecuario', 'no_afiliado'));--> statement-breakpoint
ALTER TABLE "libro_de_compras"."documentos" ADD CONSTRAINT "documentos_empresa_sin_credito" CHECK (not "libro_de_compras"."documentos"."muestra_en_reportes_sat" or "libro_de_compras"."documentos"."iva" = 0 or "libro_de_compras"."documentos"."regimen_iva_de_la_empresa" = 'general'
        or coalesce("libro_de_compras"."documentos"."motivo_sin_credito", '') = 'empresa_sin_credito');--> statement-breakpoint
ALTER TABLE "libro_de_compras"."documentos" ADD CONSTRAINT "documentos_empresa_sin_credito_real" CHECK ("libro_de_compras"."documentos"."tipo" = 'nota_de_credito' or coalesce("libro_de_compras"."documentos"."motivo_sin_credito", '') <> 'empresa_sin_credito'
        or "libro_de_compras"."documentos"."regimen_iva_de_la_empresa" <> 'general');--> statement-breakpoint
ALTER TABLE "libro_de_compras"."documentos" ADD CONSTRAINT "documentos_sin_credito_sin_art_20" CHECK ("libro_de_compras"."documentos"."tipo" = 'nota_de_credito' or "libro_de_compras"."documentos"."regimen_iva_de_la_empresa" = 'general'
        or coalesce("libro_de_compras"."documentos"."motivo_sin_credito", '') not in ('fuera_de_plazo', 'no_vinculado'));