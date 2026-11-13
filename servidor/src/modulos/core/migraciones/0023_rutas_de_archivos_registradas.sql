CREATE INDEX "archivos_ruta_original_idx" ON "core"."archivos" USING btree ("ruta_original");--> statement-breakpoint
CREATE INDEX "archivos_ruta_miniatura_idx" ON "core"."archivos" USING btree ("ruta_miniatura");--> statement-breakpoint
-- La tarea diaria que borra archivos sueltos corre sin empresa, y `core.archivos` tiene RLS por empresa.
-- Esta función, que corre con los permisos del dueño de la tabla (como `core.depurar_auditoria`), responde
-- solo «cuáles de estas rutas están registradas» en cualquier empresa. Solo lee y no devuelve nada que
-- quien la llama no sepa ya: recibe las rutas y devuelve un subconjunto de ellas. Máximo 500 por llamada.
-- `row_security = off`: si algún día se fuerza RLS en `core.archivos`, la función falla con error en vez de
-- devolver vacío (que haría creer que todo está suelto).
CREATE OR REPLACE FUNCTION core.rutas_de_archivos_registradas(rutas text[]) RETURNS SETOF text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = core, pg_temp
SET row_security = off
AS $$
BEGIN
  IF coalesce(cardinality(rutas), 0) > 500 THEN
    RAISE EXCEPTION 'Se pueden consultar como máximo 500 rutas por llamada.' USING ERRCODE = 'program_limit_exceeded';
  END IF;
  RETURN QUERY
    SELECT consultada.ruta
    FROM unnest(rutas) AS consultada(ruta)
    WHERE consultada.ruta IN (SELECT a.ruta_original FROM core.archivos a WHERE a.ruta_original = ANY (rutas))
    UNION
    SELECT consultada.ruta
    FROM unnest(rutas) AS consultada(ruta)
    WHERE consultada.ruta IN (SELECT a.ruta_miniatura FROM core.archivos a WHERE a.ruta_miniatura = ANY (rutas));
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION core.rutas_de_archivos_registradas(text[]) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION core.rutas_de_archivos_registradas(text[]) TO arrancar_app;
