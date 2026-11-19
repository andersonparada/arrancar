-- La anulación de un pago cancela también los avisos `enviando` y `fallido`. Si se cancelaron mientras el trabajador
-- los enviaba, `resolver_correo` anota el intento y los deja `cancelado` (no vuelven a `pendiente`).
CREATE OR REPLACE FUNCTION core.resolver_correo(
  p_id uuid, p_resultado text, p_codigo text, p_rechazados text[], p_duracion_ms integer
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, pg_temp
SET row_security = off
AS $$
#variable_conflict use_column
DECLARE
  fila core.correos_salientes%ROWTYPE;
  el_codigo text := CASE WHEN p_codigo ~ '^[A-Za-z0-9_.-]{1,40}$' THEN p_codigo ELSE NULL END;
  esperas integer[] := ARRAY[1, 5, 30, 120, 720, 1440, 1440];
  nuevo_estado text;
BEGIN
  IF p_resultado NOT IN ('enviado', 'temporal', 'permanente', 'autenticacion', 'sin_servidor') THEN
    RAISE EXCEPTION 'Resultado desconocido.' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  SELECT * INTO fila FROM core.correos_salientes c WHERE c.id = p_id AND c.estado IN ('enviando', 'cancelado') FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El correo no existe o no está enviándose.' USING ERRCODE = 'no_data_found';
  END IF;
  INSERT INTO core.intentos_de_correos (correo_saliente_id, empresa_id, numero, resultado, codigo, duracion_ms)
    SELECT fila.id, fila.empresa_id, coalesce(max(i.numero), 0) + 1, p_resultado, el_codigo, greatest(p_duracion_ms, 0)
    FROM core.intentos_de_correos i WHERE i.correo_saliente_id = fila.id;
  -- Cancelado mientras se enviaba (el origen se anuló): queda cancelado; solo anota el intento y no se reintenta.
  IF fila.estado = 'cancelado' THEN
    RETURN 'cancelado';
  END IF;
  nuevo_estado := CASE
    WHEN p_resultado = 'enviado' THEN 'enviado'
    WHEN p_resultado = 'permanente' OR (p_resultado = 'temporal' AND fila.intentos >= 8) THEN 'fallido'
    ELSE 'pendiente' END;
  UPDATE core.correos_salientes c SET
    estado = nuevo_estado,
    bloqueado_hasta = NULL,
    enviado_en = CASE WHEN nuevo_estado = 'enviado' THEN now() END,
    ultimo_error_codigo = CASE WHEN p_resultado = 'enviado' THEN NULL ELSE coalesce(el_codigo, 'DESCONOCIDO') END,
    intentos = CASE WHEN p_resultado IN ('autenticacion', 'sin_servidor') THEN greatest(c.intentos - 1, 0) ELSE c.intentos END,
    proximo_intento = CASE
      WHEN p_resultado IN ('autenticacion', 'sin_servidor') THEN now() + interval '15 minutes'
      WHEN nuevo_estado = 'pendiente'
        THEN now() + make_interval(secs => esperas[least(c.intentos, 7)] * 60 * (0.8 + random() * 0.4))
      ELSE c.proximo_intento END,
    actualizado_en = now()
    WHERE c.id = fila.id;
  IF p_resultado = 'enviado' THEN
    UPDATE core.destinatarios_de_correos d SET resultado =
      CASE WHEN lower(d.direccion) = ANY (SELECT lower(r) FROM unnest(coalesce(p_rechazados, ARRAY[]::text[])) r)
           THEN 'rechazado' ELSE 'aceptado' END
      WHERE d.correo_saliente_id = fila.id;
  END IF;
  RETURN nuevo_estado;
END;
$$;
