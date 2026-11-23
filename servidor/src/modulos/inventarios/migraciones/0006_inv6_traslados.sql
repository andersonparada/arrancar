ALTER TABLE "inventarios"."documentos" DROP CONSTRAINT "documentos_clase_valida";--> statement-breakpoint
ALTER TABLE "inventarios"."documentos" ADD COLUMN "bodega_de_destino_id" uuid;--> statement-breakpoint
ALTER TABLE "inventarios"."documentos" ADD COLUMN "estado_de_traslado" text;--> statement-breakpoint
ALTER TABLE "inventarios"."documentos" ADD CONSTRAINT "documentos_bodega_destino_fk" FOREIGN KEY ("bodega_de_destino_id","empresa_id") REFERENCES "inventarios"."bodegas"("id","empresa_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "documentos_bodega_destino_idx" ON "inventarios"."documentos" USING btree ("bodega_de_destino_id") WHERE "inventarios"."documentos"."bodega_de_destino_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "documentos_recepcion_de_traslado_unica" ON "inventarios"."documentos" USING btree ("documento_relacionado_id") WHERE "inventarios"."documentos"."clase" = 'entrada_de_traslado' and "inventarios"."documentos"."estado" = 'vigente';--> statement-breakpoint
ALTER TABLE "inventarios"."documentos" ADD CONSTRAINT "documentos_traslado_destino_segun_clase" CHECK (("inventarios"."documentos"."clase" = 'salida_de_traslado') = ("inventarios"."documentos"."bodega_de_destino_id" is not null));--> statement-breakpoint
ALTER TABLE "inventarios"."documentos" ADD CONSTRAINT "documentos_traslado_estado_segun_clase" CHECK (("inventarios"."documentos"."clase" = 'salida_de_traslado') = ("inventarios"."documentos"."estado_de_traslado" is not null));--> statement-breakpoint
ALTER TABLE "inventarios"."documentos" ADD CONSTRAINT "documentos_traslado_estado_valido" CHECK ("inventarios"."documentos"."estado_de_traslado" is null or "inventarios"."documentos"."estado_de_traslado" in ('en_transito', 'recibido'));--> statement-breakpoint
ALTER TABLE "inventarios"."documentos" ADD CONSTRAINT "documentos_traslado_a_otra_bodega" CHECK ("inventarios"."documentos"."bodega_de_destino_id" is null or "inventarios"."documentos"."bodega_de_destino_id" <> "inventarios"."documentos"."bodega_id");--> statement-breakpoint
ALTER TABLE "inventarios"."documentos" ADD CONSTRAINT "documentos_recepcion_ligada" CHECK ("inventarios"."documentos"."clase" <> 'entrada_de_traslado' or "inventarios"."documentos"."documento_relacionado_id" is not null);--> statement-breakpoint
ALTER TABLE "inventarios"."documentos" ADD CONSTRAINT "documentos_clase_valida" CHECK ("inventarios"."documentos"."clase" in ('entrada_manual', 'salida_por_consumo', 'recepcion_de_compra', 'devolucion_a_proveedor', 'rebaja_de_costo', 'salida_de_traslado', 'entrada_de_traslado'));--> statement-breakpoint
ALTER POLICY "alcance_inventarios_bodegas" ON "inventarios"."documentos" TO arrancar_app USING (bodega_id is null or ('inventarios.bodegas' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or bodega_id in (
      select a.bodega_id from inventarios.accesos_a_bodegas a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    ))
    or ('inventarios.bodegas' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or bodega_de_destino_id in (
      select a.bodega_id from inventarios.accesos_a_bodegas a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    ))) WITH CHECK (bodega_id is null or ('inventarios.bodegas' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or bodega_id in (
      select a.bodega_id from inventarios.accesos_a_bodegas a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    ))
    or ('inventarios.bodegas' = any (string_to_array((select current_setting('app.alcance_total', true)), ','))
    or bodega_de_destino_id in (
      select a.bodega_id from inventarios.accesos_a_bodegas a
      where a.empresa_id = (select nullif(current_setting('app.empresa_id', true), '')::uuid)
        and a.usuario_id = (select nullif(current_setting('app.usuario_id', true), '')::uuid)
    )));--> statement-breakpoint
-- INV-6, PARA REVISION DE SEGURIDAD: quien envia un traslado con transito solo ve la bodega de origen, pero debe poder
-- elegir el destino y ver su nombre (en la boleta). Esta funcion da solo el id, el nombre y si esta activa de las
-- bodegas de la empresa activa (app.empresa_id, nunca un parametro), sin el alcance de bodegas: ni responsable, ni
-- localidad, ni existencias, ni accesos. Corre con los permisos del dueño de la tabla (la RLS no lo alcanza).
CREATE FUNCTION inventarios.nombres_de_bodegas(ids uuid[] DEFAULT NULL)
RETURNS TABLE (id uuid, nombre text, activo boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, inventarios
AS $$
  SELECT b.id, b.nombre, b.activo
  FROM inventarios.bodegas b
  WHERE b.empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid
    AND (ids IS NULL OR b.id = ANY (ids));
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION inventarios.nombres_de_bodegas(uuid[]) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION inventarios.nombres_de_bodegas(uuid[]) TO arrancar_app;
