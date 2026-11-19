-- Los cupos de envío cuentan destinatarios (para y copias), no correos: un correo con 10 destinatarios gasta 10.
-- Así los topes (100 por hora y 500 por día por cuenta, 1,000 por hora la instalación) limitan los mensajes que
-- realmente salen y no rinden hasta 10 veces más. Misma firma y mismos permisos que la versión de la 0026.
CREATE OR REPLACE FUNCTION core.reservar_cupo_de_correo(direcciones text[])
RETURNS TABLE (por_hora integer, por_dia integer, de_la_instalacion_por_hora integer, por_destinatario jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, pg_temp
SET row_security = off
AS $$
#variable_conflict use_column
DECLARE
  la_cuenta uuid := nullif(current_setting('app.cuenta_id', true), '')::uuid;
BEGIN
  IF la_cuenta IS NULL THEN
    RAISE EXCEPTION 'No hay una cuenta en la transacción.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF coalesce(cardinality(direcciones), 0) > 10 THEN
    RAISE EXCEPTION 'Se pueden consultar como máximo 10 direcciones.' USING ERRCODE = 'program_limit_exceeded';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('core.correo:' || la_cuenta::text, 0));
  RETURN QUERY
    SELECT
      (SELECT count(*)::integer FROM core.destinatarios_de_correos d
        WHERE d.cuenta_id = la_cuenta AND d.creado_en > now() - interval '1 hour'),
      (SELECT count(*)::integer FROM core.destinatarios_de_correos d
        WHERE d.cuenta_id = la_cuenta AND d.creado_en > now() - interval '1 day'),
      (SELECT count(*)::integer FROM core.destinatarios_de_correos d
        WHERE d.creado_en > now() - interval '1 hour'),
      coalesce((
        SELECT jsonb_object_agg(pedida.direccion, (
          SELECT count(*)::integer FROM core.destinatarios_de_correos d
          WHERE d.cuenta_id = la_cuenta AND lower(d.direccion) = pedida.direccion
            AND d.creado_en > now() - interval '1 day'))
        FROM (SELECT DISTINCT lower(x) AS direccion FROM unnest(direcciones) AS x WHERE x IS NOT NULL) pedida
      ), '{}'::jsonb);
END;
$$;
