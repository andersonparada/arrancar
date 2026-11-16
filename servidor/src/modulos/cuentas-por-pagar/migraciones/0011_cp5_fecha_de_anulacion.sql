ALTER TABLE "cuentas_por_pagar"."pagos" ADD COLUMN "fecha_de_anulacion" date;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."reintegros" ADD COLUMN "fecha_de_anulacion" date;--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."retiros_de_efectivo" ADD COLUMN "fecha_de_anulacion" date;--> statement-breakpoint
-- Relleno: fecha contable de lo ya anulado (anulado en Bancos sin inverso: la del registro; con inverso: la del inverso;
-- sin movimiento en Bancos: el día de la anulación en Guatemala, nunca antes de la fecha del registro).
UPDATE "cuentas_por_pagar"."pagos" r SET "fecha_de_anulacion" = greatest(r."fecha", coalesce(
	(SELECT CASE
		WHEN m."revertido_en" IS NOT NULL THEN (SELECT i."fecha" FROM "bancos"."movimientos" i WHERE i."revierte_a_id" = m."id" LIMIT 1)
		WHEN m."anulado_en" IS NOT NULL THEN r."fecha"
	END FROM "bancos"."movimientos" m WHERE m."id" = r."movimiento_id" AND r."forma" IN ('cheque', 'nota_de_debito')),
	(r."anulado_en" AT TIME ZONE 'America/Guatemala')::date
)) WHERE r."estado" = 'anulado' AND r."fecha_de_anulacion" IS NULL;--> statement-breakpoint
-- Relleno: fecha contable de lo ya anulado (anulado en Bancos sin inverso: la del registro; con inverso: la del inverso;
-- sin movimiento en Bancos: el día de la anulación en Guatemala, nunca antes de la fecha del registro).
UPDATE "cuentas_por_pagar"."reintegros" r SET "fecha_de_anulacion" = greatest(r."fecha", coalesce(
	(SELECT CASE
		WHEN m."revertido_en" IS NOT NULL THEN (SELECT i."fecha" FROM "bancos"."movimientos" i WHERE i."revierte_a_id" = m."id" LIMIT 1)
		WHEN m."anulado_en" IS NOT NULL THEN r."fecha"
	END FROM "bancos"."movimientos" m WHERE m."id" = r."movimiento_id" AND r."forma" = 'deposito'),
	(r."anulado_en" AT TIME ZONE 'America/Guatemala')::date
)) WHERE r."estado" = 'anulado' AND r."fecha_de_anulacion" IS NULL;--> statement-breakpoint
-- Relleno: fecha contable de lo ya anulado (anulado en Bancos sin inverso: la del registro; con inverso: la del inverso;
-- sin movimiento en Bancos: el día de la anulación en Guatemala, nunca antes de la fecha del registro).
UPDATE "cuentas_por_pagar"."retiros_de_efectivo" r SET "fecha_de_anulacion" = greatest(r."fecha", coalesce(
	(SELECT CASE
		WHEN m."revertido_en" IS NOT NULL THEN (SELECT i."fecha" FROM "bancos"."movimientos" i WHERE i."revierte_a_id" = m."id" LIMIT 1)
		WHEN m."anulado_en" IS NOT NULL THEN r."fecha"
	END FROM "bancos"."movimientos" m WHERE m."id" = r."movimiento_id" AND true),
	(r."anulado_en" AT TIME ZONE 'America/Guatemala')::date
)) WHERE r."estado" = 'anulado' AND r."fecha_de_anulacion" IS NULL;--> statement-breakpoint
CREATE INDEX "pagos_anulados_corte_idx" ON "cuentas_por_pagar"."pagos" USING btree ("empresa_id","fecha_de_anulacion") WHERE "cuentas_por_pagar"."pagos"."estado" = 'anulado';--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" ADD CONSTRAINT "pagos_fecha_de_anulacion_de_su_estado" CHECK (("cuentas_por_pagar"."pagos"."estado" = 'anulado') = ("cuentas_por_pagar"."pagos"."fecha_de_anulacion" is not null));--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."pagos" ADD CONSTRAINT "pagos_fecha_de_anulacion_valida" CHECK ("cuentas_por_pagar"."pagos"."fecha_de_anulacion" is null or "cuentas_por_pagar"."pagos"."fecha_de_anulacion" >= "cuentas_por_pagar"."pagos"."fecha");--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."reintegros" ADD CONSTRAINT "reintegros_fecha_de_anulacion_de_su_estado" CHECK (("cuentas_por_pagar"."reintegros"."estado" = 'anulado') = ("cuentas_por_pagar"."reintegros"."fecha_de_anulacion" is not null));--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."reintegros" ADD CONSTRAINT "reintegros_fecha_de_anulacion_valida" CHECK ("cuentas_por_pagar"."reintegros"."fecha_de_anulacion" is null or "cuentas_por_pagar"."reintegros"."fecha_de_anulacion" >= "cuentas_por_pagar"."reintegros"."fecha");--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."retiros_de_efectivo" ADD CONSTRAINT "retiros_fecha_de_anulacion_de_su_estado" CHECK (("cuentas_por_pagar"."retiros_de_efectivo"."estado" = 'anulado') = ("cuentas_por_pagar"."retiros_de_efectivo"."fecha_de_anulacion" is not null));--> statement-breakpoint
ALTER TABLE "cuentas_por_pagar"."retiros_de_efectivo" ADD CONSTRAINT "retiros_fecha_de_anulacion_valida" CHECK ("cuentas_por_pagar"."retiros_de_efectivo"."fecha_de_anulacion" is null or "cuentas_por_pagar"."retiros_de_efectivo"."fecha_de_anulacion" >= "cuentas_por_pagar"."retiros_de_efectivo"."fecha");