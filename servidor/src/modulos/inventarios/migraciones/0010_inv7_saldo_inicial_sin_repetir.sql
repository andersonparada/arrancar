CREATE UNIQUE INDEX "movimientos_saldo_inicial_unico" ON "inventarios"."movimientos" USING btree ("empresa_id","articulo_id","bodega_id",coalesce("lote_id", '00000000-0000-0000-0000-000000000000'::uuid),"fecha_de_capa") WHERE "inventarios"."movimientos"."fecha_de_capa" is not null and "inventarios"."movimientos"."vigente";
--> statement-breakpoint
-- INV-7, PARA REVISION DE SEGURIDAD: igual que antes (misma empresa de la transaccion, sin parametros de empresa, sin leer ni
-- devolver datos), y ahora tambien mueve la fecha de las capas (`capas.fecha`, la que ordena PEPS) de los saldos iniciales
-- a la fecha de capa de su movimiento. Una capa de saldo inicial se reconoce por su movimiento de entrada.
CREATE OR REPLACE FUNCTION inventarios.reubicar_saldos_iniciales(nueva_fecha_de_inicio date)
RETURNS void
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, inventarios
AS $$
  UPDATE inventarios.movimientos
     SET fecha = nueva_fecha_de_inicio - 1,
         fecha_de_capa = CASE WHEN fecha_de_capa = fecha THEN nueva_fecha_de_inicio - 1
                              ELSE least(fecha_de_capa, nueva_fecha_de_inicio - 1) END
   WHERE empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid
     AND fecha_de_capa IS NOT NULL;
  UPDATE inventarios.documentos
     SET fecha = nueva_fecha_de_inicio - 1
   WHERE empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid
     AND clase = 'saldo_inicial';
  UPDATE inventarios.capas c
     SET fecha = m.fecha_de_capa
    FROM inventarios.movimientos m
   WHERE m.id = c.movimiento_de_entrada_id
     AND m.empresa_id = c.empresa_id
     AND c.empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid
     AND m.fecha_de_capa IS NOT NULL
     AND c.fecha <> m.fecha_de_capa;
$$;
