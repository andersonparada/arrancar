-- Excel de Empresas: quien podía crear empresas recibe `empresas.importar` y quien podía editarlas, `empresas.exportar`.
-- Cubre los roles y los permisos directos (que son de la cuenta).
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT DISTINCT rp."rol_id", m."nuevo"
FROM "core"."rol_permisos" rp
JOIN (VALUES
  ('empresas.crear', 'empresas.importar'),
  ('empresas.editar', 'empresas.exportar')
) AS m("viejo", "nuevo") ON m."viejo" = rp."permiso"
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT DISTINCT up."cuenta_id", up."usuario_id", m."nuevo"
FROM "core"."usuario_permisos" up
JOIN (VALUES
  ('empresas.crear', 'empresas.importar'),
  ('empresas.editar', 'empresas.exportar')
) AS m("viejo", "nuevo") ON m."viejo" = up."permiso"
ON CONFLICT DO NOTHING;
