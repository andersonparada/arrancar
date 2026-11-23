import { deCentavos } from '../../core/compartido/dominio/centavos.js';
import { montoLegible } from '../../core/compartido/dominio/monto-legible.js';
import type { HallazgoDeCierre } from '../../core/contratos/empresas.contratos.js';
import type { PosfechadosSinLigar } from './puertos/consultas-de-saldos-iniciales.js';

/**
 * El aviso de cierre por los cheques posfechados de apertura que ningún pago de Cuentas por pagar ha ligado (AP-0): sus
 * facturas del saldo inicial siguen pendientes y se podrían pagar otra vez. No pide motivo porque no cambia ningún saldo
 * al corte.
 * @returns `null` si no hay posfechados sin ligar.
 */
export function hallazgoDePosfechadosSinLigar({
  cantidad,
  totalCentavos,
}: PosfechadosSinLigar): HallazgoDeCierre | null {
  if (cantidad === 0) return null;
  const cheques = cantidad === 1 ? '1 cheque posfechado' : `${cantidad} cheques posfechados`;
  const total = montoLegible(deCentavos(totalCentavos));
  return {
    codigo: 'posfechados_sin_ligar',
    nivel: 'aviso',
    mensaje: `Hay ${cheques} de apertura sin ligar (${total}): no pague otra vez las facturas que cubren; en Cuentas por pagar, líguelas al cheque con «Cheque de apertura».`,
    registro: null,
  };
}
