-- Disparador genérico: al crear un registro con alcance, lo asigna a quien lo creó.
-- Uso (en la migración del módulo dueño, después de crear sus tablas):
--   create trigger asignar_al_creador after insert on <esquema>.<registros>
--     for each row execute function core.asignar_registro_al_creador('<esquema>.accesos_a_<registros>', '<columna>_id');
-- Corre como el dueño (`arrancar`), que no está sujeto a RLS porque las tablas usan `enable` y no
-- `force row level security`: si algún día se fuerza RLS, este disparador deja de funcionar.
-- Sin usuario en la transacción (migraciones, semillas) no hace nada; un superacceso que no es
-- miembro de la empresa tampoco queda asignado (ve todo por alcance total).
CREATE FUNCTION core.asignar_registro_al_creador() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  usuario uuid := nullif(current_setting('app.usuario_id', true), '')::uuid;
BEGIN
  IF usuario IS NULL THEN RETURN NULL; END IF;
  EXECUTE format(
    'insert into %s (empresa_id, usuario_id, %I, creado_por, actualizado_por)
     select $1, $2, $3, $2, $2
     where exists (select 1 from core.empresa_usuarios eu
                   where eu.empresa_id = $1 and eu.usuario_id = $2)
     on conflict do nothing',
    tg_argv[0]::regclass, tg_argv[1])
  USING new.empresa_id, usuario, new.id;
  RETURN NULL;
END $$;--> statement-breakpoint
REVOKE ALL ON FUNCTION core.asignar_registro_al_creador() FROM PUBLIC;
