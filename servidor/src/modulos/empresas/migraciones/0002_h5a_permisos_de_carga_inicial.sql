-- H5a: quien ya podia gestionar empresas puede cerrar su carga inicial. Reabrirla (`empresas.carga-inicial.reabrir`)
-- solo lo reciben los roles con acceso total, que tienen todos los permisos sin que se guarden: no se asigna a nadie.
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT DISTINCT "rol_id", 'empresas.carga-inicial.cerrar' FROM "core"."rol_permisos" WHERE "permiso" = 'empresas.gestionar'
ON CONFLICT DO NOTHING;
