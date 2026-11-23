-- INV-7, PARA REVISION DE SEGURIDAD: cuando Empresas cambia la fecha de inicio con la carga abierta, los documentos de
-- saldo inicial pasan al nuevo dia anterior (§8). Esos documentos llevan el alcance por bodega, y quien cambia la fecha
-- puede no ver todas las bodegas: un UPDATE normal dejaria sin mover los de las bodegas ajenas. Esta funcion mueve los
-- saldos iniciales de UNA empresa, la de la transaccion (app.empresa_id, nunca un parametro), y nada mas: ni lee ni
-- devuelve datos. Los movimientos de saldo inicial son los que tienen fecha_de_capa; los que ya no estan vigentes
-- (renglones corregidos) tambien se mueven para no romper el check de la fecha de la capa. La capa que era el dia del
-- saldo (la que no traia fecha propia) se mueve con el; una con fecha propia solo baja si hace falta. Corre con los permisos del
-- dueño de la tabla; solo la llama el aviso de la fecha de inicio, despues de revisar que no haya conflictos.
CREATE FUNCTION inventarios.reubicar_saldos_iniciales(nueva_fecha_de_inicio date)
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
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION inventarios.reubicar_saldos_iniciales(date) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION inventarios.reubicar_saldos_iniciales(date) TO arrancar_app;
