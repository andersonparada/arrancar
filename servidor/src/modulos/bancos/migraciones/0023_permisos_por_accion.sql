-- Permisos por acción (docs/PLAN.md §3.5): `<recurso>.gestionar` se reemplaza por `crear`, `editar` y, si
-- gestionar también eliminaba, `eliminar`. Cada rol que lo tenía recibe los nuevos y pierde el viejo.
-- Va en cada módulo (y no solo en core) porque el core se migra primero: así corre después de las
-- migraciones anteriores del mismo módulo que todavía asignen `gestionar`. Aquí: bancos.
-- `notas.eliminar` y `transferencias.eliminar` ya eran permisos propios: no se reparten.
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT DISTINCT rp."rol_id", m."nuevo"
FROM "core"."rol_permisos" rp
JOIN (VALUES
  ('bancos.bancos.gestionar', 'bancos.bancos.crear'),
  ('bancos.bancos.gestionar', 'bancos.bancos.editar'),
  ('bancos.cuentas-bancarias.gestionar', 'bancos.cuentas-bancarias.crear'),
  ('bancos.cuentas-bancarias.gestionar', 'bancos.cuentas-bancarias.editar'),
  ('bancos.notas.gestionar', 'bancos.notas.crear'),
  ('bancos.notas.gestionar', 'bancos.notas.editar'),
  ('bancos.transferencias.gestionar', 'bancos.transferencias.crear'),
  ('bancos.saldos-iniciales.gestionar', 'bancos.saldos-iniciales.crear'),
  ('bancos.saldos-iniciales.gestionar', 'bancos.saldos-iniciales.editar'),
  ('bancos.saldos-iniciales.gestionar', 'bancos.saldos-iniciales.eliminar'),
  ('bancos.chequeras.gestionar', 'bancos.chequeras.crear'),
  ('bancos.chequeras.gestionar', 'bancos.chequeras.editar'),
  ('bancos.conceptos.gestionar', 'bancos.conceptos.crear'),
  ('bancos.conceptos.gestionar', 'bancos.conceptos.editar'),
  ('bancos.conceptos.gestionar', 'bancos.conceptos.eliminar')
) AS m("viejo", "nuevo") ON m."viejo" = rp."permiso"
ON CONFLICT DO NOTHING;
--> statement-breakpoint
DELETE FROM "core"."rol_permisos" WHERE "permiso" IN ('bancos.bancos.gestionar', 'bancos.cuentas-bancarias.gestionar', 'bancos.notas.gestionar', 'bancos.transferencias.gestionar', 'bancos.saldos-iniciales.gestionar', 'bancos.chequeras.gestionar', 'bancos.conceptos.gestionar');
