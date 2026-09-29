-- H3b: para registrar una nota o emitir un cheque hay que elegir un concepto, y para elegirlo hay que verlos:
-- quien ya registraba notas o emitía cheques recibe también `bancos.conceptos.ver` (solo ver: administrar el
-- catálogo sigue siendo `bancos.conceptos.gestionar`).
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT DISTINCT "rol_id", 'bancos.conceptos.ver' FROM "core"."rol_permisos"
WHERE "permiso" IN ('bancos.notas.gestionar', 'bancos.cheques.emitir', 'bancos.movimientos.ver')
ON CONFLICT DO NOTHING;
