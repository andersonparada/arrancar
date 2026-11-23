-- CT-1: una cuenta de detalle recibe movimientos, así que no puede tener cuentas inferiores. El dominio lo revisa
-- primero; este disparador lo deja garantizado en la base aunque el código falle (§5.10 del diseño). Corre con los
-- permisos de quien escribe (security invoker), es decir con RLS: solo ve las cuentas de la empresa activa.
CREATE OR REPLACE FUNCTION contabilidad.cuentas_hoja_de_detalle() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, contabilidad
AS $$
BEGIN
  IF NEW.padre_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM contabilidad.cuentas p
    WHERE p.id = NEW.padre_id AND p.empresa_id = NEW.empresa_id AND p.es_de_detalle
  ) THEN
    RAISE EXCEPTION 'Una cuenta de detalle no puede tener cuentas inferiores' USING ERRCODE = 'check_violation';
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
--> statement-breakpoint
CREATE TRIGGER cuentas_hoja_de_detalle
BEFORE INSERT OR UPDATE OF padre_id, es_de_detalle ON contabilidad.cuentas
FOR EACH ROW EXECUTE FUNCTION contabilidad.cuentas_hoja_de_detalle();
--> statement-breakpoint
-- La auditoría de la nomenclatura y del inicio no se depura mientras exista la empresa (catálogo de la migración 0024
-- del core): C. Com. arts. 368, 373 y 376; C. Trib. arts. 47 y 112. Las demás tablas de Contabilidad la suman con sus
-- pasos. Corre como dueño, así que puede escribir en el catálogo del core.
INSERT INTO "core"."recursos_de_auditoria_permanente" ("recurso", "motivo")
VALUES
  ('contabilidad.cuentas', 'La nomenclatura contable respalda los libros mientras no prescriba la obligación (C. Com. arts. 368, 373 y 376; C. Trib. arts. 47 y 112)'),
  ('contabilidad.inicio', 'La fecha de inicio contable fija desde cuándo valen los libros (C. Com. arts. 368, 373 y 376; C. Trib. arts. 47 y 112)')
ON CONFLICT DO NOTHING;
