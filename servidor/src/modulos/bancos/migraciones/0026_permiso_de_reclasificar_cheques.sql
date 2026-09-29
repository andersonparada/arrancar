-- P7: reclasificar un cheque tiene su propio permiso (docs/PLAN.md §3.5). Antes, quien podía corregir notas
-- (`bancos.notas.editar`) reclasificaba también los cheques por la misma ruta; para que nadie pierda lo que
-- podía hacer, recibe el nuevo permiso quien ya tenía ese.
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.cheques.reclasificar' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.notas.editar'
ON CONFLICT DO NOTHING;
