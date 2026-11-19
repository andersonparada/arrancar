ALTER TABLE "caja_chica"."comprobantes" DROP CONSTRAINT "comprobantes_motivo_sin_bancarizar_solo_marcado";--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" DROP CONSTRAINT "comprobantes_motivo_sin_bancarizar_rango";--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" DROP CONSTRAINT "comprobantes_documento_de_compra_id_documentos_id_fk";
--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" DROP CONSTRAINT "comprobantes_proveedor_id_proveedores_id_fk";
--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" ADD COLUMN "destino_del_documento" text DEFAULT 'caja-chica' NOT NULL;--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" ADD COLUMN "con_retencion" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" ADD COLUMN "monto_retenido" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" ADD COLUMN "motivo_con_retencion" text;--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" ADD CONSTRAINT "comprobantes_documento_fk" FOREIGN KEY ("documento_de_compra_id","empresa_id","proveedor_id","destino_del_documento") REFERENCES "libro_de_compras"."documentos"("id","empresa_id","proveedor_id","destino") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" ADD CONSTRAINT "comprobantes_proveedor_fk" FOREIGN KEY ("proveedor_id") REFERENCES "terceros"."proveedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comprobantes_concepto_de_gasto_idx" ON "caja_chica"."comprobantes" USING btree ("concepto_de_gasto_id") WHERE "caja_chica"."comprobantes"."concepto_de_gasto_id" is not null;--> statement-breakpoint
CREATE INDEX "comprobantes_proveedor_idx" ON "caja_chica"."comprobantes" USING btree ("proveedor_id") WHERE "caja_chica"."comprobantes"."proveedor_id" is not null;--> statement-breakpoint
CREATE INDEX "comprobantes_documento_afectado_idx" ON "caja_chica"."comprobantes" USING btree ("documento_afectado_id") WHERE "caja_chica"."comprobantes"."documento_afectado_id" is not null;--> statement-breakpoint
CREATE INDEX "reposicion_comprobantes_comprobante_idx" ON "caja_chica"."reposicion_comprobantes" USING btree ("comprobante_id");--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" DROP COLUMN "motivo_sin_bancarizar";--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" ADD CONSTRAINT "comprobantes_retenido_no_negativo" CHECK ("caja_chica"."comprobantes"."monto_retenido" >= 0);--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" ADD CONSTRAINT "comprobantes_retencion_con_monto" CHECK ("caja_chica"."comprobantes"."con_retencion" = ("caja_chica"."comprobantes"."monto_retenido" > 0));--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" ADD CONSTRAINT "comprobantes_retencion_con_motivo" CHECK ("caja_chica"."comprobantes"."con_retencion" = ("caja_chica"."comprobantes"."motivo_con_retencion" is not null));--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" ADD CONSTRAINT "comprobantes_motivo_con_retencion_rango" CHECK (("caja_chica"."comprobantes"."motivo_con_retencion" is null or (char_length("caja_chica"."comprobantes"."motivo_con_retencion") between 1 and 300 and "caja_chica"."comprobantes"."motivo_con_retencion" = btrim("caja_chica"."comprobantes"."motivo_con_retencion"))));--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" ADD CONSTRAINT "comprobantes_retencion_solo_en_documentos" CHECK (not "caja_chica"."comprobantes"."con_retencion" or "caja_chica"."comprobantes"."clase" = 'documento');--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" ADD CONSTRAINT "comprobantes_destino_del_documento_fijo" CHECK ("caja_chica"."comprobantes"."destino_del_documento" = 'caja-chica');--> statement-breakpoint
ALTER TABLE "caja_chica"."vales_provisionales" ADD CONSTRAINT "vales_liquidacion_posterior" CHECK ("caja_chica"."vales_provisionales"."fecha_de_liquidacion" is null or "caja_chica"."vales_provisionales"."fecha_de_liquidacion" >= "caja_chica"."vales_provisionales"."fecha");