-- H5b: siembra la lista sugerida de tipos de localidad (ver `dominio/tipos-de-localidad-iniciales.ts`) en cada empresa
-- que ya existe y sin ningún tipo; las empresas nuevas la reciben al registrarse y las de la alta de cuenta, al abrir
-- el catálogo vacío. Corre como dueño (sin RLS). También traduce los permisos de los roles: quien ya veía empresas ve los
-- tipos de localidad, y quien las gestionaba también gestiona, importa y exporta ese catálogo.
INSERT INTO "empresas"."tipos_de_localidad" ("empresa_id", "nombre", "activo")
SELECT e."id", t."nombre", true
FROM "core"."empresas" e
CROSS JOIN (VALUES ('Finca'), ('Planta'), ('Oficina'), ('Bodega'), ('Beneficio'), ('Tienda'), ('Taller')) AS t("nombre")
WHERE NOT EXISTS (SELECT 1 FROM "empresas"."tipos_de_localidad" x WHERE x."empresa_id" = e."id")
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT DISTINCT "rol_id", 'empresas.tipos-de-localidad.ver' FROM "core"."rol_permisos" WHERE "permiso" = 'empresas.ver'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT DISTINCT "rol_id", 'empresas.tipos-de-localidad.gestionar' FROM "core"."rol_permisos" WHERE "permiso" = 'empresas.gestionar'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT DISTINCT "rol_id", 'empresas.tipos-de-localidad.importar' FROM "core"."rol_permisos" WHERE "permiso" = 'empresas.gestionar'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "core"."rol_permisos" ("rol_id", "permiso")
SELECT DISTINCT "rol_id", 'empresas.tipos-de-localidad.exportar' FROM "core"."rol_permisos" WHERE "permiso" = 'empresas.gestionar'
ON CONFLICT DO NOTHING;
