-- Permisos por acción (docs/PLAN.md §3.5): `<recurso>.gestionar` se reemplaza por `crear`, `editar` y, si
-- gestionar también eliminaba, `eliminar`. Cada rol que lo tenía recibe los nuevos y pierde el viejo.
-- Va en cada módulo (y no solo en core) porque el core se migra primero: así corre después de las
-- migraciones anteriores del mismo módulo que todavía asignen `gestionar`. Aquí: usuarios y roles.
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT DISTINCT rp."rol_id", m."nuevo"
FROM "core"."rol_permisos" rp
JOIN (VALUES
  ('usuarios.gestionar', 'usuarios.crear'),
  ('usuarios.gestionar', 'usuarios.editar'),
  ('roles.gestionar', 'roles.crear'),
  ('roles.gestionar', 'roles.editar'),
  ('roles.gestionar', 'roles.eliminar')
) AS m("viejo", "nuevo") ON m."viejo" = rp."permiso"
ON CONFLICT DO NOTHING;
--> statement-breakpoint
DELETE FROM "core"."rol_permisos" WHERE "permiso" IN ('usuarios.gestionar', 'roles.gestionar');
