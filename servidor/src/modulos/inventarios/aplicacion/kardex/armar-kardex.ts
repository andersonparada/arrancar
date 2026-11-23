import { costoUnitarioDe, valorDe } from '../../dominio/costeo/escalas.js';
import { deCentavosEnteros, deDiezmilesimas, deMillonesimas } from '../../dominio/decimales.js';
import type { RenglonDeKardexDto } from '../dto/existencia.dto.js';
import type { FilaDeKardex } from '../puertos/consultas-del-kardex.js';

export interface OpcionesDelKardex {
  /** El kardex de una bodega lleva su propio saldo; el de la empresa, el de toda ella (solo con alcance total). */
  porBodega: boolean;
  verCostos: boolean;
  desde?: string;
  hasta?: string;
}

const magnitud = (valor: bigint): bigint => (valor < 0n ? -valor : valor);

const dentro = (fecha: string, { desde, hasta }: OpcionesDelKardex): boolean =>
  (!desde || fecha >= desde) && (!hasta || fecha <= hasta);

/** El costo unitario de la empresa en la posición de la fila: un precio, no una cantidad (no revela otras bodegas). */
function costoUnitarioDeLaFila(fila: FilaDeKardex): bigint {
  return fila.saldoCantidad > 0n ? costoUnitarioDe(fila.saldoValor, fila.saldoCantidad) : 0n;
}

function renglon(fila: FilaDeKardex, saldoCantidad: bigint, opciones: OpcionesDelKardex): RenglonDeKardexDto {
  const conCostoPropio = opciones.verCostos && fila.tipo !== 'traslado';
  const unitario = costoUnitarioDeLaFila(fila);
  const saldoValor = opciones.porBodega ? valorDe(unitario, saldoCantidad) : fila.saldoValor;
  return {
    movimientoId: fila.movimientoId,
    documentoId: fila.documentoId,
    clase: fila.clase,
    numeroDeDocumento: fila.numeroDeDocumento,
    fecha: fila.fecha,
    bodegaId: fila.bodegaId,
    bodegaNombre: fila.bodegaNombre,
    loteCodigo: fila.loteCodigo,
    tipo: fila.tipo,
    entrada: fila.cantidad > 0n ? deDiezmilesimas(fila.cantidad) : null,
    salida: fila.cantidad < 0n ? deDiezmilesimas(magnitud(fila.cantidad)) : null,
    saldoCantidad: deDiezmilesimas(saldoCantidad),
    costoUnitario: conCostoPropio ? deMillonesimas(fila.costoUnitario) : null,
    costoTotal: conCostoPropio ? deCentavosEnteros(fila.costoTotal) : null,
    saldoValor: opciones.verCostos ? deCentavosEnteros(saldoValor) : null,
  };
}

/**
 * Arma el kardex que se muestra (§13). **Por bodega**, el saldo es una suma acumulada de las cantidades de esa bodega
 * en el orden del kardex (con las mitades de traslado), calculada aquí con los movimientos que el usuario ve: nunca se
 * usa el saldo de la empresa, que revelaría lo que hay en otras bodegas. Con costos, el valor de la bodega es su
 * cantidad por el costo unitario de la empresa en esa posición. **De la empresa**, se usan los saldos guardados.
 * Las filas llegan ordenadas; el saldo acumulado cuenta también lo anterior a `desde`.
 */
export function armarKardex(filas: readonly FilaDeKardex[], opciones: OpcionesDelKardex): RenglonDeKardexDto[] {
  const renglones: RenglonDeKardexDto[] = [];
  let acumulado = 0n;
  for (const fila of filas) {
    acumulado += fila.cantidad;
    const saldo = opciones.porBodega ? acumulado : fila.saldoCantidad;
    if (dentro(fila.fecha, opciones)) renglones.push(renglon(fila, saldo, opciones));
  }
  return renglones;
}
