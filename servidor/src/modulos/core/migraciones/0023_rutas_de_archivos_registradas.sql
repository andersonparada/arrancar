-- La tarea diaria que borra archivos sueltos corre sin empresa, y `core.archivos` tiene RLS por empresa.
-- Esta función, que corre con los permisos del dueño de la tabla (como `core.depurar_auditoria`), responde
-- solo «cuáles de estas rutas están registradas» en cualquier empresa. Solo lee y no devuelve nada que
-- quien la llama no sepa ya: recibe las rutas y devuelve un subconjunto de ellas. Máximo 500 por llamada.
CREATE OR REPLACE FUNCTION core.rutas_de_archivos_registradas(rutas text[]) RETURNS SETOF text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = core, pg_temp
AS $$
BEGIN
  IF coalesce(cardinality(rutas), 0) > 500 THEN
    RAISE EXCEPTION 'Se pueden consultar como máximo 500 rutas por llamada.' USING ERRCODE = 'program_limit_exceeded';
  END IF;
  RETURN QUERY
    SELECT consultada.ruta
    FROM unnest(rutas) AS consultada(ruta)
    WHERE EXISTS (
      SELECT 1 FROM core.archivos a
      WHERE a.ruta_original = consultada.ruta OR a.ruta_miniatura = consultada.ruta
    );
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION core.rutas_de_archivos_registradas(text[]) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION core.rutas_de_archivos_registradas(text[]) TO arrancar_app;
