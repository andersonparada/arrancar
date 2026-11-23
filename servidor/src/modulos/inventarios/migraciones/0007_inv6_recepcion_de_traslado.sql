-- INV-6, PARA REVISION DE SEGURIDAD: quien envia un traslado con transito no ve la entrada de la recepcion (esta en el
-- destino) y la boleta debe mostrarle quien la recibio y cuando (§6.7). Esta funcion da solo la fecha y el usuario de la
-- recepcion vigente de UNA salida de la empresa activa (app.empresa_id, nunca un parametro), sin el alcance de bodegas:
-- ni renglones, ni costos, ni bodega. Corre con los permisos del dueño de la tabla (la RLS no lo alcanza). Solo se
-- llama despues de haber leido la salida con la seguridad normal, asi que el id ya es de un traslado que el usuario ve.
CREATE FUNCTION inventarios.recepcion_de_traslado(salida_id uuid)
RETURNS TABLE (fecha date, recibido_por uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, inventarios
AS $$
  SELECT d.fecha, d.creado_por
  FROM inventarios.documentos d
  WHERE d.empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid
    AND d.clase = 'entrada_de_traslado'
    AND d.estado = 'vigente'
    AND d.documento_relacionado_id = salida_id;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION inventarios.recepcion_de_traslado(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION inventarios.recepcion_de_traslado(uuid) TO arrancar_app;
