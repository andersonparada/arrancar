DROP INDEX "bancos"."movimientos_cuenta_bancaria_idx";--> statement-breakpoint
DROP INDEX "bancos"."movimientos_fecha_idx";--> statement-breakpoint
DROP INDEX "bancos"."movimientos_saldo_inicial_idx";--> statement-breakpoint
CREATE INDEX "movimientos_cuenta_fecha_idx" ON "bancos"."movimientos" USING btree ("cuenta_bancaria_id","fecha");--> statement-breakpoint
CREATE UNIQUE INDEX "movimientos_un_saldo_inicial" ON "bancos"."movimientos" USING btree ("cuenta_bancaria_id") WHERE "bancos"."movimientos"."saldo_inicial" and "bancos"."movimientos"."anulado_en" is null;--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ADD CONSTRAINT "movimientos_monto_positivo" CHECK ("bancos"."movimientos"."monto" > 0);--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ADD CONSTRAINT "movimientos_tipo_valido" CHECK ("bancos"."movimientos"."tipo" in ('credito', 'debito'));