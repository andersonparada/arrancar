-- Teléfono y correo de las empresas pasan a guardarse normalizados (objetos de
-- valor Telefono y Correo): teléfono sin separadores y correo en minúsculas.
-- Lo que no tenga forma de teléfono o de correo se borra, porque ya no se
-- podría leer como dato válido.
UPDATE "core"."empresas"
SET "telefono" = nullif(regexp_replace("telefono", '[[:space:]().-]', '', 'g'), '')
WHERE "telefono" IS NOT NULL;
--> statement-breakpoint
UPDATE "core"."empresas"
SET "telefono" = NULL
WHERE "telefono" !~ '^\+?[0-9]{7,15}$';
--> statement-breakpoint
UPDATE "core"."empresas"
SET "correo" = nullif(lower(btrim("correo")), '')
WHERE "correo" IS NOT NULL;
--> statement-breakpoint
UPDATE "core"."empresas"
SET "correo" = NULL
WHERE "correo" !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$';
