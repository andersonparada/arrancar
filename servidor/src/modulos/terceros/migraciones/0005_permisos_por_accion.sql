-- Permisos por acción (docs/PLAN.md §3.5): `<recurso>.gestionar` se reemplaza por `crear`, `editar` y, si
-- gestionar también eliminaba, `eliminar`. Cada rol que lo tenía recibe los nuevos y pierde el viejo.
-- Va en cada módulo (y no solo en core) porque el core se migra primero: así corre después de las
-- migraciones anteriores del mismo módulo que todavía asignen `gestionar`. Aquí: terceros.
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT DISTINCT rp."rol_id", m."nuevo"
FROM "core"."rol_permisos" rp
JOIN (VALUES
  ('terceros.gestionar', 'terceros.crear'),
  ('terceros.gestionar', 'terceros.editar'),
  ('terceros.gestionar', 'terceros.eliminar'),
  ('clientes.gestionar', 'clientes.crear'),
  ('clientes.gestionar', 'clientes.editar'),
  ('clientes.gestionar', 'clientes.eliminar'),
  ('proveedores.gestionar', 'proveedores.crear'),
  ('proveedores.gestionar', 'proveedores.editar'),
  ('proveedores.gestionar', 'proveedores.eliminar')
) AS m("viejo", "nuevo") ON m."viejo" = rp."permiso"
ON CONFLICT DO NOTHING;
--> statement-breakpoint
DELETE FROM "core"."rol_permisos" WHERE "permiso" IN ('terceros.gestionar', 'clientes.gestionar', 'proveedores.gestionar');
