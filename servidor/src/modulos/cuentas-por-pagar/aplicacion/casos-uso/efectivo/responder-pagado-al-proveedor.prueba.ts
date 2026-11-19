import { describe, expect, it } from 'vitest';
import type { PagoDelMes } from '../../puertos/puertos-de-pagos.js';
import { ResponderPagadoAlProveedor } from './responder-pagado-al-proveedor.js';

const pago = (cambios: Partial<PagoDelMes>): PagoDelMes => ({
  numero: 1,
  anioDeNumero: 2026,
  forma: 'cheque',
  montoCentavos: 100_000,
  cargoIds: [],
  ...cambios,
});

const responder = (pagos: PagoDelMes[]) => {
  const pedidos: Array<[string, string]> = [];
  const caso = new ResponderPagadoAlProveedor({
    pagosDelMes: async (proveedorId, mes) => {
      pedidos.push([proveedorId, mes]);
      return pagos;
    },
  });
  return { caso, pedidos };
};

describe('ResponderPagadoAlProveedor', () => {
  it('separa el efectivo de lo bancarizado y etiqueta cada pago', async () => {
    const { caso, pedidos } = responder([
      pago({ numero: 7, forma: 'efectivo', montoCentavos: 250_000 }),
      pago({ numero: 8, forma: 'cheque', montoCentavos: 400_000 }),
      pago({ numero: 9, forma: 'nota_de_debito', montoCentavos: 50_000 }),
    ]);

    const respuesta = await caso.ejecutar({ proveedorId: 'p1', mes: '2026-11-01' });

    expect(pedidos).toEqual([['p1', '2026-11-01']]);
    expect(respuesta).toEqual({
      efectivoCentavos: 250_000,
      bancarizadoCentavos: 450_000,
      comprobantes: ['Recibo 7/2026', 'Recibo 8/2026', 'Recibo 9/2026'],
    });
  });

  it('sin pagos responde con ceros (no calla)', async () => {
    const { caso } = responder([]);

    expect(await caso.ejecutar({ proveedorId: 'p1', mes: '2026-11-01' })).toEqual({
      efectivoCentavos: 0,
      bancarizadoCentavos: 0,
      comprobantes: [],
    });
  });
});
