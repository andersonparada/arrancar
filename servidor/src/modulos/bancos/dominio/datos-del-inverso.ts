import type { DatosDeMovimiento, PropiedadesDeMovimiento } from './propiedades-de-movimiento.js';

/** Lo que cambia el inverso de una partida de la carga inicial: otro concepto y, en el depósito, el pagador. */
export interface CambiosDelInverso {
  conceptoId: string;
  beneficiario: string | null;
}

const referenciaDeLaReversion = ({ referencia, fecha }: Readonly<PropiedadesDeMovimiento>): string => {
  const limpia = referencia?.trim();
  return limpia ? `Reversión de ${limpia}` : `Reversión de movimiento del ${fecha}`;
};

/** Los datos del movimiento contrario: crédito ↔ débito, mismo monto, en la fecha dada; `cambios` cambia concepto y beneficiario. */
export function datosDelInverso(
  original: Readonly<PropiedadesDeMovimiento>,
  fecha: string,
  cambios?: CambiosDelInverso,
): DatosDeMovimiento {
  return {
    cuentaBancariaId: original.cuentaBancariaId,
    tipo: original.tipo === 'credito' ? 'debito' : 'credito',
    fecha,
    monto: original.monto,
    saldoInicial: false,
    referencia: referenciaDeLaReversion(original),
    beneficiario: cambios ? cambios.beneficiario : original.beneficiario,
    observaciones: original.observaciones,
    conceptoId: cambios?.conceptoId ?? original.conceptoId,
  };
}
