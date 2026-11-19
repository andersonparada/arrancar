import type { MovimientoDelKardex } from '../../dominio/costeo/movimientos-del-kardex.js';
import { aCentavosEnteros, aDiezmilesimas, aMillonesimas } from '../../dominio/decimales.js';
import type { movimientos } from './movimientos.tablas.js';

/** Pasa una fila de `inventarios.movimientos` (numeric como texto) a enteros, sin coma flotante. */
export function aMovimientoDelKardex(fila: typeof movimientos.$inferSelect): MovimientoDelKardex {
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
  };
}
