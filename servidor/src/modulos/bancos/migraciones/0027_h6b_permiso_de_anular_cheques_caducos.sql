-- H6b: anular cheques caducos en lote tiene su propio permiso (docs/PLAN.md §3.5). Lo reciben, por rol y por
-- usuario, quienes ya podían anular cheques (`bancos.cheques.anular`), para que nadie pierda lo que hacía.
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT "rol_id", 'bancos.cheques-caducos.anular' FROM "core"."rol_permisos" WHERE "permiso" = 'bancos.cheques.anular'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."usuario_permisos" ("cuenta_id", "usuario_id", "permiso")
SELECT "cuenta_id", "usuario_id", 'bancos.cheques-caducos.anular' FROM "core"."usuario_permisos" WHERE "permiso" = 'bancos.cheques.anular'
ON CONFLICT DO NOTHING;
