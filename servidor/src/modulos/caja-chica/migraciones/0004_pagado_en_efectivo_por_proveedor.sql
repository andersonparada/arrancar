-- CC-3 (§5.4 h y §13.1 del diseño): lo que los fondos de caja chica pagaron en efectivo a un proveedor en un rango de
-- fechas, para la bancarización compartida (pregunta `libro-de-compras.pagado_al_proveedor_en_el_mes`).
--
-- Suma TODOS los fondos de la empresa, también los que el usuario no ve: con la seguridad por alcance de cada fondo la
-- suma saldría corta. Por eso corre como el dueño (`security definer`, sin RLS), con `search_path` vacío; la empresa sale
-- de `app.empresa_id` (la fija la unidad de trabajo), nunca de un parámetro, y devuelve solo el total y cuántos son: no
-- muestra fondos ni documentos. Cuenta los comprobantes `documento` vigentes y asignados a un fondo (el de la bandeja
-- todavía no se sabe si se pagó del fondo) que no restan (la nota de crédito no es un pago), por `monto + monto_retenido`
-- (el valor antes de retenciones: la retención la entera la empresa y no sale del fondo, pero es parte de la operación).
-- Repetible: `CREATE OR REPLACE` conserva los permisos.
CREATE OR REPLACE FUNCTION caja_chica.pagado_en_efectivo_al_proveedor(proveedor uuid, desde date, hasta date)
RETURNS TABLE (total numeric, cantidad integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(sum(c.monto + c.monto_retenido), 0), count(*)::integer
    FROM caja_chica.comprobantes c
   WHERE c.empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid
     AND c.proveedor_id = proveedor
     AND c.clase = 'documento'
     AND c.estado = 'vigente'
     AND c.fondo_id IS NOT NULL
     AND NOT c.resta
     AND c.fecha BETWEEN desde AND hasta
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION caja_chica.pagado_en_efectivo_al_proveedor(uuid, date, date) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION caja_chica.pagado_en_efectivo_al_proveedor(uuid, date, date) TO arrancar_app;
