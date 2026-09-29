-- H3c: permisos del reporte de flujo de efectivo. Quien ya veia o exportaba el reporte de movimientos ve y exporta
-- el flujo (Movimientos por concepto reutiliza los permisos de movimientos y no necesita nada nuevo).
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.flujo-de-efectivo.ver' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.movimientos.ver'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.flujo-de-efectivo.exportar' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.movimientos.exportar'
ON CONFLICT DO NOTHING;
