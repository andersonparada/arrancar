-- La app no puede borrar la auditoría (RLS no tiene política de borrado). Esta
-- función, que corre con los permisos del dueño de la tabla, es la única forma:
-- borra solo lo anterior a los meses indicados (nunca menos de uno).
CREATE OR REPLACE FUNCTION core.depurar_auditoria(meses integer) RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = core, pg_temp
AS $$
  WITH borradas AS (
    DELETE FROM core.auditoria
    WHERE creado_en < now() - make_interval(months => greatest(meses, 1))
    RETURNING 1
  )
  SELECT count(*)::integer FROM borradas;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION core.depurar_auditoria(integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION core.depurar_auditoria(integer) TO arrancar_app;
