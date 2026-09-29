DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM core.accesos_datos) THEN
    RAISE EXCEPTION 'core.accesos_datos tiene filas: revisar antes de quitarla';
  END IF;
END $$;--> statement-breakpoint
DROP POLICY "aislamiento_por_empresa" ON "core"."accesos_datos" CASCADE;--> statement-breakpoint
DROP TABLE "core"."accesos_datos" CASCADE;