-- H9: numera los datos existentes por empresa y tipo, en orden (fecha, creado_en), y deja
-- core.correlativos.siguiente en el último número + 1. Los datos anteriores no reinician por año (anio 0).
-- Llevan número las notas de crédito y de débito sueltas y los inversos de notas sueltas o de cheques. No lo
-- llevan los cheques, el saldo inicial, las dos notas de una transferencia ni los inversos de esas dos notas
-- (el número va en la transferencia).
WITH numeradas AS (
  SELECT m."id",
         row_number() OVER (PARTITION BY m."empresa_id", m."tipo" ORDER BY m."fecha", m."creado_en", m."id") AS n
  FROM "bancos"."movimientos" m
  WHERE m."tipo" IN ('credito', 'debito')
    AND NOT m."saldo_inicial"
    AND m."transferencia_id" IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM "bancos"."movimientos" original
      WHERE original."id" = m."revierte_a_id" AND original."transferencia_id" IS NOT NULL
    )
)
UPDATE "bancos"."movimientos" m
SET "numero" = numeradas.n
FROM numeradas
WHERE m."id" = numeradas."id";--> statement-breakpoint
WITH numeradas AS (
  SELECT t."id",
         row_number() OVER (PARTITION BY t."empresa_id" ORDER BY t."fecha", t."creado_en", t."id") AS n
  FROM "bancos"."transferencias" t
)
UPDATE "bancos"."transferencias" t
SET "numero" = numeradas.n
FROM numeradas
WHERE t."id" = numeradas."id";--> statement-breakpoint
INSERT INTO "core"."correlativos" ("empresa_id", "clave", "anio", "siguiente")
SELECT m."empresa_id",
       CASE m."tipo" WHEN 'credito' THEN 'bancos.notas_de_credito' ELSE 'bancos.notas_de_debito' END,
       0,
       max(m."numero") + 1
FROM "bancos"."movimientos" m
WHERE m."numero" IS NOT NULL
GROUP BY m."empresa_id", m."tipo"
ON CONFLICT ("empresa_id", "clave", "anio") DO UPDATE
SET "siguiente" = greatest("correlativos"."siguiente", EXCLUDED."siguiente");--> statement-breakpoint
INSERT INTO "core"."correlativos" ("empresa_id", "clave", "anio", "siguiente")
SELECT t."empresa_id", 'bancos.transferencias', 0, max(t."numero") + 1
FROM "bancos"."transferencias" t
WHERE t."numero" IS NOT NULL
GROUP BY t."empresa_id"
ON CONFLICT ("empresa_id", "clave", "anio") DO UPDATE
SET "siguiente" = greatest("correlativos"."siguiente", EXCLUDED."siguiente");
