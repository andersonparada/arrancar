-- Quitar el rol de cada empresa (docs/modulos/diseno-permisos-por-usuario.md, P4).
-- Guarda: aborta si algun rol de empresa no esta ya en `usuario_roles` (la 0017 los copio).
DO $$
DECLARE faltan integer;
BEGIN
  SELECT count(*) INTO faltan
  FROM core.empresa_usuarios eu
  JOIN core.empresas e ON e.id = eu.empresa_id
  WHERE eu.rol_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM core.usuario_roles ur
      WHERE ur.cuenta_id = e.cuenta_id AND ur.usuario_id = eu.usuario_id AND ur.rol_id = eu.rol_id
    );
  IF faltan > 0 THEN
    RAISE EXCEPTION 'Hay % roles de empresa que no estan en core.usuario_roles; no se puede quitar rol_id', faltan;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "core"."empresa_usuarios" DROP CONSTRAINT "empresa_usuarios_rol_id_roles_id_fk";
--> statement-breakpoint
ALTER TABLE "core"."empresa_usuarios" DROP COLUMN "rol_id";