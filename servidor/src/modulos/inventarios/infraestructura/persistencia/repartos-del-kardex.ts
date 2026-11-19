import { sql } from 'drizzle-orm';
import { deLaTransaccion } from '../../../core/base-datos/columnas.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { NuevoMovimiento } from '../../aplicacion/puertos/almacen-del-kardex.js';
import type { MovimientoDelKardex } from '../../dominio/costeo/movimientos-del-kardex.js';
import { deCentavosEnteros } from '../../dominio/decimales.js';
import type { BaseDeReparto } from '../../dominio/rebaja.js';
import { repartosDeCosto } from './repartos-de-costo.tablas.js';

/**
 * Guarda el reparto de cada movimiento de valor recién agregado (en el mismo orden que `nuevos`). Nace con todo a
 * resultados: el recálculo que sigue deja `absorbido` y `a_resultados` donde corresponde.
 */
export async function agregarRepartosDe(
  nuevos: readonly NuevoMovimiento[],
  agregados: readonly MovimientoDelKardex[],
): Promise<void> {
  const filas = nuevos.flatMap((nuevo, indice) => {
    if (!nuevo.reparto || !nuevo.movimientoDeOrigenId) return [];
    const monto = deCentavosEnteros(nuevo.reparto.parte);
    return [
      {
        empresaId: deLaTransaccion.empresa(),
        documentoId: agregados[indice]!.documentoId,
        movimientoDeEntradaId: nuevo.movimientoDeOrigenId,
        baseDelReparto: nuevo.reparto.base as BaseDeReparto,
        monto,
        absorbido: '0',
        aResultados: monto,
      },
    ];
  });
  if (filas.length > 0) await transaccionEnCurso().insert(repartosDeCosto).values(filas);
}

/** El reparto de los movimientos de valor que se recalcularon vuelve a ser igual a lo que dice su movimiento. */
export async function sincronizarRepartosDe(movimientoIds: readonly string[]): Promise<void> {
  if (movimientoIds.length === 0) return;
  const ids = sql.join(
    movimientoIds.map((id) => sql`${id}::uuid`),
    sql`, `,
  );
  await transaccionEnCurso().execute(sql`
    update inventarios.repartos_de_costo as r
       set absorbido = m.costo_total, a_resultados = m.monto_a_resultados, actualizado_en = now(),
           actualizado_por = nullif(current_setting('app.usuario_id', true), '')::uuid
      from inventarios.movimientos as m
     where m.id in (${ids}) and m.tipo = 'valor' and m.vigente
       and r.documento_id = m.documento_id and r.movimiento_de_entrada_id = m.movimiento_de_origen_id`);
}
