-- P1: la caducidad de un cheque deja de tener concepto propio: el inverso hereda el del cheque y la caducidad
-- queda como causa de anulación del cheque (`cheques.causa_de_anulacion`). Nada asigna ya `cheque_caduco`; se
-- elimina de cada empresa y, si alguna fila lo usara, se conserva inactivo (no se puede borrar lo referenciado).
DELETE FROM "bancos"."conceptos" c
WHERE c."clave_de_sistema" = 'cheque_caduco'
  AND NOT EXISTS (SELECT 1 FROM "bancos"."movimientos" m WHERE m."concepto_id" = c."id");--> statement-breakpoint
UPDATE "bancos"."conceptos" SET "activo" = false WHERE "clave_de_sistema" = 'cheque_caduco';--> statement-breakpoint
-- P8: «Cheque rechazado» pasa al grupo «Cobros a clientes», solo donde nadie lo había editado.
UPDATE "bancos"."conceptos"
SET "grupo_de_flujo" = 'Cobros a clientes'
WHERE "clave_de_sistema" IS NULL AND "nombre" = 'Cheque rechazado' AND "grupo_de_flujo" = 'Cheques rechazados';--> statement-breakpoint
-- P8 y P5: los sugeridos nuevos (mismos que `dominio/conceptos-iniciales.ts`; si cambia uno, cambiar el otro),
-- solo en las empresas que ya tienen catálogo (las demás lo reciben completo al abrir Conceptos) y sin tocar
-- lo que el usuario ya tenga con ese nombre.
INSERT INTO "bancos"."conceptos"
  ("empresa_id", "clave_de_sistema", "nombre", "aplica_a", "actividad_de_flujo", "grupo_de_flujo",
   "es_cargo_bancario", "pide_datos_de_intereses", "admite_factura", "activo")
SELECT e."id", NULL, s."nombre", s."aplica_a", s."actividad", s."grupo", false, false, false, true
FROM "core"."empresas" e
CROSS JOIN (VALUES
    ('Anticipo a proveedores', 'debito', 'operacion', 'Anticipos a proveedores'),
    ('Fondo de caja chica', 'debito', 'ninguna', NULL),
    ('Reintegro de caja chica', 'debito', 'operacion', 'Reintegros de caja chica'),
    ('IGSS, IRTRA e INTECAP', 'debito', 'operacion', 'Cuotas de IGSS, IRTRA e INTECAP'),
    ('Dividendos pagados', 'debito', 'financiamiento', 'Dividendos pagados'),
    ('Venta de activo', 'credito', 'inversion', 'Venta de activos'),
    ('Préstamo a empresa relacionada', 'debito', 'inversion', 'Préstamos a empresas relacionadas'),
    ('Préstamo de empresa relacionada', 'credito', 'financiamiento', 'Préstamos de empresas relacionadas')
) AS s("nombre", "aplica_a", "actividad", "grupo")
WHERE EXISTS (SELECT 1 FROM "bancos"."conceptos" c WHERE c."empresa_id" = e."id")
ON CONFLICT DO NOTHING;
