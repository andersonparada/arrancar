import { getTableColumns, sql } from 'drizzle-orm';
import type { MovimientoDelKardex } from '../../dominio/costeo/movimientos-del-kardex.js';
import { aCentavosEnteros, aDiezmilesimas, aMillonesimas } from '../../dominio/decimales.js';
import { movimientos } from './movimientos.tablas.js';
import { repartosDeCosto } from './repartos-de-costo.tablas.js';

type FilaDeMovimiento = typeof movimientos.$inferSelect & { parteDeReparto?: string | null };

/**
 * Las columnas del movimiento más lo que le toca de un reparto (nulo si no es de una rebaja): el monto fijo que el
 * recálculo reparte entre absorbido y resultados.
 */
export const columnasConReparto = () => ({
  ...getTableColumns(movimientos),
  parteDeReparto: sql<string | null>`(select ${repartosDeCosto.monto} from ${repartosDeCosto}
    where ${repartosDeCosto.documentoId} = ${movimientos.documentoId}
      and ${repartosDeCosto.movimientoDeEntradaId} = ${movimientos.movimientoDeOrigenId})`,
});

/** Pasa una fila de `inventarios.movimientos` (numeric como texto) a enteros, sin coma flotante. */
export function aMovimientoDelKardex(fila: FilaDeMovimiento): MovimientoDelKardex {
  return {
    id: fila.id,
    documentoId: fila.documentoId,
    articuloId: fila.articuloId,
    bodegaId: fila.bodegaId,
    loteId: fila.loteId,
    fecha: fila.fecha,
    secuencia: fila.secuencia,
    tipo: fila.tipo,
    cantidad: aDiezmilesimas(fila.cantidad),
    costoTotal: aCentavosEnteros(fila.costoTotal),
    costoUnitario: aMillonesimas(fila.costoUnitario),
    costoDelMetodo: fila.costoDelMetodo,
    saldoCantidad: aDiezmilesimas(fila.saldoCantidad),
    saldoValor: aCentavosEnteros(fila.saldoValor),
    montoAResultados: aCentavosEnteros(fila.montoAResultados),
    movimientoDeOrigenId: fila.movimientoDeOrigenId,
    lineaDeCompraId: fila.lineaDeDocumentoDeCompraId,
    documentoDeCompraId: fila.documentoDeCompraId,
    parteDeReparto: fila.parteDeReparto ? aCentavosEnteros(fila.parteDeReparto) : null,
    fechaDeCapa: fila.fechaDeCapa,
    vigente: fila.vigente,
  };
}
