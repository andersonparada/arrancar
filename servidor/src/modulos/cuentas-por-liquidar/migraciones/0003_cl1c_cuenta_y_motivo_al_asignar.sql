ALTER TABLE "cuentas_por_liquidar"."gastos" DROP CONSTRAINT "gastos_retencion_con_motivo";--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."gastos" DROP CONSTRAINT "gastos_proveedor_fk";
--> statement-breakpoint
DROP INDEX "cuentas_por_liquidar"."gastos_proveedor_idx";--> statement-breakpoint
-- Escrita a mano sobre lo generado: la columna se rellena con la cuenta de la empresa antes de pedirla no nula.
ALTER TABLE "cuentas_por_liquidar"."gastos" ADD COLUMN "cuenta_id" uuid;--> statement-breakpoint
UPDATE "cuentas_por_liquidar"."gastos" t SET "cuenta_id" = e."cuenta_id" FROM "core"."empresas" e WHERE e."id" = t."empresa_id";--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."gastos" ALTER COLUMN "cuenta_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."gastos" ALTER COLUMN "cuenta_id" SET DEFAULT nullif(current_setting('app.cuenta_id', true), '')::uuid;--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."gastos" ADD CONSTRAINT "gastos_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."gastos" ADD CONSTRAINT "gastos_proveedor_fk" FOREIGN KEY ("proveedor_id","cuenta_id") REFERENCES "terceros"."proveedores"("id","cuenta_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gastos_cuenta_idx" ON "cuentas_por_liquidar"."gastos" USING btree ("cuenta_id");--> statement-breakpoint
CREATE INDEX "gastos_proveedor_idx" ON "cuentas_por_liquidar"."gastos" USING btree ("proveedor_id","cuenta_id") WHERE "cuentas_por_liquidar"."gastos"."proveedor_id" is not null;--> statement-breakpoint
ALTER TABLE "cuentas_por_liquidar"."gastos" ADD CONSTRAINT "gastos_retencion_con_motivo" CHECK (("cuentas_por_liquidar"."gastos"."con_retencion" and "cuentas_por_liquidar"."gastos"."anticipo_id" is not null) = ("cuentas_por_liquidar"."gastos"."motivo_con_retencion" is not null));