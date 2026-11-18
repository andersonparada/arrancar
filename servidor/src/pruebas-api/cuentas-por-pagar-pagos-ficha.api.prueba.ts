/**
 * La ficha de un pago (CP4-8): el cheque o la nota de Bancos con su estado de conciliación, las líneas juntas por contraseña
 * con las retenciones del libro (constancia o «por emitir»), lo que se puede hacer (anular, reaplicar, saldar la diferencia)
 * en cada estado y forma, y el pago en efectivo con su retiro.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import {
  anularPago,
  cuentaConFondos,
  iniciarEnero,
  MES_CONCILIADO,
  moverFechaDelPago,
} from './soporte/cuentas-por-pagar-pagos-cambios.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { sembrarPago } from './soporte/cuentas-por-pagar-pagos.js';
import { registrarRetiro, retiroConCheque, sembrarPagoDelRetiro } from './soporte/cuentas-por-pagar-retiros.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, HOY } from './soporte/escenario-de-documentos.js';
import { filasDelDocumento, reporteDelMes, RUTA_RETENCIONES } from './soporte/escenario-de-retenciones.js';

const entorno = usarEntornoApi();
const RUTA = '/api/cuentas-por-pagar/pagos';
let e: EscenarioDePagos;

const ficha = async (id: string) => {
  const respuesta = await e.propietario().get(`${RUTA}/${id}`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo;
};

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxppagosficha');
});

/** Anota una constancia en cada retención del documento (el libro de compras la guarda por impuesto). */
async function anotarConstancias(cargoId: string): Promise<void> {
  const [documento] = await consultar<{ documento_id: string; fecha_emision: string }>(
    'select documento_id, fecha_emision::text from cuentas_por_pagar.documentos where id = $1',
    [cargoId],
  );
  const reporte = await reporteDelMes(e.propietario(), documento!.fecha_emision);
  for (const [indice, fila] of filasDelDocumento(reporte, documento!.documento_id).entries()) {
    const anotada = await e
      .propietario()
      .put(`${RUTA_RETENCIONES}/${fila.id}/constancia`, { numero: `C-${indice + 1}`, fecha: HOY });
    expect(anotada.estado, JSON.stringify(anotada.cuerpo)).toBe(200);
  }
}

describe('un cheque', () => {
  it('trae el cheque de Bancos, el beneficiario, el motivo y lo que se puede hacer', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const pago = (await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '1120.00' }]))).cuerpo;

    const datos = await ficha(pago.id);

    expect(datos).toMatchObject({
      id: pago.id,
      numero: pago.numero,
      forma: 'cheque',
      estado: 'vigente',
      monto: '1120.00',
      beneficiario: pago.beneficiario,
      referencia: null,
      motivo: null,
      retiro: null,
      conciliado: false,
      puedeAnular: true,
      puedeReaplicar: true,
      puedeSaldarDiferencia: false,
      anulacion: null,
      creadoPorNombre: expect.any(String),
    });
    expect(datos.movimiento).toMatchObject({
      id: pago.movimiento.id,
      cuentaBancariaNombre: 'Cuenta de pagos',
      tipo: 'cheque',
      numero: pago.movimiento.numero,
      conciliado: false,
      anulado: false,
    });
    expect(datos.proveedor).toMatchObject({ id: proveedor.proveedorId });
  });

  it('junta las líneas por contraseña y da el saldo, las notas y la retención de cada documento', async () => {
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

    const { aplicaciones } = await ficha(pago.id);

    expect(aplicaciones.map((linea: { contrasena: { id: string } }) => linea.contrasena.id)).toEqual([k1, k1, k2]);
    expect(aplicaciones[0]).toMatchObject({
      documentoId: uno,
      saldoDelDocumento: '120.00',
      notasAplicadas: '0.00',
      diferenciaOfrecible: '0.00',
    });
    expect(aplicaciones[2]).toMatchObject({ documentoId: dos, saldoDelDocumento: '0.00' });
  });

  it('las retenciones del libro salen «por emitir» y luego con su número de constancia', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo('5600.00');
    const pago = (await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '1000.00' }]))).cuerpo;

    const antes = (await ficha(pago.id)).aplicaciones[0].retencionesDelLibro;
    expect(antes.length).toBeGreaterThan(0);
    expect(antes.every((retencion: { porEmitir: boolean }) => retencion.porEmitir)).toBe(true);

    await anotarConstancias(cargo);
    const despues = (await ficha(pago.id)).aplicaciones[0].retencionesDelLibro;
    expect(
      despues.map((r: { constanciaNumero: string; porEmitir: boolean }) => [r.constanciaNumero, r.porEmitir]),
    ).toEqual(antes.map((_: unknown, indice: number) => [`C-${indice + 1}`, false]));
  });

  it('un residuo de centavos dentro del tope se puede dar por saldado, y deja de ofrecerse al saldarlo', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const pago = (await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '1119.97' }]))).cuerpo;

    const antes = await ficha(pago.id);
    expect(antes.puedeSaldarDiferencia).toBe(true);
    expect(antes.aplicaciones[0]).toMatchObject({ saldoDelDocumento: '0.03', diferenciaOfrecible: '0.03' });

    const saldada = await e.propietario().post(`${RUTA}/${pago.id}/diferencias`, { cargoId: cargo, monto: '0.03' });
    expect(saldada.estado, JSON.stringify(saldada.cuerpo)).toBe(201);
    expect(await ficha(pago.id)).toMatchObject({ puedeSaldarDiferencia: false, diferencias: [{ monto: '0.03' }] });
  });

  it('un residuo mayor que el tope no se ofrece', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const pago = (await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '1000.00' }]))).cuerpo;

    expect(await ficha(pago.id)).toMatchObject({ puedeSaldarDiferencia: false });
  });
});

