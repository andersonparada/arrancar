-- 1. Teléfonos, WhatsApp y correos pasan a guardarse normalizados (objetos de
--    valor Telefono y Correo): sin separadores y en minúsculas. Lo que no tenga
--    forma de teléfono o de correo se borra, porque ya no se podría leer como dato válido.
UPDATE "terceros"."terceros" SET
  "telefono" = nullif(regexp_replace("telefono", '[[:space:]().-]', '', 'g'), ''),
  "whatsapp" = nullif(regexp_replace("whatsapp", '[[:space:]().-]', '', 'g'), ''),
  "correo" = nullif(lower(btrim("correo")), '');
--> statement-breakpoint
UPDATE "terceros"."contactos" SET
  "telefono" = nullif(regexp_replace("telefono", '[[:space:]().-]', '', 'g'), ''),
  "whatsapp" = nullif(regexp_replace("whatsapp", '[[:space:]().-]', '', 'g'), ''),
  "correo" = nullif(lower(btrim("correo")), '');
--> statement-breakpoint
UPDATE "terceros"."terceros" SET "telefono" = NULL WHERE "telefono" !~ '^\+?[0-9]{7,15}$';
--> statement-breakpoint
UPDATE "terceros"."terceros" SET "whatsapp" = NULL WHERE "whatsapp" !~ '^\+?[0-9]{7,15}$';
--> statement-breakpoint
UPDATE "terceros"."terceros" SET "correo" = NULL WHERE "correo" !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$';
--> statement-breakpoint
UPDATE "terceros"."contactos" SET "telefono" = NULL WHERE "telefono" !~ '^\+?[0-9]{7,15}$';
--> statement-breakpoint
UPDATE "terceros"."contactos" SET "whatsapp" = NULL WHERE "whatsapp" !~ '^\+?[0-9]{7,15}$';
--> statement-breakpoint
UPDATE "terceros"."contactos" SET "correo" = NULL WHERE "correo" !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$';
--> statement-breakpoint

-- 2. El papel de trabajador pasa al futuro módulo de planilla: se quitan sus
--    permisos de los roles y su configuración.
DELETE FROM "core"."rol_permisos" WHERE "permiso" IN ('trabajadores.ver', 'trabajadores.gestionar');
--> statement-breakpoint
DELETE FROM "core"."configuraciones" WHERE "clave" = 'terceros.trabajadores.dpi_obligatorio';
--> statement-breakpoint
UPDATE "core"."configuraciones"
SET "valor" = (
  SELECT coalesce(jsonb_agg(papel), '[]'::jsonb)
  FROM jsonb_array_elements("valor") AS papel
  WHERE papel <> '"trabajador"'::jsonb
)
WHERE "clave" = 'terceros.papeles.habilitados' AND jsonb_typeof("valor") = 'array';
