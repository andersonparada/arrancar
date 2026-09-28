-- La configuración (cuenta/empresa/instalación) pasa a verla y cambiarla solo
-- el superacceso (soporte); ningún rol de cuenta la recibe, ni siquiera uno con
-- acceso total. Se borran las asignaciones existentes de estos permisos.
DELETE FROM "core"."rol_permisos"
WHERE "permiso" IN ('configuracion.ver', 'configuracion.gestionar');