describe('según su estado', () => {
  it('un cheque ya cobrado no se anula pero sí se reaplica', async () => {
    const cuenta = await cuentaConFondos(e.propietario(), 'Cuenta de fichas');
    const { proveedor, cargo } = await e.proveedorConCargo();
    const pago = (
      await e.pagar({
        ...e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '800.00' }]),
        chequeraId: cuenta.chequeraId,
      })
    ).cuerpo;
    await moverFechaDelPago(pago.id, MES_CONCILIADO);
    await iniciarEnero(e.propietario(), cuenta.cuentaBancariaId, [pago.movimiento.id]);

    const datos = await ficha(pago.id);

    expect(datos).toMatchObject({ conciliado: true, puedeAnular: false, puedeReaplicar: true });
    expect(datos.movimiento).toMatchObject({
      conciliado: true,
      anulado: false,
      cuentaBancariaNombre: 'Cuenta de fichas',
    });
  });

  it('un pago anulado trae su anulación y ya no se puede anular, reaplicar ni saldar', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const pago = (await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '1119.97' }]))).cuerpo;
    await anularPago(e.propietario(), pago.id, { motivo: 'Error de monto' });

    const datos = await ficha(pago.id);

    expect(datos).toMatchObject({
      estado: 'anulado',
      anulacion: { fecha: HOY, motivo: 'Error de monto' },
      puedeAnular: false,
      puedeReaplicar: false,
      puedeSaldarDiferencia: false,
    });
    expect(datos.movimiento).toMatchObject({ anulado: true });
  });

  it('una nota de débito trae su nota de Bancos', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const pago = (await e.pagar(e.nota(proveedor.proveedorId, [{ cargoId: cargo, monto: '1120.00' }]))).cuerpo;

    expect((await ficha(pago.id)).movimiento).toMatchObject({ tipo: 'nota_de_debito', numero: pago.movimiento.numero });
  });

  it('un pago a la cuenta de apertura trae el motivo y no tiene movimiento ni diferencias que ofrecer', async () => {
    const { cargo, contrasena } = await e.proveedorConCargo();
    const sembrado = await sembrarPago(e.mundo.escenario, {
      contrasenaId: contrasena,
      lineas: [{ cargoPropio: cargo, monto: '300.00' }],
    });

    const datos = await ficha(sembrado.id);

    expect(datos).toMatchObject({
      forma: 'cuenta_de_apertura',
      motivo: 'Pago sembrado por la prueba',
      movimiento: null,
      conciliado: false,
      puedeAnular: true,
      puedeSaldarDiferencia: false,
    });
  });
});

describe('un pago en efectivo', () => {
  it('trae el retiro con su custodio, quien recibió y el recibo del proveedor', async () => {
    const { cargo } = await e.proveedorConCargo();
    const retiro = await registrarRetiro(e.propietario(), retiroConCheque(e, '2000.00'));
    const pagoId = await sembrarPagoDelRetiro(retiro.id, cargo, { monto: '300.00' });
    await consultar(
      "update cuentas_por_pagar.pagos set recibido_por = 'Ana López', referencia = 'REC-77' where id = $1",
      [pagoId],
    );

    const datos = await ficha(pagoId);

    expect(datos).toMatchObject({
      forma: 'efectivo',
      movimiento: null,
      conciliado: false,
      recibidoPor: 'Ana López',
      referencia: 'REC-77',
      retiro: { id: retiro.id, numero: retiro.numero, custodio: 'Juan Pérez', estado: 'abierto' },
      puedeAnular: true,
    });
  });
});

describe('lo que no existe', () => {
  it('un pago desconocido es 404 y un id mal escrito, 400', async () => {
    expect((await e.propietario().get(`${RUTA}/${crypto.randomUUID()}`)).estado).toBe(404);
    expect((await e.propietario().get(`${RUTA}/no-es-un-id`)).estado).toBe(400);
  });
});
