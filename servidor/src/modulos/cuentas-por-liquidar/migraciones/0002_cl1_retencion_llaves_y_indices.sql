ALTER TABLE "cuentas_por_liquidar"."gastos" DROP CONSTRAINT "gastos_documento_de_compra_id_documentos_id_fk";
--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."gastos" DROP CONSTRAINT "gastos_proveedor_id_proveedores_id_fk";
--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."gastos" ADD COLUMN "destino_del_documento" text DEFAULT 'cuentas-por-liquidar' NOT NULL;--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."gastos" ADD COLUMN "con_retencion" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."gastos" ADD COLUMN "monto_retenido" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."gastos" ADD COLUMN "motivo_con_retencion" text;--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."gastos" ADD CONSTRAINT "gastos_documento_fk" FOREIGN KEY ("documento_de_compra_id","empresa_id","proveedor_id","destino_del_documento") REFERENCES "libro_de_compras"."documentos"("id","empresa_id","proveedor_id","destino") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."gastos" ADD CONSTRAINT "gastos_proveedor_fk" FOREIGN KEY ("proveedor_id") REFERENCES "terceros"."proveedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gastos_concepto_de_gasto_idx" ON "cuentas_por_liquidar"."gastos" USING btree ("concepto_de_gasto_id") WHERE "cuentas_por_liquidar"."gastos"."concepto_de_gasto_id" is not null;--> statement-breakpoint
CREATE INDEX "gastos_proveedor_idx" ON "cuentas_por_liquidar"."gastos" USING btree ("proveedor_id") WHERE "cuentas_por_liquidar"."gastos"."proveedor_id" is not null;--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."anticipos" ADD CONSTRAINT "anticipos_liquidacion_posterior" CHECK ("cuentas_por_liquidar"."anticipos"."fecha_de_liquidacion" is null or "cuentas_por_liquidar"."anticipos"."fecha_de_liquidacion" >= "cuentas_por_liquidar"."anticipos"."fecha");--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."gastos" ADD CONSTRAINT "gastos_retenido_no_negativo" CHECK ("cuentas_por_liquidar"."gastos"."monto_retenido" >= 0);--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."gastos" ADD CONSTRAINT "gastos_retencion_con_monto" CHECK ("cuentas_por_liquidar"."gastos"."con_retencion" = ("cuentas_por_liquidar"."gastos"."monto_retenido" > 0));--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."gastos" ADD CONSTRAINT "gastos_retencion_con_motivo" CHECK ("cuentas_por_liquidar"."gastos"."con_retencion" = ("cuentas_por_liquidar"."gastos"."motivo_con_retencion" is not null));--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."gastos" ADD CONSTRAINT "gastos_motivo_con_retencion_rango" CHECK (("cuentas_por_liquidar"."gastos"."motivo_con_retencion" is null or (char_length("cuentas_por_liquidar"."gastos"."motivo_con_retencion") between 1 and 300 and "cuentas_por_liquidar"."gastos"."motivo_con_retencion" = btrim("cuentas_por_liquidar"."gastos"."motivo_con_retencion"))));--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."gastos" ADD CONSTRAINT "gastos_retencion_solo_en_documentos" CHECK (not "cuentas_por_liquidar"."gastos"."con_retencion" or "cuentas_por_liquidar"."gastos"."clase" = 'documento');--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."gastos" ADD CONSTRAINT "gastos_destino_del_documento_fijo" CHECK ("cuentas_por_liquidar"."gastos"."destino_del_documento" = 'cuentas-por-liquidar');