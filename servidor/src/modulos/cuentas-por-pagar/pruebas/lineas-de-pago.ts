import type { LineaDePago } from '../dominio/pagos.js';

/** Una línea de pago sembrada: la forma `cuenta_de_apertura` no tiene movimiento en Bancos y cuenta igual. */
export function lineaDePago(cambios: Partial<LineaDePago> = {}): LineaDePago {
  return {
    pagoId: crypto.randomUUID(),
    numero: 1,
    anioDeNumero: 0,
    forma: 'cheque',
    fecha: '2026-06-01',
    estado: 'vigente',
    contrasenaId: 'contrasena',
    cargoId: 'cargo',
    montoCentavos: 1000,
    retencionDescontadaCentavos: 0,
    ...cambios,
  };
}
