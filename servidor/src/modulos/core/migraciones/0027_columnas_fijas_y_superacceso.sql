-- R-1 (docs/modulos/diseno-rls-de-core.md): defensa en profundidad para las tablas de `core`.
-- Los privilegios por tabla y por columna de `arrancar_app` no van aquí: los aplica el migrador después de cada
-- `grant` (`core/base-datos/privilegios-restringidos.ts`). Aquí van los disparadores, que valen también para el dueño.

-- Columnas que no cambian nunca después de crear el registro. Los nombres llegan como argumentos del disparador.
CREATE FUNCTION core.proteger_columnas() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
  columna text;
BEGIN
  FOREACH columna IN ARRAY TG_ARGV LOOP
    IF to_jsonb(NEW) -> columna IS DISTINCT FROM to_jsonb(OLD) -> columna THEN
      RAISE EXCEPTION 'No se puede cambiar % de un registro de %', columna, TG_TABLE_NAME
        USING ERRCODE = 'check_violation', CONSTRAINT = TG_TABLE_NAME || '_columnas_fijas';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER empresas_columnas_fijas
BEFORE UPDATE ON core.empresas
FOR EACH ROW EXECUTE FUNCTION core.proteger_columnas('id', 'cuenta_id', 'creado_en', 'creado_por');
--> statement-breakpoint
CREATE TRIGGER roles_columnas_fijas
BEFORE UPDATE ON core.roles
FOR EACH ROW EXECUTE FUNCTION core.proteger_columnas('id', 'cuenta_id', 'creado_en');
--> statement-breakpoint
-- El superacceso (ve todas las cuentas) solo lo crea el dueño de la base, con la siembra: la aplicación nunca puede
-- crear ni volver superacceso a un usuario, aunque un error de programación lo intente.
CREATE FUNCTION core.proteger_superacceso() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF current_user = 'arrancar_app'
     AND NEW.es_superacceso
     AND (TG_OP = 'INSERT' OR NOT OLD.es_superacceso) THEN
    RAISE EXCEPTION 'Solo el dueño de la base de datos puede crear usuarios de superacceso'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER usuarios_proteger_superacceso
BEFORE INSERT OR UPDATE ON core.usuarios
FOR EACH ROW EXECUTE FUNCTION core.proteger_superacceso();
