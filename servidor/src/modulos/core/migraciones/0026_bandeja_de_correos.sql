CREATE TABLE "core"."correos_salientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cuenta_id" uuid DEFAULT nullif(current_setting('app.cuenta_id', true), '')::uuid NOT NULL,
	"empresa_id" uuid DEFAULT nullif(current_setting('app.empresa_id', true), '')::uuid NOT NULL,
	"tipo" text NOT NULL,
	"recurso_origen" text NOT NULL,
	"registro_origen_id" uuid NOT NULL,
	"asunto" text NOT NULL,
	"cuerpo_texto" text,
	"cuerpo_html" text,
	"responder_a" text,
	"nombre_visible" text NOT NULL,
	"adjunto_archivo_id" uuid,
	"adjunto_nombre" text,
	"adjunto_sha256" text,
	"message_id" text NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"intentos" smallint DEFAULT 0 NOT NULL,
	"proximo_intento" timestamp with time zone DEFAULT now() NOT NULL,
	"bloqueado_hasta" timestamp with time zone,
	"enviado_en" timestamp with time zone,
	"ultimo_error_codigo" text,
	"cancelado_en" timestamp with time zone,
	"cancelado_por" uuid,
	"motivo_de_cancelacion" text,
	"contenido_depurado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	"actualizado_por" uuid DEFAULT nullif(current_setting('app.usuario_id', true), '')::uuid,
	CONSTRAINT "correos_salientes_message_id_unico" UNIQUE("message_id"),
	CONSTRAINT "correos_salientes_adjunto_unico" UNIQUE("adjunto_archivo_id"),
	CONSTRAINT "correos_salientes_tipo_valido" CHECK ("core"."correos_salientes"."tipo" ~ '^[a-z-]+\.[a-z_]+$'),
	CONSTRAINT "correos_salientes_asunto_valido" CHECK (char_length("core"."correos_salientes"."asunto") between 1 and 150 and "core"."correos_salientes"."asunto" !~ '[[:cntrl:]]'),
	CONSTRAINT "correos_salientes_nombre_visible_valido" CHECK (char_length("core"."correos_salientes"."nombre_visible") between 1 and 150 and "core"."correos_salientes"."nombre_visible" !~ '[[:cntrl:]]'),
	CONSTRAINT "correos_salientes_responder_a_largo" CHECK ("core"."correos_salientes"."responder_a" is null or char_length("core"."correos_salientes"."responder_a") <= 254),
	CONSTRAINT "correos_salientes_cuerpo_largo" CHECK (("core"."correos_salientes"."cuerpo_texto" is null or char_length("core"."correos_salientes"."cuerpo_texto") <= 20000) and ("core"."correos_salientes"."cuerpo_html" is null or char_length("core"."correos_salientes"."cuerpo_html") <= 100000)),
	CONSTRAINT "correos_salientes_contenido_completo" CHECK ("core"."correos_salientes"."contenido_depurado_en" is not null or ("core"."correos_salientes"."cuerpo_texto" is not null and "core"."correos_salientes"."cuerpo_html" is not null)),
	CONSTRAINT "correos_salientes_adjunto_completo" CHECK (("core"."correos_salientes"."adjunto_archivo_id" is null) = ("core"."correos_salientes"."adjunto_nombre" is null) or "core"."correos_salientes"."contenido_depurado_en" is not null),
	CONSTRAINT "correos_salientes_estado_valido" CHECK ("core"."correos_salientes"."estado" in ('pendiente', 'enviando', 'enviado', 'fallido', 'cancelado')),
	CONSTRAINT "correos_salientes_intentos_rango" CHECK ("core"."correos_salientes"."intentos" between 0 and 8),
	CONSTRAINT "correos_salientes_arriendo_de_su_estado" CHECK (("core"."correos_salientes"."estado" = 'enviando') = ("core"."correos_salientes"."bloqueado_hasta" is not null)),
	CONSTRAINT "correos_salientes_envio_de_su_estado" CHECK (("core"."correos_salientes"."estado" = 'enviado') = ("core"."correos_salientes"."enviado_en" is not null)),
	CONSTRAINT "correos_salientes_cancelacion_completa" CHECK (("core"."correos_salientes"."estado" = 'cancelado') = ("core"."correos_salientes"."cancelado_en" is not null) and ("core"."correos_salientes"."cancelado_en" is not null) = ("core"."correos_salientes"."motivo_de_cancelacion" is not null)),
	CONSTRAINT "correos_salientes_motivo_de_cancelacion_rango" CHECK ("core"."correos_salientes"."motivo_de_cancelacion" is null or char_length("core"."correos_salientes"."motivo_de_cancelacion") between 1 and 300),
	CONSTRAINT "correos_salientes_error_solo_codigo" CHECK ("core"."correos_salientes"."ultimo_error_codigo" is null or "core"."correos_salientes"."ultimo_error_codigo" ~ '^[A-Za-z0-9_.-]{1,40}$')
);
--> statement-breakpoint
ALTER TABLE "core"."correos_salientes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "core"."destinatarios_de_correos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"correo_saliente_id" uuid NOT NULL,
	"empresa_id" uuid DEFAULT nullif(current_setting('app.empresa_id', true), '')::uuid NOT NULL,
	"cuenta_id" uuid DEFAULT nullif(current_setting('app.cuenta_id', true), '')::uuid NOT NULL,
	"clase" text NOT NULL,
	"direccion" text NOT NULL,
	"nombre" text,
	"origen" text NOT NULL,
	"origen_id" uuid,
	"resultado" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "destinatarios_de_correos_direccion_unica" UNIQUE("correo_saliente_id","direccion"),
	CONSTRAINT "destinatarios_de_correos_clase_valida" CHECK ("core"."destinatarios_de_correos"."clase" in ('para', 'copia')),
	CONSTRAINT "destinatarios_de_correos_direccion_larga" CHECK (char_length("core"."destinatarios_de_correos"."direccion") between 3 and 254),
	CONSTRAINT "destinatarios_de_correos_nombre_largo" CHECK ("core"."destinatarios_de_correos"."nombre" is null or char_length("core"."destinatarios_de_correos"."nombre") <= 150),
	CONSTRAINT "destinatarios_de_correos_origen_valido" CHECK ("core"."destinatarios_de_correos"."origen" in ('tercero', 'contacto', 'empresa', 'usuario')),
	CONSTRAINT "destinatarios_de_correos_resultado_valido" CHECK ("core"."destinatarios_de_correos"."resultado" is null or "core"."destinatarios_de_correos"."resultado" in ('aceptado', 'rechazado'))
);
--> statement-breakpoint
ALTER TABLE "core"."destinatarios_de_correos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "core"."intentos_de_correos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"correo_saliente_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"numero" smallint NOT NULL,
	"ocurrido_en" timestamp with time zone DEFAULT now() NOT NULL,
	"resultado" text NOT NULL,
	"codigo" text,
	"duracion_ms" integer,
	CONSTRAINT "intentos_de_correos_numero_unico" UNIQUE("correo_saliente_id","numero"),
	CONSTRAINT "intentos_de_correos_numero_positivo" CHECK ("core"."intentos_de_correos"."numero" >= 1),
	CONSTRAINT "intentos_de_correos_resultado_valido" CHECK ("core"."intentos_de_correos"."resultado" in ('enviado', 'temporal', 'permanente', 'autenticacion', 'sin_servidor')),
	CONSTRAINT "intentos_de_correos_codigo_solo_codigo" CHECK ("core"."intentos_de_correos"."codigo" is null or "core"."intentos_de_correos"."codigo" ~ '^[A-Za-z0-9_.-]{1,40}$'),
	CONSTRAINT "intentos_de_correos_duracion_valida" CHECK ("core"."intentos_de_correos"."duracion_ms" is null or "core"."intentos_de_correos"."duracion_ms" >= 0)
);
--> statement-breakpoint
ALTER TABLE "core"."intentos_de_correos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "core"."correos_salientes" ADD CONSTRAINT "correos_salientes_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."correos_salientes" ADD CONSTRAINT "correos_salientes_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."correos_salientes" ADD CONSTRAINT "correos_salientes_adjunto_archivo_id_archivos_id_fk" FOREIGN KEY ("adjunto_archivo_id") REFERENCES "core"."archivos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."destinatarios_de_correos" ADD CONSTRAINT "destinatarios_de_correos_correo_saliente_id_correos_salientes_id_fk" FOREIGN KEY ("correo_saliente_id") REFERENCES "core"."correos_salientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."destinatarios_de_correos" ADD CONSTRAINT "destinatarios_de_correos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."destinatarios_de_correos" ADD CONSTRAINT "destinatarios_de_correos_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."intentos_de_correos" ADD CONSTRAINT "intentos_de_correos_correo_saliente_id_correos_salientes_id_fk" FOREIGN KEY ("correo_saliente_id") REFERENCES "core"."correos_salientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."intentos_de_correos" ADD CONSTRAINT "intentos_de_correos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "core"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "correos_salientes_por_enviar_idx" ON "core"."correos_salientes" USING btree ("proximo_intento") WHERE "core"."correos_salientes"."estado" in ('pendiente', 'enviando');--> statement-breakpoint
CREATE INDEX "correos_salientes_origen_idx" ON "core"."correos_salientes" USING btree ("empresa_id","recurso_origen","registro_origen_id");--> statement-breakpoint
CREATE INDEX "correos_salientes_cuenta_fecha_idx" ON "core"."correos_salientes" USING btree ("cuenta_id","creado_en");--> statement-breakpoint
CREATE INDEX "correos_salientes_empresa_fecha_idx" ON "core"."correos_salientes" USING btree ("empresa_id","creado_en" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "correos_salientes_depurar_idx" ON "core"."correos_salientes" USING btree ("creado_en") WHERE "core"."correos_salientes"."contenido_depurado_en" is null;--> statement-breakpoint
CREATE INDEX "destinatarios_de_correos_cupo_idx" ON "core"."destinatarios_de_correos" USING btree ("cuenta_id",lower("direccion"),"creado_en");--> statement-breakpoint
CREATE INDEX "intentos_de_correos_empresa_idx" ON "core"."intentos_de_correos" USING btree ("empresa_id");--> statement-breakpoint
CREATE POLICY "leer_en_la_empresa" ON "core"."correos_salientes" AS PERMISSIVE FOR SELECT TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "agregar_en_la_empresa" ON "core"."correos_salientes" AS PERMISSIVE FOR INSERT TO "arrancar_app" WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "cambiar_en_la_empresa" ON "core"."correos_salientes" AS PERMISSIVE FOR UPDATE TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid) WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "agregar_en_la_empresa" ON "core"."destinatarios_de_correos" AS PERMISSIVE FOR INSERT TO "arrancar_app" WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "leer_en_la_empresa" ON "core"."destinatarios_de_correos" AS PERMISSIVE FOR SELECT TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "leer_en_la_empresa" ON "core"."intentos_de_correos" AS PERMISSIVE FOR SELECT TO "arrancar_app" USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);
--> statement-breakpoint
-- Funciones de la bandeja de correos (C4, C5). Corren con los permisos del dueño de las tablas y con
-- `row_security = off`, porque el trabajador atiende a todas las empresas y la depuración borra lo que la app no puede
-- borrar (como `core.depurar_auditoria`). Cada una hace una sola cosa, valida sus límites y no devuelve más de lo necesario.

