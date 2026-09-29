-- H3: siembra el catálogo de conceptos (los de sistema y la lista sugerida, ver
-- `dominio/conceptos-iniciales.ts`) en cada empresa cuya cuenta ya contrató Bancos, y traduce
-- los permisos de los roles: quien ya administraba el catálogo de bancos administra el de
-- conceptos. Las empresas que contraten Bancos después reciben la semilla al abrir Conceptos.
INSERT INTO "bancos"."conceptos"
  ("empresa_id", "clave_de_sistema", "nombre", "aplica_a", "actividad_de_flujo", "grupo_de_flujo",
   "es_cargo_bancario", "pide_datos_de_intereses", "admite_factura", "activo")
SELECT e."id", s."clave", s."nombre", s."aplica_a", s."actividad", s."grupo", s."cargo", s."intereses", false, true
FROM "core"."empresas" e
JOIN "core"."cuenta_modulos" cm ON cm."cuenta_id" = e."cuenta_id" AND cm."modulo_clave" = 'bancos'
CROSS JOIN (VALUES
    ('transferencia', 'Transferencia entre cuentas', 'ambos', 'ninguna', NULL, false, false),
    ('pago_a_proveedor', 'Pago a proveedores', 'debito', 'operacion', 'Pagos a proveedores', false, false),
    ('saldo_inicial', 'Saldo inicial', 'ambos', 'ninguna', NULL, false, false),
    ('sin_clasificar', 'Sin clasificar', 'ambos', 'ninguna', NULL, false, false),
    ('cheque_caduco', 'Cheque caduco', 'credito', 'ninguna', NULL, false, false),
    (NULL, 'Depósito de ventas', 'credito', 'operacion', 'Cobros a clientes', false, false),
    (NULL, 'Comisiones bancarias', 'debito', 'operacion', 'Comisiones bancarias', true, false),
    (NULL, 'Intereses ganados', 'credito', 'operacion', 'Intereses ganados', true, true),
    (NULL, 'Cheque rechazado', 'debito', 'operacion', 'Cheques rechazados', true, false),
    (NULL, 'Planilla', 'debito', 'operacion', 'Pagos de planilla', false, false),
    (NULL, 'Préstamo recibido', 'credito', 'financiamiento', 'Préstamos recibidos', false, false),
    (NULL, 'Pago de préstamo', 'debito', 'financiamiento', 'Pagos de préstamos', false, false),
    (NULL, 'Compra de activo', 'debito', 'inversion', 'Compra de activos', false, false),
    (NULL, 'Aporte de socios', 'credito', 'financiamiento', 'Aportes de socios', false, false),
    (NULL, 'Retiro de socios', 'debito', 'financiamiento', 'Retiros de socios', false, false),
    (NULL, 'Impuestos', 'debito', 'operacion', 'Pago de impuestos', false, false)
) AS s("clave", "nombre", "aplica_a", "actividad", "grupo", "cargo", "intereses")
WHERE NOT EXISTS (SELECT 1 FROM "bancos"."conceptos" c WHERE c."empresa_id" = e."id")
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.conceptos.ver' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.bancos.ver'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.conceptos.gestionar' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.bancos.gestionar'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.conceptos.importar' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.bancos.importar'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.conceptos.exportar' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.bancos.exportar'
ON CONFLICT DO NOTHING;
