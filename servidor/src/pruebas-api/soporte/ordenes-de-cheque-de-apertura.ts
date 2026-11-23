import { expect } from 'vitest';
import type { Operador } from '../../modulos/core/compartido/aplicacion/operador.js';
import '../../modulos/core/contratos/bancos.contratos.js';
import { mediador } from '../../modulos/core/mediador/contexto.js';
import { guardarSaldo } from './apertura-por-api.js';
import type { ClienteApi } from './cliente-api.js';
import { crearCuentaSinSaldo } from './escenarios-de-apertura.js';
import { crearPosfechadoDeApertura } from './posfechados-de-apertura.js';

type Origen = { modulo: string; documentoId: string };

export const nuevoOrigen = (): Origen => ({ modulo: 'cuentas-por-pagar', documentoId: crypto.randomUUID() });
export type LineaDePago = { claveDeSistema: 'pago_a_proveedor' | 'pago_a_proveedor_de_activo'; montoCentavos: number };
export const pago = (montoCentavos: number): LineaDePago[] => [{ claveDeSistema: 'pago_a_proveedor', montoCentavos }];

interface Pedido {
  movimientoId: string;
  origen?: Origen;
  montoCentavos?: number;
  beneficiarioEsperado?: string;
  conceptos?: LineaDePago[];
}

/** Las dos órdenes de AP-2 tal como las llamaría Cuentas por pagar; el operador se pide al usarlas. */
export function ordenesDeChequeDeApertura(operador: () => Operador) {
  return {
    ligar: ({ movimientoId, ...cambios }: Pedido) =>
      mediador.enviar(operador(), 'bancos.ligar_cheque_de_apertura', {
        origen: nuevoOrigen(),
        movimientoId,
        montoCentavos: 10000,
        beneficiarioEsperado: 'Proveedor Uno',
        conceptos: pago(10000),
        ...cambios,
      }),
    desligar: (movimientoId: string, pedido: { origen: Origen; motivo?: string }) =>
      mediador.enviar(operador(), 'bancos.desligar_cheque_de_apertura', {
        movimientoId,
        motivo: 'Se ligó a la factura equivocada',
        ...pedido,
      }),
  };
}

/** Una cuenta con saldo del banco de 1,000.00 y un posfechado de 100.00 a nombre de «Proveedor Uno». */
export async function cuentaConPosfechado(
  usuario: ClienteApi,
  cambios: { monto?: string; beneficiario?: string } = {},
) {
  const cuentaId = await crearCuentaSinSaldo(usuario);
  expect((await guardarSaldo(usuario, cuentaId, '1000.00')).estado).toBe(200);
  const movimientoId = await crearPosfechadoDeApertura(usuario, cuentaId, {
    monto: cambios.monto ?? '100.00',
    beneficiario: cambios.beneficiario ?? 'Proveedor Uno',
  });
  return { cuentaId, movimientoId };
}
