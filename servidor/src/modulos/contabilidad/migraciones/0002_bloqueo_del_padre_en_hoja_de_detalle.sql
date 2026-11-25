-- CT-1: el disparador de la hoja de detalle bloquea la fila de la cuenta superior (FOR SHARE) antes de revisar si es de
-- detalle. Sin el bloqueo, quien inserta una hija y quien vuelve de detalle a la superior no se veían entre sí (la llave
-- foránea solo toma FOR KEY SHARE, compatible con el UPDATE) y podían confirmar ambos. Con él, uno espera al otro y el
-- segundo ve lo que el primero dejó confirmado.
CREATE OR REPLACE FUNCTION contabilidad.cuentas_hoja_de_detalle() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, contabilidad
AS $$
DECLARE
  padre_es_de_detalle boolean;
BEGIN
  IF NEW.padre_id IS NOT NULL THEN
    SELECT p.es_de_detalle INTO padre_es_de_detalle
    FROM contabilidad.cuentas p
    WHERE p.id = NEW.padre_id AND p.empresa_id = NEW.empresa_id
    FOR SHARE;
    IF padre_es_de_detalle THEN
      RAISE EXCEPTION 'Una cuenta de detalle no puede tener cuentas inferiores' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.es_de_detalle AND EXISTS (
    SELECT 1 FROM contabilidad.cuentas h
    WHERE h.padre_id = NEW.id AND h.empresa_id = NEW.empresa_id
  ) THEN
    RAISE EXCEPTION 'Una cuenta con cuentas inferiores no puede ser de detalle' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
