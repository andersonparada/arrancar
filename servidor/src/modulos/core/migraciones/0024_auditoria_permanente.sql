CREATE TABLE "core"."recursos_de_auditoria_permanente" (
	"recurso" text PRIMARY KEY NOT NULL,
	"motivo" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recursos_de_auditoria_permanente_recurso_valido" CHECK ("core"."recursos_de_auditoria_permanente"."recurso" ~ '^[a-z0-9-]+\.[a-z0-9-]+$'),
	CONSTRAINT "recursos_de_auditoria_permanente_motivo_valido" CHECK (char_length(btrim("core"."recursos_de_auditoria_permanente"."motivo")) between 1 and 500)
);
--> statement-breakpoint
ALTER TABLE "core"."recursos_de_auditoria_permanente" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "leer_el_catalogo" ON "core"."recursos_de_auditoria_permanente" AS PERMISSIVE FOR SELECT TO "arrancar_app" USING (true);
--> statement-breakpoint
-- La auditoría de los recursos del catálogo no se depura mientras la entrada tenga empresa (`empresa_id` pasa a nulo
-- si se borra la empresa, y entonces vuelve a la regla de 60 meses). `row_security = off`: si algún día se fuerza RLS
-- en el catálogo, la función falla con error en vez de leerlo vacío y depurar lo que debía conservarse.
-- `CREATE OR REPLACE` conserva el REVOKE y el GRANT EXECUTE de la migración 0009.
CREATE OR REPLACE FUNCTION core.depurar_auditoria(meses integer) RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = core, pg_temp
SET row_security = off
AS $$
  WITH borradas AS (
    DELETE FROM core.auditoria a
    WHERE a.creado_en < now() - make_interval(months => greatest(meses, 60))
      AND NOT (
        a.empresa_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM core.recursos_de_auditoria_permanente p WHERE p.recurso = a.recurso)
      )
    RETURNING 1
  )
  SELECT count(*)::integer FROM borradas;
$$;
