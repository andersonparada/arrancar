/**
 * El comprobante de pago (CP4-8): la empresa que da Empresas, los documentos por contraseña con su retención y su
 * constancia o «por emitir», el total en números y en letras, las leyendas de que no es documento tributario, original y
 * copia, y el «Recibo de pago en efectivo» con el custodio y las firmas «Entregado por» y «Recibí conforme».
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { anularPago } from './soporte/cuentas-por-pagar-pagos-cambios.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { sembrarPago } from './soporte/cuentas-por-pagar-pagos.js';
import { registrarRetiro, retiroConCheque, sembrarPagoDelRetiro } from './soporte/cuentas-por-pagar-retiros.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, haceDias, HOY } from './soporte/escenario-de-documentos.js';
import { filasDelDocumento, reporteDelMes, RUTA_RETENCIONES } from './soporte/escenario-de-retenciones.js';

const entorno = usarEntornoApi();
const RUTA = '/api/cuentas-por-pagar/pagos';
let e: EscenarioDePagos;

const comprobante = async (id: string) => {
  const respuesta = await e.propietario().get(`${RUTA}/${id}/comprobante`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo;
};

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxppagoscomprobante');
});

async function anotarConstancias(cargoId: string): Promise<void> {
  const [documento] = await consultar<{ documento_id: string; fecha_emision: string }>(
    'select documento_id, fecha_emision::text from cuentas_por_pagar.documentos where id = $1',
    [cargoId],
  );
  const reporte = await reporteDelMes(e.propietario(), documento!.fecha_emision);
  for (const [indice, fila] of filasDelDocumento(reporte, documento!.documento_id).entries()) {
    await e.propietario().put(`${RUTA_RETENCIONES}/${fila.id}/constancia`, { numero: `K-${indice + 1}`, fecha: HOY });
  }
}

describe('el comprobante de un cheque', () => {
  it('trae la empresa, el proveedor, el cheque, el total en letras, las leyendas y las firmas', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const pago = (await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '1120.00' }]))).cuerpo;

    const hoja = await comprobante(pago.id);

    expect(hoja).toMatchObject({
      titulo: 'Comprobante de pago con cheque',
      esReciboDeEfectivo: false,
      hojas: ['Original', 'Copia'],
      beneficiario: pago.beneficiario,
      proveedor: { id: proveedor.proveedorId },
      pago: { numero: pago.numero, forma: 'cheque', fecha: HOY, posfechado: false, estado: 'vigente' },
      medio: { cuentaBancariaNombre: 'Cuenta de pagos', tipo: 'cheque', numero: pago.movimiento.numero },
      retiro: null,
      totalPagado: '1120.00',
      totalEnLetras: 'Mil ciento veinte quetzales con 00/100',
      leyendas: ['Las retenciones se documentan con su constancia.', 'Este comprobante no es un documento tributario.'],
      firmas: {
        entrega: { rotulo: 'Entregado por (empresa)', nombre: null },
        recibe: { rotulo: expect.stringMatching(/^Recibí conforme/), nombre: null },
      },
    });
    expect(hoja.empresa.nombre).toEqual(expect.any(String));
    expect(hoja.empresa.nombre.length).toBeGreaterThan(0);
  });

  it('agrupa los documentos por contraseña con lo pagado y el saldo de cada uno', async () => {
    const proveedor = await e.mundo.unProveedor();
    const [uno, dos, tres] = [
      await e.cargoAutorizado(proveedor),
      await e.cargoAutorizado(proveedor, '500.00'),
      await e.cargoAutorizado(proveedor, '300.00'),
    ];
    const [k1, k2] = [await e.contrasena(proveedor, [uno, tres]), await e.contrasena(proveedor, [dos])];
    const pago = (
      await e.pagar(
        e.cheque(proveedor.proveedorId, [
          { cargoId: uno, monto: '1000.00' },
          { cargoId: dos, monto: '500.00' },
          { cargoId: tres, monto: '300.00' },
        ]),
      )
    ).cuerpo;

    const hoja = await comprobante(pago.id);

    expect(hoja.contrasenas.map((c: { id: string }) => c.id).sort()).toEqual([k1, k2].sort());
    const primera = hoja.contrasenas.find((c: { id: string }) => c.id === k1);
    expect(primera).toMatchObject({ pagado: '1300.00' });
    expect(primera.documentos).toHaveLength(2);
    expect(primera.documentos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ documentoId: uno, pagado: '1000.00', saldo: '120.00', total: '1120.00' }),
        expect.objectContaining({ documentoId: tres, pagado: '300.00', saldo: '0.00' }),
      ]),
    );
    expect(hoja).toMatchObject({ totalPagado: '1800.00', totalEnLetras: 'Mil ochocientos quetzales con 00/100' });
  });

  it('la retención del primer pago sale «por emitir» y luego con su constancia; el segundo pago no la repite', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo('5600.00');
    const primero = (await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '1000.00' }]))).cuerpo;
    const segundo = (await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '500.00' }]))).cuerpo;

    const antes = (await comprobante(primero.id)).contrasenas[0].documentos[0];
    expect(Number(antes.retencionDescontada)).toBeGreaterThan(0);
    expect(antes.constancias.length).toBeGreaterThan(0);
    expect(antes.constancias.every((c: { porEmitir: boolean }) => c.porEmitir)).toBe(true);
    await anotarConstancias(cargo);
    const despues = (await comprobante(primero.id)).contrasenas[0].documentos[0];
    expect(despues.constancias.map((c: { constanciaNumero: string }) => c.constanciaNumero)).toEqual(
      antes.constancias.map((_: unknown, i: number) => `K-${i + 1}`),
    );
    const hoja = await comprobante(primero.id);
    expect(hoja.totalCubierto).toBe((Number(hoja.totalPagado) + Number(hoja.totalRetenciones)).toFixed(2));

    const sin = (await comprobante(segundo.id)).contrasenas[0].documentos[0];
    expect(sin).toMatchObject({ retencionDescontada: '0.00', constancias: [] });
  });

  it('un cheque posfechado lo dice; uno anulado sale marcado con su motivo', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const pago = (
      await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '1120.00' }], { fecha: haceDias(-5) }))
    ).cuerpo;
    expect((await comprobante(pago.id)).pago).toMatchObject({ posfechado: true, fecha: haceDias(-5) });

    await anularPago(e.propietario(), pago.id, { motivo: 'Se cambió el cheque' });

    expect((await comprobante(pago.id)).pago).toMatchObject({
      estado: 'anulado',
      posfechado: false,
      anulacion: { motivo: 'Se cambió el cheque' },
    });
  });

  it('un pago desconocido es 404', async () => {
    expect((await e.propietario().get(`${RUTA}/${crypto.randomUUID()}/comprobante`)).estado).toBe(404);
  });
});

describe('otras formas', () => {
  it('una nota de débito lo dice en su título y trae la nota de Bancos', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const pago = (await e.pagar(e.nota(proveedor.proveedorId, [{ cargoId: cargo, monto: '1120.00' }]))).cuerpo;

    expect(await comprobante(pago.id)).toMatchObject({
      titulo: 'Comprobante de pago con nota de débito',
      medio: { tipo: 'nota_de_debito' },
    });
  });

  it('la cuenta de apertura no es un pago con dinero: su título lo dice y trae el motivo', async () => {
    const { cargo, contrasena } = await e.proveedorConCargo();
    const sembrado = await sembrarPago(e.mundo.escenario, {
      contrasenaId: contrasena,
      lineas: [{ cargoPropio: cargo, monto: '300.00' }],
    });

    expect(await comprobante(sembrado.id)).toMatchObject({
      titulo: 'Comprobante de aplicación a la cuenta de apertura',
      medio: null,
      pago: { motivo: 'Pago sembrado por la prueba' },
    });
  });
});

describe('el recibo de un pago en efectivo', () => {
  it('lleva el título de recibo, el retiro y el custodio que entrega, quien recibe y el total en letras', async () => {
    const { cargo } = await e.proveedorConCargo('2000.00');
    const retiro = await registrarRetiro(e.propietario(), retiroConCheque(e, '2000.00'));
    const pagoId = await sembrarPagoDelRetiro(retiro.id, cargo, { monto: '1125.50' });
    await consultar(
      "update cuentas_por_pagar.pagos set recibido_por = 'Ana López', referencia = 'REC-9' where id = $1",
      [pagoId],
    );

    const hoja = await comprobante(pagoId);

    expect(hoja).toMatchObject({
      titulo: 'Recibo de pago en efectivo',
      esReciboDeEfectivo: true,
      hojas: ['Original', 'Copia'],
      medio: null,
      retiro: { numero: retiro.numero, custodio: 'Juan Pérez' },
      pago: { forma: 'efectivo', referencia: 'REC-9' },
      totalPagado: '1125.50',
      totalEnLetras: 'Mil ciento veinticinco quetzales con 50/100',
      leyendas: ['Las retenciones se documentan con su constancia.', 'Este recibo no es un documento tributario.'],
      firmas: {
        entrega: { rotulo: 'Entregado por (custodio)', nombre: 'Juan Pérez' },
        recibe: { rotulo: expect.stringMatching(/^Recibí conforme/), nombre: 'Ana López' },
      },
    });
    expect(hoja.contrasenas[0].documentos[0]).toMatchObject({ documentoId: cargo, pagado: '1125.50' });
  });
});
