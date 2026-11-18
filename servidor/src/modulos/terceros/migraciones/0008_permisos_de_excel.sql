-- Excel de clientes, proveedores y categorías de proveedor: quien podía crear recibe importar y quien podía ver recibe
-- exportar. Cubre los roles (`core.rol_permisos`) y los permisos directos (`core.usuario_permisos`).
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT DISTINCT "rol_id", 'terceros.clientes.importar' FROM "core"."rol_permisos" WHERE "permiso" = 'clientes.crear'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT DISTINCT "cuenta_id", "usuario_id", 'terceros.clientes.importar' FROM "core"."usuario_permisos" WHERE "permiso" = 'clientes.crear'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT DISTINCT "rol_id", 'terceros.proveedores.importar' FROM "core"."rol_permisos" WHERE "permiso" = 'proveedores.crear'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT DISTINCT "cuenta_id", "usuario_id", 'terceros.proveedores.importar' FROM "core"."usuario_permisos" WHERE "permiso" = 'proveedores.crear'
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
