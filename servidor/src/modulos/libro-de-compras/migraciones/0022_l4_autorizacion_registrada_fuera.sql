-- ¿Esta autorización FEL ya está registrada y vigente en OTRA empresa de la misma cuenta que la empresa activa?
-- RLS impide a la empresa activa ver los documentos de las demás; esta función, que corre con los permisos del dueño
-- de la tabla, solo responde sí o no (nunca devuelve datos del documento ni de la empresa).
-- Pregunta L4-c: una autorización registrada en otra cuenta responde «no», para no revelar nada fuera de la cuenta;
-- la unicidad global de documentos ya hace que ahí se rechace al confirmar, con el mensaje genérico de siempre.
CREATE OR REPLACE FUNCTION libro_de_compras.autorizacion_registrada_fuera(autorizacion uuid) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, libro_de_compras
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM libro_de_compras.documentos d
    WHERE d.autorizacion_fel = autorizacion
      AND d.estado = 'vigente'
      AND d.cuenta_id = nullif(current_setting('app.cuenta_id', true), '')::uuid
      AND d.empresa_id <> nullif(current_setting('app.empresa_id', true), '')::uuid
  );
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION libro_de_compras.autorizacion_registrada_fuera(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION libro_de_compras.autorizacion_registrada_fuera(uuid) TO arrancar_app;
