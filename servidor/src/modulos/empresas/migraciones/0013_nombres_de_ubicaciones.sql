-- AF-P22 (b), PARA REVISION DE SEGURIDAD: los nombres de las localidades y de los departamentos de la empresa activa,
-- sin el alcance de localidades. Activos fijos no lleva alcance (todos ven todos los activos), asi que quien no tiene
-- una localidad asignada igual debe ver su nombre en la lista y la ficha de un activo.
-- Corren con los permisos del dueño de la tabla (la RLS no lo alcanza: el proyecto no usa FORCE ROW LEVEL SECURITY).
-- Solo filtran por la empresa de la transaccion (app.empresa_id), nunca por un parametro: sin contexto no devuelven
-- nada y no se puede pedir otra empresa ni otra cuenta. Devuelven columnas fijas: id, codigo, nombre y si esta activa
-- (en departamentos, tambien su localidad); ni direccion, ni municipio, ni datos del SAT, ni accesos.
CREATE FUNCTION empresas.nombres_de_localidades(ids uuid[] DEFAULT NULL)
RETURNS TABLE (id uuid, codigo text, nombre text, activo boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, empresas
AS $$
  SELECT l.id, l.codigo, l.nombre, l.activo
  FROM empresas.localidades l
  WHERE l.empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid
    AND (ids IS NULL OR l.id = ANY (ids));
$$;
--> statement-breakpoint
CREATE FUNCTION empresas.nombres_de_departamentos(ids uuid[] DEFAULT NULL)
RETURNS TABLE (id uuid, codigo text, nombre text, localidad_id uuid, activo boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, empresas
AS $$
  SELECT d.id, d.codigo, d.nombre, d.localidad_id, d.activo
  FROM empresas.departamentos d
  WHERE d.empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid
    AND (ids IS NULL OR d.id = ANY (ids));
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION empresas.nombres_de_localidades(uuid[]) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION empresas.nombres_de_departamentos(uuid[]) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION empresas.nombres_de_localidades(uuid[]) TO arrancar_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION empresas.nombres_de_departamentos(uuid[]) TO arrancar_app;
