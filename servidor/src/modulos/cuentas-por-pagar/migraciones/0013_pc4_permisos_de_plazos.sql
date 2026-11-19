-- PC-4: el Excel «Plazos de proveedores» tiene sus permisos (docs/PLAN.md §3.5). Importar lo reciben, por rol y por
-- usuario, quienes ya podían editar proveedores (el formulario donde se pone el plazo); exportar, quienes podían ver
-- terceros.
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'cuentas-por-pagar.condiciones.importar' FROM "core"."rol_permisos" WHERE "permiso" = 'proveedores.editar'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'cuentas-por-pagar.condiciones.exportar' FROM "core"."rol_permisos" WHERE "permiso" = 'terceros.ver'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT "cuenta_id", "usuario_id", 'cuentas-por-pagar.condiciones.importar' FROM "core"."usuario_permisos" WHERE "permiso" = 'proveedores.editar'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT "cuenta_id", "usuario_id", 'cuentas-por-pagar.condiciones.exportar' FROM "core"."usuario_permisos" WHERE "permiso" = 'terceros.ver'
ON CONFLICT DO NOTHING;
