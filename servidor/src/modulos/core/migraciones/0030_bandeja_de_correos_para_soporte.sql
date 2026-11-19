-- Panel de Soporte (correo, paso 8): lo que ve la instalación de la bandeja de todas las empresas.
-- La seguridad por filas deja a la app ver solo su empresa; Soporte trabaja por encima de las cuentas, así que lee
-- por funciones `security definer` de solo lectura (como `core.rutas_de_archivos_registradas`). No devuelven cuerpos,
-- direcciones ni mensajes de error: solo conteos y, de los fallidos, empresa, tipo y código.
CREATE OR REPLACE FUNCTION core.resumen_de_la_bandeja()
RETURNS TABLE (estado text, total integer, mas_antiguo timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = core, pg_temp
SET row_security = off
AS $$
  SELECT c.estado, count(*)::integer, min(c.creado_en)
    FROM core.correos_salientes c
    GROUP BY c.estado;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION core.resumen_de_la_bandeja() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION core.resumen_de_la_bandeja() TO arrancar_app;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION core.correos_fallidos_recientes(limite integer)
RETURNS TABLE (
  id uuid,
  empresa text,
  tipo text,
  codigo text,
  intentos smallint,
  creado_en timestamp with time zone,
  contenido_depurado boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = core, pg_temp
SET row_security = off
AS $$
#variable_conflict use_column
BEGIN
  IF limite IS NULL OR limite < 1 OR limite > 100 THEN
    RAISE EXCEPTION 'El límite debe estar entre 1 y 100.' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  RETURN QUERY
    SELECT c.id, e.nombre, c.tipo, c.ultimo_error_codigo, c.intentos, c.creado_en, c.contenido_depurado_en IS NOT NULL
      FROM core.correos_salientes c
      JOIN core.empresas e ON e.id = c.empresa_id
      WHERE c.estado = 'fallido'
      ORDER BY c.actualizado_en DESC, c.id DESC
      LIMIT limite;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION core.correos_fallidos_recientes(integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION core.correos_fallidos_recientes(integer) TO arrancar_app;
