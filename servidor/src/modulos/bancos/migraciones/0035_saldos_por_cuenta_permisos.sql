-- BS-R1: permisos del reporte «Saldos por cuenta» (docs/PLAN.md §3.5), por rol y por usuario. Quien ya veía el reporte de
-- movimientos recibe el de ver; quien ya lo exportaba, el de exportar. Repetible: no duplica nada.
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.saldos-por-cuenta.ver' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.movimientos.ver'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.saldos-por-cuenta.exportar' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.movimientos.exportar'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT "cuenta_id", "usuario_id", 'bancos.saldos-por-cuenta.ver' FROM "core"."usuario_permisos" WHERE "permiso" = 'bancos.movimientos.ver'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT "cuenta_id", "usuario_id", 'bancos.saldos-por-cuenta.exportar' FROM "core"."usuario_permisos" WHERE "permiso" = 'bancos.movimientos.exportar'
ON CONFLICT DO NOTHING;
