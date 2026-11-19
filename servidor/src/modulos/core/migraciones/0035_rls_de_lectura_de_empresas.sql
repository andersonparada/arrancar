DROP POLICY "leer_sin_filtro" ON "core"."empresas" CASCADE;--> statement-breakpoint
CREATE POLICY "leer_en_la_cuenta" ON "core"."empresas" AS PERMISSIVE FOR SELECT TO "arrancar_app" USING (cuenta_id = nullif(current_setting('app.cuenta_id', true), '')::uuid);--> statement-breakpoint
-- R-4 (docs/modulos/diseno-rls-de-core.md §5): con la lectura de `core.empresas` limitada a la cuenta de la transacción,
-- lo que la sesión, soporte y la bitácora necesitan ver más allá de la cuenta pasa por estas funciones del dueño. Cada
-- una devuelve solo las columnas que el llamador usa. Solo `arrancar_app` puede ejecutarlas.
CREATE FUNCTION core.empresa_de_la_sesion(empresa uuid)
RETURNS TABLE (id uuid, nombre text, nit text, cuenta_id uuid, cuenta_nombre text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, core
AS $$
  SELECT e.id, e.nombre, e.nit, e.cuenta_id, c.nombre
  FROM core.empresas e
  JOIN core.cuentas c ON c.id = e.cuenta_id
  WHERE e.id = empresa
$$;
--> statement-breakpoint
CREATE FUNCTION core.empresas_del_usuario(usuario uuid)
RETURNS TABLE (id uuid, nombre text, nit text, cuenta_id uuid, cuenta_nombre text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, core
AS $$
  SELECT e.id, e.nombre, e.nit, e.cuenta_id, c.nombre
  FROM core.empresa_usuarios eu
  JOIN core.empresas e ON e.id = eu.empresa_id
  JOIN core.cuentas c ON c.id = e.cuenta_id
  WHERE eu.usuario_id = usuario AND e.activa AND c.activa
  ORDER BY c.nombre, e.nombre
$$;
--> statement-breakpoint
CREATE FUNCTION core.todas_las_empresas()
RETURNS TABLE (id uuid, nombre text, nit text, cuenta_id uuid, cuenta_nombre text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, core
AS $$
  SELECT e.id, e.nombre, e.nit, e.cuenta_id, c.nombre
  FROM core.empresas e
  JOIN core.cuentas c ON c.id = e.cuenta_id
  ORDER BY c.nombre, e.nombre
$$;
--> statement-breakpoint
-- No revela cuáles son las otras cuentas del usuario, solo cuántas.
CREATE FUNCTION core.pertenencia_del_usuario(usuario uuid, cuenta uuid)
RETURNS TABLE (en_la_cuenta boolean, otras_cuentas integer)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, core
AS $$
  SELECT coalesce(bool_or(e.cuenta_id = cuenta), false),
         (count(DISTINCT e.cuenta_id) FILTER (WHERE e.cuenta_id <> cuenta))::integer
  FROM core.empresa_usuarios eu
  JOIN core.empresas e ON e.id = eu.empresa_id
  WHERE eu.usuario_id = usuario
$$;
--> statement-breakpoint
CREATE FUNCTION core.resumen_de_cuentas()
RETURNS TABLE (cuenta_id uuid, total_empresas integer)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, core
AS $$
  SELECT e.cuenta_id, count(*)::integer FROM core.empresas e GROUP BY e.cuenta_id
$$;
--> statement-breakpoint
CREATE FUNCTION core.nombres_de_empresas(ids uuid[])
RETURNS TABLE (id uuid, nombre text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, core
AS $$
  SELECT e.id, e.nombre FROM core.empresas e WHERE e.id = ANY (ids)
$$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION
  core.empresa_de_la_sesion(uuid), core.empresas_del_usuario(uuid), core.todas_las_empresas(),
  core.pertenencia_del_usuario(uuid, uuid), core.resumen_de_cuentas(), core.nombres_de_empresas(uuid[])
FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION
  core.empresa_de_la_sesion(uuid), core.empresas_del_usuario(uuid), core.todas_las_empresas(),
  core.pertenencia_del_usuario(uuid, uuid), core.resumen_de_cuentas(), core.nombres_de_empresas(uuid[])
TO arrancar_app;
