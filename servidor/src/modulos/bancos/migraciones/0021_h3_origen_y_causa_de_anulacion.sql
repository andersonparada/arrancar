ALTER TABLE "bancos"."cheques" ADD COLUMN "causa_de_anulacion" text;--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ADD COLUMN "modulo_de_origen" text;--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ADD COLUMN "documento_de_origen_id" uuid;--> statement-breakpoint
ALTER TABLE "bancos"."cheques" ADD CONSTRAINT "cheques_causa_de_anulacion_valida" CHECK ("bancos"."cheques"."causa_de_anulacion" is null or "bancos"."cheques"."causa_de_anulacion" in ('manual', 'caducidad'));--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ADD CONSTRAINT "movimientos_origen_completo" CHECK (("bancos"."movimientos"."modulo_de_origen" is null) = ("bancos"."movimientos"."documento_de_origen_id" is null));--> statement-breakpoint
-- Los cheques ya anulados lo fueron a mano: la caducidad (H6b) aún no existe.
UPDATE "bancos"."cheques" SET "causa_de_anulacion" = 'manual' WHERE "estado" = 'anulado';
