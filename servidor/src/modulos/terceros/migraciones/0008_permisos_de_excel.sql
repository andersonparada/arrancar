-- Excel de clientes, proveedores y categorías de proveedor: quien podía crear (el papel y `terceros.crear`, como pide el formulario) recibe importar y quien podía ver recibe
-- exportar. Cubre los roles (`core.rol_permisos`) y los permisos directos (`core.usuario_permisos`).
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT DISTINCT a."rol_id", 'terceros.clientes.importar' FROM "core"."rol_permisos" a
JOIN "core"."rol_permisos" b ON b."rol_id" = a."rol_id" AND b."permiso" = 'terceros.crear'
WHERE a."permiso" = 'clientes.crear'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT DISTINCT a."cuenta_id", a."usuario_id", 'terceros.clientes.importar' FROM "core"."usuario_permisos" a
JOIN "core"."usuario_permisos" b ON b."cuenta_id" = a."cuenta_id" AND b."usuario_id" = a."usuario_id" AND b."permiso" = 'terceros.crear'
WHERE a."permiso" = 'clientes.crear'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT DISTINCT a."rol_id", 'terceros.proveedores.importar' FROM "core"."rol_permisos" a
JOIN "core"."rol_permisos" b ON b."rol_id" = a."rol_id" AND b."permiso" = 'terceros.crear'
WHERE a."permiso" = 'proveedores.crear'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT DISTINCT a."cuenta_id", a."usuario_id", 'terceros.proveedores.importar' FROM "core"."usuario_permisos" a
JOIN "core"."usuario_permisos" b ON b."cuenta_id" = a."cuenta_id" AND b."usuario_id" = a."usuario_id" AND b."permiso" = 'terceros.crear'
WHERE a."permiso" = 'proveedores.crear'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT DISTINCT "rol_id", 'terceros.categorias-de-proveedor.importar' FROM "core"."rol_permisos" WHERE "permiso" = 'proveedores.crear'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT DISTINCT "cuenta_id", "usuario_id", 'terceros.categorias-de-proveedor.importar' FROM "core"."usuario_permisos" WHERE "permiso" = 'proveedores.crear'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT DISTINCT "rol_id", 'terceros.clientes.exportar' FROM "core"."rol_permisos" WHERE "permiso" = 'terceros.ver'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT DISTINCT "cuenta_id", "usuario_id", 'terceros.clientes.exportar' FROM "core"."usuario_permisos" WHERE "permiso" = 'terceros.ver'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT DISTINCT "rol_id", 'terceros.proveedores.exportar' FROM "core"."rol_permisos" WHERE "permiso" = 'terceros.ver'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT DISTINCT "cuenta_id", "usuario_id", 'terceros.proveedores.exportar' FROM "core"."usuario_permisos" WHERE "permiso" = 'terceros.ver'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT DISTINCT "rol_id", 'terceros.categorias-de-proveedor.exportar' FROM "core"."rol_permisos" WHERE "permiso" = 'terceros.ver'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT DISTINCT "cuenta_id", "usuario_id", 'terceros.categorias-de-proveedor.exportar' FROM "core"."usuario_permisos" WHERE "permiso" = 'terceros.ver'
ON CONFLICT DO NOTHING;
