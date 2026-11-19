/** Por qué se recalculó el costo de un artículo (§5.14). */
export type CausaDeRecalculo =
  'registro_con_fecha_anterior' | 'anulacion' | 'saldo_inicial_corregido' | 'cambio_de_metodo';