-- Cupos de envío (C5). Toma un candado por cuenta hasta el final de la transacción para que dos peticiones
-- simultáneas no se pasen del tope. La cuenta sale de `app.cuenta_id` (nunca de un parámetro).
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
      (SELECT count(*)::integer FROM core.correos_salientes c
        WHERE c.cuenta_id = la_cuenta AND c.creado_en > now() - interval '1 hour'),
      (SELECT count(*)::integer FROM core.correos_salientes c
        WHERE c.cuenta_id = la_cuenta AND c.creado_en > now() - interval '1 day'),
      (SELECT count(*)::integer FROM core.correos_salientes c
        WHERE c.creado_en > now() - interval '1 hour'),
      coalesce((
        SELECT jsonb_object_agg(pedida.direccion, (
          SELECT count(*)::integer FROM core.destinatarios_de_correos d
          WHERE d.cuenta_id = la_cuenta AND lower(d.direccion) = pedida.direccion
            AND d.creado_en > now() - interval '1 day'))
        FROM (SELECT DISTINCT lower(x) AS direccion FROM unnest(direcciones) AS x WHERE x IS NOT NULL) pedida
      ), '{}'::jsonb);
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION core.reservar_cupo_de_correo(text[]) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION core.reservar_cupo_de_correo(text[]) TO arrancar_app;
--> statement-breakpoint
-- Toma hasta `limite` correos listos para enviar y los deja `enviando` con un arriendo de `minutos` (C3). Retoma los que
-- quedaron `enviando` con el arriendo vencido (el proceso cayó). Con el servidor apagado o sin guardar no toma nada.
-- Si un arriendo vencido ya gastó los 8 intentos, queda `fallido` en vez de pasarse del máximo.
CREATE OR REPLACE FUNCTION core.tomar_correos_pendientes(limite integer, minutos integer)
RETURNS TABLE (
  id uuid, empresa_id uuid, asunto text, cuerpo_texto text, cuerpo_html text, nombre_visible text,
  responder_a text, message_id text, intentos smallint, destinatarios jsonb, adjunto_ruta text, adjunto_nombre text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, pg_temp
SET row_security = off
AS $$
#variable_conflict use_column
BEGIN
  IF limite IS NULL OR limite < 1 OR limite > 50 THEN
    RAISE EXCEPTION 'El límite debe estar entre 1 y 50.' USING ERRCODE = 'program_limit_exceeded';
  END IF;
  IF minutos IS NULL OR minutos < 1 OR minutos > 30 THEN
    RAISE EXCEPTION 'El arriendo debe durar entre 1 y 30 minutos.' USING ERRCODE = 'program_limit_exceeded';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM core.servidor_de_correo s WHERE s.activo) THEN
    RETURN;
  END IF;
  UPDATE core.correos_salientes c
    SET estado = 'fallido', bloqueado_hasta = NULL, ultimo_error_codigo = 'ARRIENDO_VENCIDO', actualizado_en = now()
    WHERE c.estado = 'enviando' AND c.bloqueado_hasta <= now() AND c.intentos >= 8;
  RETURN QUERY
    WITH tomados AS (
      SELECT c.id FROM core.correos_salientes c
      WHERE (c.estado = 'pendiente' AND c.proximo_intento <= now())
         OR (c.estado = 'enviando' AND c.bloqueado_hasta <= now())
      ORDER BY c.proximo_intento
      LIMIT limite
      FOR UPDATE SKIP LOCKED
    ), actualizados AS (
      UPDATE core.correos_salientes c
        SET estado = 'enviando', bloqueado_hasta = now() + make_interval(mins => minutos),
            intentos = c.intentos + 1, actualizado_en = now()
        FROM tomados t WHERE c.id = t.id
        RETURNING c.*
    )
    SELECT a.id, a.empresa_id, a.asunto, a.cuerpo_texto, a.cuerpo_html, a.nombre_visible, a.responder_a,
           a.message_id, a.intentos,
           coalesce((SELECT jsonb_agg(jsonb_build_object('clase', d.clase, 'direccion', d.direccion, 'nombre', d.nombre)
                                      ORDER BY d.clase DESC, d.direccion)
                     FROM core.destinatarios_de_correos d WHERE d.correo_saliente_id = a.id), '[]'::jsonb),
           r.ruta_original, a.adjunto_nombre
    FROM actualizados a
    LEFT JOIN core.archivos r ON r.id = a.adjunto_archivo_id
    ORDER BY a.proximo_intento;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION core.tomar_correos_pendientes(integer, integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION core.tomar_correos_pendientes(integer, integer) TO arrancar_app;
--> statement-breakpoint
-- Anota el resultado de un intento y deja el correo en su estado siguiente. Solo actúa sobre filas `enviando`.
-- `enviado`: guarda el resultado por destinatario. `temporal`: vuelve a `pendiente` con la espera siguiente
-- (1 min, 5 min, 30 min, 2 h, 12 h, 24 h, 24 h, con 20 % de azar) o queda `fallido` al octavo intento.
-- `permanente`: `fallido`. `autenticacion` y `sin_servidor`: no gastan intento y se reintentan en 15 minutos.
-- Devuelve el estado en que quedó. El código se guarda solo si parece un código (nunca el texto del servidor SMTP).
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
  SELECT * INTO fila FROM core.correos_salientes c WHERE c.id = p_id AND c.estado = 'enviando' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El correo no existe o no está enviándose.' USING ERRCODE = 'no_data_found';
  END IF;
  INSERT INTO core.intentos_de_correos (correo_saliente_id, empresa_id, numero, resultado, codigo, duracion_ms)
    SELECT fila.id, fila.empresa_id, coalesce(max(i.numero), 0) + 1, p_resultado, el_codigo, greatest(p_duracion_ms, 0)
    FROM core.intentos_de_correos i WHERE i.correo_saliente_id = fila.id;
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
--> statement-breakpoint
REVOKE ALL ON FUNCTION core.resolver_correo(uuid, text, text, text[], integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION core.resolver_correo(uuid, text, text, text[], integer) TO arrancar_app;
--> statement-breakpoint
-- Depuración diaria (C13). Borra el cuerpo, el HTML y el archivo adjunto de los correos terminados (`enviado`, `fallido`,
-- `cancelado`) con más de `dias` días (la huella del adjunto se conserva), y las filas completas (con sus destinatarios
-- e intentos) de los terminados con más de `meses` meses. El archivo en disco lo quita la depuración de huérfanos.
-- Plazos mínimos: 7 días y 60 meses, igual que la auditoría.
CREATE OR REPLACE FUNCTION core.depurar_correos(dias integer, meses integer)
RETURNS TABLE (contenido integer, filas integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, pg_temp
SET row_security = off
AS $$
#variable_conflict use_column
DECLARE
  ids uuid[];
  archivos_del_adjunto uuid[];
  borradas integer;
BEGIN
  IF dias IS NULL OR dias < 7 THEN
    RAISE EXCEPTION 'El contenido se conserva al menos 7 días.' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF meses IS NULL OR meses < 60 THEN
    RAISE EXCEPTION 'Los metadatos se conservan al menos 60 meses.' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  SELECT coalesce(array_agg(c.id), ARRAY[]::uuid[]),
         coalesce(array_agg(c.adjunto_archivo_id) FILTER (WHERE c.adjunto_archivo_id IS NOT NULL), ARRAY[]::uuid[])
    INTO ids, archivos_del_adjunto
    FROM core.correos_salientes c
    WHERE c.estado IN ('enviado', 'fallido', 'cancelado') AND c.contenido_depurado_en IS NULL
      AND c.creado_en < now() - make_interval(days => dias);
  UPDATE core.correos_salientes c
    SET cuerpo_texto = NULL, cuerpo_html = NULL, adjunto_archivo_id = NULL,
        contenido_depurado_en = now(), actualizado_en = now()
    WHERE c.id = ANY (ids);
  DELETE FROM core.archivos a WHERE a.id = ANY (archivos_del_adjunto);
  DELETE FROM core.correos_salientes c
    WHERE c.estado IN ('enviado', 'fallido', 'cancelado')
      AND c.creado_en < now() - make_interval(months => meses);
  GET DIAGNOSTICS borradas = ROW_COUNT;
  RETURN QUERY SELECT cardinality(ids), borradas;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION core.depurar_correos(integer, integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION core.depurar_correos(integer, integer) TO arrancar_app;
