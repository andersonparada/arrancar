ALTER TABLE "bancos"."movimientos" ADD COLUMN "anulado_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ADD COLUMN "motivo_de_anulacion" text;--> statement-breakpoint
CREATE INDEX "movimientos_fecha_idx" ON "bancos"."movimientos" USING btree ("cuenta_bancaria_id","fecha");--> statement-breakpoint
CREATE INDEX "movimientos_saldo_inicial_idx" ON "bancos"."movimientos" USING btree ("cuenta_bancaria_id") WHERE "bancos"."movimientos"."saldo_inicial" and "bancos"."movimientos"."anulado_en" is null;