-- Roles y permisos por usuario (docs/modulos/diseno-permisos-por-usuario.md, P1).
-- El rol deja de ser de cada empresa y pasa a ser de la cuenta; ademas nace el permiso
-- `usuarios.asignar-permisos`. `empresa_usuarios.rol_id` queda sin uso (se elimina en la 0018).

-- 1. Cada rol que el usuario tenia en alguna empresa pasa a la cuenta (union: nadie pierde).
INSERT INTO "core"."usuario_roles" ("cuenta_id", "usuario_id", "rol_id")
SELECT DISTINCT e."cuenta_id", eu."usuario_id", eu."rol_id"
FROM "core"."empresa_usuarios" eu
JOIN "core"."empresas" e ON e."id" = eu."empresa_id"
WHERE eu."rol_id" IS NOT NULL
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- 2. Quien tenia roles distintos segun la empresa gana, en algunas empresas, los permisos de sus
--    otros roles: queda una entrada por usuario en la auditoria (sin usuario: la hizo la migracion).
INSERT INTO "core"."auditoria" ("cuenta_id", "empresa_id", "usuario_id", "recurso", "registro_id", "accion", "motivo", "anterior")
SELECT e."cuenta_id", NULL, NULL, 'core.roles-de-usuario', eu."usuario_id"::text, 'asignar',
       'Migración: el rol pasó de cada empresa a toda la cuenta',
       jsonb_agg(jsonb_build_object('empresaId', e."id", 'empresa', e."nombre", 'rolId', r."id", 'rol', r."nombre"))
FROM "core"."empresa_usuarios" eu
JOIN "core"."empresas" e ON e."id" = eu."empresa_id"
JOIN "core"."roles" r ON r."id" = eu."rol_id"
GROUP BY e."cuenta_id", eu."usuario_id"
HAVING count(DISTINCT eu."rol_id") > 1;
--> statement-breakpoint
-- 3. Quien podia crear o editar usuarios (y por eso asignaba roles) recibe el permiso nuevo.
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT DISTINCT "rol_id", 'usuarios.asignar-permisos' FROM "core"."rol_permisos"
WHERE "permiso" IN ('usuarios.crear', 'usuarios.editar')
ON CONFLICT DO NOTHING;
