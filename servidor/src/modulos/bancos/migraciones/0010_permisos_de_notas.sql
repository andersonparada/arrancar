-- Movimientos se separa en Notas, Transferencias (con su propia vista), Reporte de
-- Movimientos y Saldo inicial (en la cuenta). Se traducen los permisos de los roles
-- existentes a los nuevos permisos equivalentes; los que ya no existen se borran.
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.notas.ver' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.movimientos.gestionar'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.notas.gestionar' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.movimientos.gestionar'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.saldos-iniciales.gestionar' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.movimientos.gestionar'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.notas.anular' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.movimientos.anular'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.saldos-iniciales.importar' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.movimientos.importar'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.saldos-iniciales.exportar' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.movimientos.importar'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.transferencias.ver' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.transferencias.gestionar'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
DELETE FROM "core"."rol_permisos"
WHERE "permiso" IN ('bancos.movimientos.gestionar', 'bancos.movimientos.anular', 'bancos.movimientos.importar');
