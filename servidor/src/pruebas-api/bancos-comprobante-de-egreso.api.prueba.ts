/** IC-5: el comprobante de egreso con el detalle del pago de Cuentas por pagar y sus retenciones. */
import { beforeAll, describe, expect, it } from 'vitest';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { movimientoDe } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
let e: EscenarioDePagos;

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'icegreso');
  await e.propietario().patch(`/api/bancos/chequeras/${e.chequeraId}/formato`, {
    formatoDeChequeId: null,
    plantillaDeCheque: 'cheque_suelto',
  });
});

/** Paga con cheque y devuelve la vista del comprobante de ese cheque. */
async function comprobanteDeUnPago(monto: string) {
  const { proveedor, cargo } = await e.proveedorConCargo('5600.00');
  const pago = await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto }]));
  expect(pago.estado, JSON.stringify(pago.cuerpo)).toBe(201);
  const movimiento = await movimientoDe(e.propietario(), pago.cuerpo.movimiento.id);
  const vista = await e.propietario().get(`/api/bancos/cheques/impresion?ids=${movimiento.chequeId}`);
  expect(vista.estado, JSON.stringify(vista.cuerpo)).toBe(200);
  return {
    pago: pago.cuerpo,
    comprobante: vista.cuerpo.cheques[0].comprobante,
    chequeId: movimiento.chequeId as string,
  };
}

describe('el comprobante de egreso de un cheque de Cuentas por pagar', () => {
  it('trae el pago, sus documentos y las retenciones con el total retenido', async () => {
    const { pago, comprobante } = await comprobanteDeUnPago('1000.00');

    expect(comprobante.origen.descripcion).toBe(`Pago ${pago.numero} de Cuentas por pagar`);
    const [documento] = comprobante.origen.documentos;
    expect(documento).toMatchObject({ monto: '1000.00' });
    expect(documento.numero).toBeTruthy();
    const impuestos = documento.retenciones.map((r: { impuesto: string }) => r.impuesto).sort();
    expect(impuestos).toContain('iva');
    expect(Number(comprobante.origen.totalRetenido)).toBeGreaterThan(0);
    const suma = documento.retenciones.reduce((total: number, r: { monto: string }) => total + Number(r.monto), 0);
    expect(Number(comprobante.origen.totalRetenido)).toBeCloseTo(suma, 2);
    expect(comprobante.cheque).toMatchObject({ monto: '1000.00', concepto: 'Pago a proveedores' });
  });

  it('el segundo pago del mismo documento ya no descuenta retenciones', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo('5600.00');
    await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '1000.00' }]));
    const segundo = await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '500.00' }]));
    const movimiento = await movimientoDe(e.propietario(), segundo.cuerpo.movimiento.id);

    const vista = await e.propietario().get(`/api/bancos/cheques/impresion?ids=${movimiento.chequeId}`);

    const origen = vista.cuerpo.cheques[0].comprobante.origen;
    expect(origen.documentos[0]).toMatchObject({ monto: '500.00', retenciones: [] });
    expect(origen.totalRetenido).toBe('0.00');
  });

  it('con Cuentas por pagar inactivo sale «Pago de Cuentas por pagar» sin detalle', async () => {
    const { chequeId } = await comprobanteDeUnPago('800.00');
    const url = `/api/plataforma/cuentas/${e.mundo.escenario.cuenta.cuentaId}/modulos/cuentas-por-pagar`;
    await entorno.soporte.delete(url);
    try {
      const vista = await e.propietario().get(`/api/bancos/cheques/impresion?ids=${chequeId}`);

      expect(vista.estado, JSON.stringify(vista.cuerpo)).toBe(200);
      expect(vista.cuerpo.cheques[0].comprobante.origen).toEqual({
        modulo: 'cuentas-por-pagar',
        descripcion: 'Pago de Cuentas por pagar',
        documentos: [],
        totalRetenido: null,
      });
    } finally {
      await entorno.soporte.put(url);
    }
  });
});
