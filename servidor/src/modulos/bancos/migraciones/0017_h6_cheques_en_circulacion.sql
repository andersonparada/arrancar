-- H6a: índice parcial de los cheques en circulación y permisos del reporte de cheques caducos:
-- quien ya veía o exportaba el reporte de movimientos ve y exporta el de cheques caducos.
CREATE INDEX "movimientos_cheques_en_circulacion_idx" ON "bancos"."movimientos" USING btree ("cuenta_bancaria_id","fecha") WHERE "bancos"."movimientos"."tipo" = 'cheque' and "bancos"."movimientos"."conciliacion_id" is null and "bancos"."movimientos"."revertido_en" is null and "bancos"."movimientos"."anulado_en" is null;--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.cheques-caducos.ver' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.movimientos.ver'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.cheques-caducos.exportar' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.movimientos.exportar'
ON CONFLICT DO NOTHING;
