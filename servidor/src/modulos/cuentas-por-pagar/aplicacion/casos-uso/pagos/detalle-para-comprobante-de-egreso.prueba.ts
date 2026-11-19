import { describe, expect, it } from 'vitest';
import { operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import type { AplicacionDeLaFichaDto, FichaDePagoDto } from '../../dto/ficha-de-pago.dto.js';
import { DetalleParaComprobanteDeEgreso } from './detalle-para-comprobante-de-egreso.js';
import type { ArmadorDeLaFichaDelPago } from './ficha-del-pago.js';

const operador = operadorDePrueba();

const linea = (cambios: Partial<AplicacionDeLaFichaDto>): AplicacionDeLaFichaDto =>
  ({
    tipo: 'factura',
    serie: 'A',
    numero: '1001',
    monto: '1000.00',
    retencionDescontada: '0.00',
    retencionesDelLibro: [],
    ...cambios,
  }) as AplicacionDeLaFichaDto;

function detalle(pagos: Array<{ id: string; estado: 'vigente' | 'anulado' }>, aplicaciones: AplicacionDeLaFichaDto[]) {
  const armador = { armarDe: async () => ({ numero: '2026-15', aplicaciones }) as unknown as FichaDePagoDto };
  return new DetalleParaComprobanteDeEgreso({
    pagos: { delMovimiento: async () => pagos as never },
    armador: armador as unknown as ArmadorDeLaFichaDelPago,
  });
}

describe('el detalle del pago para el comprobante de egreso', () => {
  it('lleva el número del pago, cada documento y sus retenciones de IVA e ISR con su constancia', async () => {
    const caso = detalle(
      [{ id: 'p1', estado: 'vigente' }],
      [
        linea({
          retencionDescontada: '120.00',
          retencionesDelLibro: [
            { impuesto: 'iva', monto: '90.00', fecha: '2026-11-01', constanciaNumero: 'C-77', porEmitir: false },
            { impuesto: 'isr', monto: '30.00', fecha: '2026-11-01', constanciaNumero: null, porEmitir: true },
          ],
        }),
      ],
    );

    const resultado = await caso.ejecutar(operador, { movimientoId: 'm1' });

    expect(resultado).toEqual({
      pagoNumero: '2026-15',
      documentos: [
        {
          tipo: 'factura',
          serie: 'A',
          numero: '1001',
          montoCentavos: 100000,
          retenciones: [
            { impuesto: 'iva', montoCentavos: 9000, constanciaNumero: 'C-77' },
            { impuesto: 'isr', montoCentavos: 3000, constanciaNumero: null },
          ],
        },
      ],
      totalRetenidoCentavos: 12000,
    });
  });

  it('un documento donde este pago no descuenta retención sale sin retenciones', async () => {
    const caso = detalle(
      [{ id: 'p1', estado: 'vigente' }],
      [
        linea({
          retencionesDelLibro: [
            { impuesto: 'iva', monto: '90.00', fecha: '2026-11-01', constanciaNumero: null, porEmitir: true },
          ],
        }),
      ],
    );

    const resultado = await caso.ejecutar(operador, { movimientoId: 'm1' });

    expect(resultado?.documentos[0]?.retenciones).toEqual([]);
    expect(resultado?.totalRetenidoCentavos).toBe(0);
  });

  it('un movimiento sin pago de Cuentas por pagar no tiene detalle', async () => {
    expect(await detalle([], []).ejecutar(operador, { movimientoId: 'm1' })).toBeNull();
  });
});
