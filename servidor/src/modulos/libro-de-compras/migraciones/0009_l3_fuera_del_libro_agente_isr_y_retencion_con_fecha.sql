ALTER TABLE "libro_de_compras"."retenciones" DROP CONSTRAINT "retenciones_fecha_obligatoria";--> statement-breakpoint
DROP INDEX "libro_de_compras"."retenciones_por_fechar_idx";--> statement-breakpoint
ALTER TABLE "libro_de_compras"."datos_fiscales_de_empresa" ALTER COLUMN "es_agente_de_retencion_isr" SET DEFAULT true;--> statement-breakpoint
-- La retención del 5 % a pequeño contribuyente se fecha con la recepción del documento (Ley del IVA art. 48).
UPDATE "libro_de_compras"."retenciones" r SET "fecha" = d."fecha_recepcion" FROM "libro_de_compras"."documentos" d WHERE r."documento_id" = d."id" AND r."fecha" IS NULL;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."retenciones" ALTER COLUMN "fecha" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "libro_de_compras"."documentos" ADD COLUMN "motivo_fuera_del_libro" text;--> statement-breakpoint
-- Los documentos ya desmarcados se clasifican por su autorización FEL.
UPDATE "libro_de_compras"."documentos" SET "motivo_fuera_del_libro" = CASE WHEN "autorizacion_fel" IS NULL THEN 'sin_fel' ELSE 'fel_a_otro_nit' END WHERE NOT "muestra_en_reportes_sat";--> statement-breakpoint
ALTER TABLE "libro_de_compras"."documentos" ADD CONSTRAINT "documentos_motivo_fuera_del_libro_valido" CHECK ("libro_de_compras"."documentos"."motivo_fuera_del_libro" is null or "libro_de_compras"."documentos"."motivo_fuera_del_libro" in ('sin_fel', 'fel_a_consumidor_final', 'fel_a_otro_nit'));--> statement-breakpoint
ALTER TABLE "libro_de_compras"."documentos" ADD CONSTRAINT "documentos_muestra_segun_motivo" CHECK ("libro_de_compras"."documentos"."muestra_en_reportes_sat" = ("libro_de_compras"."documentos"."motivo_fuera_del_libro" is null));--> statement-breakpoint
ALTER TABLE "libro_de_compras"."documentos" ADD CONSTRAINT "documentos_sin_fel_sin_autorizacion" CHECK ("libro_de_compras"."documentos"."motivo_fuera_del_libro" is distinct from 'sin_fel' or "libro_de_compras"."documentos"."autorizacion_fel" is null);--> statement-breakpoint
ALTER TABLE "libro_de_compras"."documentos" ADD CONSTRAINT "documentos_fel_con_autorizacion" CHECK ("libro_de_compras"."documentos"."motivo_fuera_del_libro" not in ('fel_a_consumidor_final', 'fel_a_otro_nit') or "libro_de_compras"."documentos"."autorizacion_fel" is not null);