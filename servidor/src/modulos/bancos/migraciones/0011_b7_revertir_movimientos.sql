ALTER TABLE "bancos"."movimientos" ADD COLUMN "revertido_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ADD COLUMN "motivo_de_reversion" text;--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ADD COLUMN "revierte_a_id" uuid;--> statement-breakpoint
ALTER TABLE "bancos"."movimientos" ADD CONSTRAINT "movimientos_revierte_a_id_movimientos_id_fk" FOREIGN KEY ("revierte_a_id") REFERENCES "bancos"."movimientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "movimientos_revierte_a_idx" ON "bancos"."movimientos" USING btree ("revierte_a_id");--> statement-breakpoint
-- Datos existentes: cada movimiento anulado a la antigua pasa a ser un par original + inverso, para que
-- el saldo siga igual (antes el anulado no contaba; ahora cuentan los dos y se cancelan). El inverso lleva
-- la fecha de la anulación, sin ser anterior a la del original. Quedan como estaban (solo anulados, fuera
-- del saldo) los cheques cuyo mes sigue abierto y los saldos iniciales anulados.
CREATE TEMP TABLE "movimientos_por_revertir" ON COMMIT DROP AS
SELECT m."id" FROM "bancos"."movimientos" m
WHERE m."anulado_en" IS NOT NULL
  AND NOT m."saldo_inicial"
  AND NOT (
    m."tipo" = 'cheque'
    AND NOT EXISTS (
      SELECT 1 FROM "bancos"."conciliaciones" c
      WHERE c."cuenta_bancaria_id" = m."cuenta_bancaria_id"
        AND c."estado" = 'autorizada'
        AND (make_date(c."anio", c."mes", 1) + interval '1 month' - interval '1 day')::date >= m."fecha"
    )
  );--> statement-breakpoint
INSERT INTO "bancos"."movimientos"
  ("empresa_id", "cuenta_bancaria_id", "tipo", "fecha", "monto", "saldo_inicial", "referencia", "beneficiario",
   "observaciones", "revierte_a_id", "creado_por", "actualizado_por")
SELECT m."empresa_id", m."cuenta_bancaria_id",
  CASE WHEN m."tipo" = 'credito' THEN 'debito' ELSE 'credito' END,
  GREATEST(m."fecha", (m."anulado_en" AT TIME ZONE 'UTC')::date),
  m."monto", false,
  CASE WHEN nullif(btrim(m."referencia"), '') IS NOT NULL THEN 'Reversión de ' || btrim(m."referencia")
       ELSE 'Reversión de movimiento del ' || m."fecha" END,
  m."beneficiario", m."observaciones", m."id", m."actualizado_por", m."actualizado_por"
FROM "bancos"."movimientos" m
WHERE m."id" IN (SELECT "id" FROM "movimientos_por_revertir");--> statement-breakpoint
UPDATE "bancos"."movimientos"
SET "revertido_en" = "anulado_en", "motivo_de_reversion" = "motivo_de_anulacion",
    "anulado_en" = NULL, "motivo_de_anulacion" = NULL
WHERE "id" IN (SELECT "id" FROM "movimientos_por_revertir");
