ALTER TABLE "caja_chica"."comprobantes" DROP CONSTRAINT "comprobantes_retencion_con_motivo";--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" DROP CONSTRAINT "comprobantes_proveedor_fk";
--> statement-breakpoint
DROP INDEX "caja_chica"."comprobantes_proveedor_idx";--> statement-breakpoint
-- Escrita a mano sobre lo generado: la columna se rellena con la cuenta de la empresa antes de pedirla no nula.
ALTER TABLE "caja_chica"."comprobantes" ADD COLUMN "cuenta_id" uuid;--> statement-breakpoint
UPDATE "caja_chica"."comprobantes" t SET "cuenta_id" = e."cuenta_id" FROM "core"."empresas" e WHERE e."id" = t."empresa_id";--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" ALTER COLUMN "cuenta_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" ALTER COLUMN "cuenta_id" SET DEFAULT nullif(current_setting('app.cuenta_id', true), '')::uuid;--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" ADD CONSTRAINT "comprobantes_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" ADD CONSTRAINT "comprobantes_proveedor_fk" FOREIGN KEY ("proveedor_id","cuenta_id") REFERENCES "terceros"."proveedores"("id","cuenta_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comprobantes_cuenta_idx" ON "caja_chica"."comprobantes" USING btree ("cuenta_id");--> statement-breakpoint
CREATE INDEX "comprobantes_proveedor_idx" ON "caja_chica"."comprobantes" USING btree ("proveedor_id","cuenta_id") WHERE "caja_chica"."comprobantes"."proveedor_id" is not null;--> statement-breakpoint
ALTER TABLE "caja_chica"."comprobantes" ADD CONSTRAINT "comprobantes_retencion_con_motivo" CHECK (("caja_chica"."comprobantes"."con_retencion" and "caja_chica"."comprobantes"."fondo_id" is not null) = ("caja_chica"."comprobantes"."motivo_con_retencion" is not null));