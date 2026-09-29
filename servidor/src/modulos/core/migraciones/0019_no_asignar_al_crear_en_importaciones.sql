-- El disparador de asignar al creador respeta `app.sin_asignar_al_crear` (docs/modulos/diseno-permisos-por-usuario.md, L1):
-- al importar desde Excel los registros quedan sin asignar y se reparten desde la ventana de accesos.
-- Igual que la 0014 en lo demas: corre como el dueño (sin RLS) y no hace nada sin usuario en la transaccion.
CREATE OR REPLACE FUNCTION core.asignar_registro_al_creador() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  usuario uuid := nullif(current_setting('app.usuario_id', true), '')::uuid;
BEGIN
  IF usuario IS NULL THEN RETURN NULL; END IF;
  IF coalesce(current_setting('app.sin_asignar_al_crear', true), '') = 'on' THEN RETURN NULL; END IF;
  EXECUTE format(
    'insert into %s (empresa_id, usuario_id, %I, creado_por, actualizado_por)
     select $1, $2, $3, $2, $2
     where exists (select 1 from core.empresa_usuarios eu
                   where eu.empresa_id = $1 and eu.usuario_id = $2)
     on conflict do nothing',
    tg_argv[0]::regclass, tg_argv[1])
  USING new.empresa_id, usuario, new.id;
  RETURN NULL;
END $$;
