-- EM-2.3: la auditoría de los cierres, reaperturas y cambios del balance de apertura de la carga inicial no se depura
-- mientras exista la empresa (catálogo de la migración 0024 del core). Las reaperturas ya registradas quedan protegidas
-- desde ahora, sin copiarlas.
INSERT INTO "core"."recursos_de_auditoria_permanente" ("recurso", "motivo")
VALUES (
  'empresas.cargas-iniciales',
  'Cierres, reaperturas y balance de apertura de la carga inicial: respaldo de la apertura mientras la SAT pueda revisar (Código Tributario, arts. 47, 49 y 50) y el comerciante conservar (Código de Comercio, art. 382). Dictamen del 2026-11-18.'
)
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- Ver lo que se justificó al cerrar y llevárselo a Excel tienen su propio permiso (docs/PLAN.md §3.5). Lo reciben, por rol
-- y por usuario, quienes ya podían cerrar o reabrir la carga inicial.
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT DISTINCT "rol_id", nuevo."permiso"
FROM "core"."rol_permisos"
CROSS JOIN (VALUES ('empresas.carga-inicial.ver-cierres'), ('empresas.carga-inicial.exportar')) AS nuevo("permiso")
WHERE "core"."rol_permisos"."permiso" IN ('empresas.carga-inicial.cerrar', 'empresas.carga-inicial.reabrir')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT DISTINCT "cuenta_id", "usuario_id", nuevo."permiso"
FROM "core"."usuario_permisos"
CROSS JOIN (VALUES ('empresas.carga-inicial.ver-cierres'), ('empresas.carga-inicial.exportar')) AS nuevo("permiso")
WHERE "core"."usuario_permisos"."permiso" IN ('empresas.carga-inicial.cerrar', 'empresas.carga-inicial.reabrir')
ON CONFLICT DO NOTHING;
