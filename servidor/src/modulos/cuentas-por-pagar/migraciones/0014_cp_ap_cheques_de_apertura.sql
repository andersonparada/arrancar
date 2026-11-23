ALTER TABLE "cuentas_por_pagar"."pagos" DROP CONSTRAINT "pagos_forma_valida";--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" ADD COLUMN "cheque_de_apertura_referido_id" uuid;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" ADD CONSTRAINT "pagos_cheque_de_apertura_referido_fk" FOREIGN KEY ("cheque_de_apertura_referido_id") REFERENCES "bancos"."movimientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pagos_cheque_de_apertura_vigente_unico" ON "cuentas_por_pagar"."pagos" USING btree ("movimiento_id") WHERE "cuentas_por_pagar"."pagos"."forma" = 'cheque_de_apertura' and "cuentas_por_pagar"."pagos"."estado" = 'vigente';--> statement-breakpoint
CREATE INDEX "pagos_cheque_referido_idx" ON "cuentas_por_pagar"."pagos" USING btree ("cheque_de_apertura_referido_id") WHERE "cuentas_por_pagar"."pagos"."cheque_de_apertura_referido_id" is not null;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" ADD CONSTRAINT "pagos_referido_solo_en_apertura" CHECK ("cuentas_por_pagar"."pagos"."cheque_de_apertura_referido_id" is null or "cuentas_por_pagar"."pagos"."forma" = 'cuenta_de_apertura');--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" ADD CONSTRAINT "pagos_forma_valida" CHECK ("cuentas_por_pagar"."pagos"."forma" in ('cheque', 'nota_de_debito', 'nota_ligada', 'cuenta_de_apertura', 'efectivo', 'cheque_de_apertura'));
--> statement-breakpoint
-- AP-1: ligar y desligar cheques de apertura; los reciben, por rol y por usuario, quienes ya podían aplicar a la cuenta de apertura.
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'cuentas-por-pagar.pagos.ligar-cheques-de-apertura' FROM "core"."rol_permisos" WHERE "permiso" = 'cuentas-por-pagar.pagos.aplicar-a-apertura'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT "cuenta_id", "usuario_id", 'cuentas-por-pagar.pagos.ligar-cheques-de-apertura' FROM "core"."usuario_permisos" WHERE "permiso" = 'cuentas-por-pagar.pagos.aplicar-a-apertura'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'cuentas-por-pagar.pagos.desligar-cheques-de-apertura' FROM "core"."rol_permisos" WHERE "permiso" = 'cuentas-por-pagar.pagos.aplicar-a-apertura'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT "cuenta_id", "usuario_id", 'cuentas-por-pagar.pagos.desligar-cheques-de-apertura' FROM "core"."usuario_permisos" WHERE "permiso" = 'cuentas-por-pagar.pagos.aplicar-a-apertura'
ON CONFLICT DO NOTHING;
