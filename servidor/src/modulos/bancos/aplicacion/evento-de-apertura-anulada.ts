import type { ParteQueSeAnula } from '../dominio/anulacion-de-apertura.js';
import { aCentavos } from '../dominio/centavos.js';
import { PartidaDeAperturaAnulada } from '../dominio/eventos-de-bancos.js';
import type { Movimiento } from '../dominio/movimiento.js';

/** Lo propio de cada clase de partida: el número del cheque y el pagador del depósito. */
export interface DetalleDeLaAnulacion {
  numeroDeCheque: number | null;
  pagador: string | null;
}

/**
 * El evento de una partida de apertura que ya se anuló: lo arma con el original (ya revertido) y su inverso. El inverso
 * lleva el pagador como beneficiario cuando es un depósito en tránsito.
 */
export function eventoDeAperturaAnulada(
  original: Movimiento,
  inverso: Movimiento,
  { numeroDeCheque, pagador }: DetalleDeLaAnulacion,
): PartidaDeAperturaAnulada {
  const datos = original.instantanea();
  return new PartidaDeAperturaAnulada({
    empresaId: datos.empresaId.valor,
    cuentaBancariaId: datos.cuentaBancariaId,
    movimientoId: datos.id.valor,
    inversoId: inverso.id.valor,
    parte: datos.parteDeApertura as ParteQueSeAnula,
    fecha: inverso.instantanea().fecha,
    montoCentavos: aCentavos(datos.monto),
    beneficiario: datos.beneficiario,
    numeroDeCheque,
    pagador,
    motivo: datos.motivoDeReversion ?? '',
  });
}
