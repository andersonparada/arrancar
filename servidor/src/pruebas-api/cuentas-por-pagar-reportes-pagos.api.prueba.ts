/**
 * R6 (pagos realizados, con quién registró el documento, quién lo autorizó y quién pagó, y la marca de «misma persona») y R7
 * (cheques posfechados al corte, con el cobrado antes de su fecha por una conciliación autorizada), con sus permisos y su Excel.
 */
import ExcelJS from 'exceljs';
import { beforeAll, describe, expect, it } from 'vitest';
import { anularPagoEnLaBase } from './soporte/cuentas-por-pagar-reportes.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const RUTA = '/api/cuentas-por-pagar/reportes';
const entorno = usarEntornoApi();
let e: EscenarioDePagos;
let proveedorId: string;
let pagoId: string;
let neto: string;
let movimientoId: string;

const ver = async (ruta: string) => {
  const respuesta = await e.propietario().get(`${RUTA}/${ruta}`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo;
};

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxreppagos');
  const { cuenta } = e.mundo.escenario;
  expect(
    (await cuenta.propietario.put(`/api/empresas/${cuenta.empresaId}/carga-inicial`, { fechaDeInicio: '2026-01-01' }))
      .estado,
  ).toBe(200);
  const { proveedor, cargo } = await e.proveedorConCargo();
  proveedorId = proveedor.proveedorId;
  await consultar(
    `update cuentas_por_pagar.documentos set fecha_emision = '2026-02-01', vencimiento = '2026-03-01' where id = $1`,
    [cargo],
  );
  neto = (await e.propietario().get(`/api/cuentas-por-pagar/documentos/${cargo}`)).cuerpo.saldo;
  const pago = await e.pagar(e.cheque(proveedorId, [{ cargoId: cargo, monto: neto }], { fecha: '2090-01-01' }));
  expect(pago.estado, JSON.stringify(pago.cuerpo)).toBe(201);
  pagoId = pago.cuerpo.id;
  movimientoId = pago.cuerpo.movimiento.id;
  await consultar(`update cuentas_por_pagar.pagos set fecha = '2026-04-15', creado_en = '2026-03-10' where id = $1`, [
    pagoId,
  ]);
}, 60_000);

describe('R6: pagos realizados', () => {
  const rango = 'desde=2026-04-01&hasta=2026-04-30';

  it('lista una línea por documento con quién lo registró, lo autorizó y pagó, y la marca de misma persona', async () => {
    const reporte = await ver(`pagos?${rango}`);

    expect(reporte.total).toBe(1);
    const [linea] = reporte.filas;
    expect(linea).toMatchObject({ forma: 'cheque', monto: neto, estado: 'vigente', fecha: '2026-04-15', misma: true });
    expect(linea.registroElPago).toBeTruthy();
    expect(linea.autorizoElDocumento).toBe(linea.registroElPago);
    expect(linea.registroElDocumento).toBeTruthy();
    expect(linea.cuenta).toBe('Cuenta de pagos');
    expect(reporte.totales.vigentes).toMatchObject({ lineas: 1, monto: neto });
    expect(reporte.totales.anulados).toMatchObject({ lineas: 0, monto: '0.00' });
  });

  it('el filtro de misma persona deja solo lo que la misma persona registró y pagó', async () => {
    await crearUsuarioConPermisos(entorno, e.mundo.escenario.cuenta, {
      nombres: 'Otro',
      apellidos: 'Pagador',
      permisos: ['cuentas-por-pagar.pagos.ver'],
    });
    await consultar(
      `update cuentas_por_pagar.pagos set creado_por = (select id from core.usuarios where nombres = 'Otro') where id = $1`,
      [pagoId],
    );

    const soloMisma = await ver(`pagos?${rango}&mismaPersona=true`);
    const todos = await ver(`pagos?${rango}`);

    expect(soloMisma.total).toBe(0);
    expect(todos.filas[0]).toMatchObject({ misma: false, registroElPago: 'Otro Pagador' });
  });

  it('filtra por forma, posfechados, rango y proveedor', async () => {
    expect((await ver(`pagos?${rango}&forma=efectivo`)).total).toBe(0);
    expect((await ver(`pagos?${rango}&forma=cheque&posfechados=true`)).total).toBe(1);
    expect((await ver('pagos?desde=2026-05-01&hasta=2026-05-31')).total).toBe(0);
    expect((await ver(`pagos?${rango}&proveedorId=${proveedorId}`)).total).toBe(1);
    expect((await ver(`pagos?${rango}&cuentaBancariaId=${e.cuentaBancariaId}`)).total).toBe(1);
  });

  it('rechaza un rango al revés o de más de 24 meses', async () => {
    const alReves = await e.propietario().get(`${RUTA}/pagos?desde=2026-05-01&hasta=2026-04-01`);
    const largo = await e.propietario().get(`${RUTA}/pagos?desde=2020-01-01&hasta=2026-04-01`);

    expect(alReves.cuerpo.error.codigo).toBe('rango_de_reporte_invalido');
    expect(largo.cuerpo.error.codigo).toBe('rango_de_reporte_muy_largo');
  });

  it('un pago anulado sale con su fecha y motivo, separado de los vigentes', async () => {
    await anularPagoEnLaBase(pagoId);
    await consultar(`update cuentas_por_pagar.pagos set fecha_de_anulacion = '2026-04-20' where id = $1`, [pagoId]);

    const vigentes = await ver(`pagos?${rango}`);
    const anulados = await ver(`pagos?${rango}&estado=anulados`);
    const todos = await ver(`pagos?${rango}&estado=todos`);

    expect(vigentes.total).toBe(0);
    expect(anulados.filas[0]).toMatchObject({
      estado: 'anulado',
      fechaDeAnulacion: '2026-04-20',
      motivoDeAnulacion: 'Error',
    });
    expect(anulados.totales.anulados.monto).toBe(neto);
    expect(todos.total).toBe(1);
    await consultar(
      `update cuentas_por_pagar.pagos set estado = 'vigente', fecha_de_anulacion = null, anulado_en = null,
              anulado_por = null, motivo_de_anulacion = null where id = $1`,
      [pagoId],
    );
    await consultar('update cuentas_por_pagar.aplicaciones_de_pagos set vigente = true where pago_id = $1', [pagoId]);
  });
});

describe('R7: cheques posfechados al corte', () => {
  const cheques = (corte: string) => ver(`cheques-posfechados?corte=${corte}`);
  const comprometidoDeR1 = async (corte: string) =>
    (await ver(`saldos-por-proveedor?corte=${corte}&proveedorId=${proveedorId}&incluirSinSaldo=true`)).acreedores[0]
      ?.comprometido;

  beforeAll(async () => {
    const [conciliacion] = await consultar<{ id: string }>(
      `insert into bancos.conciliaciones (empresa_id, cuenta_bancaria_id, anio, mes, estado, previa_al_saldo_transcrito)
       select empresa_id, cuenta_bancaria_id, 2026, 3, 'autorizada', true from bancos.movimientos where id = $1
       returning id`,
      [movimientoId],
    );
    await consultar('update bancos.movimientos set conciliacion_id = $2 where id = $1', [
      movimientoId,
      conciliacion!.id,
    ]);
  });

  it('antes de que se entregara el cheque no sale', async () => {
    expect((await cheques('2026-03-08')).filas).toEqual([]);
  });

  it('lo cobrado antes de su fecha en el mes del corte sale con la marca y su total es el comprometido de R1', async () => {
    const reporte = await cheques('2026-03-15');

    expect(reporte.filas).toMatchObject([
      {
        fecha: '2026-04-15',
        diasQueFaltan: 31,
        cobrado: true,
        cobradoEn: '03/2026',
        cuenta: 'Cuenta de pagos',
        monto: neto,
      },
    ]);
    expect(reporte.total).toEqual({ cantidad: 1, monto: neto });
    expect(reporte.totalesPorCuenta).toMatchObject([{ cuenta: 'Cuenta de pagos', cantidad: 1, monto: neto }]);
    expect(reporte.totalesPorSemana).toMatchObject([{ desde: '2026-04-13', hasta: '2026-04-19', monto: neto }]);
    expect(reporte.total.monto).toBe(await comprometidoDeR1('2026-03-15'));
  });

  it('cobrado en una conciliación autorizada que termina hasta el corte ya no sale', async () => {
    for (const corte of ['2026-03-31', '2026-04-10']) {
      expect((await cheques(corte)).filas, corte).toEqual([]);
      expect(await comprometidoDeR1(corte)).toBe('0.00');
    }
  });

  it('con la conciliación elaborada sale hasta su fecha, sin la marca de cobrado antes', async () => {
    await consultar(
      `update bancos.conciliaciones set estado = 'elaborada' where id = (select conciliacion_id from bancos.movimientos where id = $1)`,
      [movimientoId],
    );

    const reporte = await cheques('2026-03-31');

    expect(reporte.filas[0]).toMatchObject({ cobrado: true, cobradoEn: null });
    expect(reporte.total.monto).toBe(await comprometidoDeR1('2026-03-31'));
    expect((await cheques('2026-04-15')).filas).toEqual([]);
  });

  it('filtra por cuenta bancaria y por proveedor', async () => {
    expect(
      (await ver(`cheques-posfechados?corte=2026-03-31&cuentaBancariaId=${e.cuentaBancariaId}`)).filas,
    ).toHaveLength(1);
    expect((await ver(`cheques-posfechados?corte=2026-03-31&proveedorId=${proveedorId}`)).filas).toHaveLength(1);
  });
});

describe('permisos y Excel de R6 y R7', () => {
  const RUTAS = ['pagos', 'cheques-posfechados'];

  it('pide el permiso de ver o de exportar de cada ruta', async () => {
    const permiso = (nombre: string, accion: string) =>
      crearUsuarioConPermisos(entorno, e.mundo.escenario.cuenta, {
        nombres: nombre,
        apellidos: 'Pagos',
        permisos: [`cuentas-por-pagar.reportes-de-pagos.${accion}`],
      });
    const [soloVer, soloExportar] = [await permiso('Solo ve', 'ver'), await permiso('Solo exporta', 'exportar')];

    for (const ruta of RUTAS) {
      expect((await entorno.nuevoCliente().get(`${RUTA}/${ruta}`)).estado).toBe(401);
      expect((await soloExportar.get(`${RUTA}/${ruta}`)).estado).toBe(403);
      expect((await soloVer.get(`${RUTA}/${ruta}/exportar`)).estado).toBe(403);
      expect((await soloVer.get(`${RUTA}/${ruta}`)).estado).toBe(200);
      expect((await soloExportar.get(`${RUTA}/${ruta}/exportar`)).estado).toBe(200);
    }
  });

  async function filasDe(ruta: string): Promise<string[]> {
    const exportado = await e.propietario().get(`${RUTA}/${ruta}`);
    expect(exportado.estado).toBe(200);
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(exportado.cuerpo as unknown as ExcelJS.Buffer);
    const hoja = libro.worksheets[0]!;
    return Array.from({ length: hoja.rowCount }, (_, i) =>
      (hoja.getRow(i + 1).values as unknown[])
        .slice(1)
        .map((valor) => String(valor ?? ''))
        .join('|'),
    );
  }

  it('R6 lleva las líneas, los totales y el rango', async () => {
    const filas = await filasDe('pagos/exportar?desde=2026-04-01&hasta=2026-04-30');

    expect(filas.some((fila) => fila.startsWith('Pagos|') && fila.includes('Cuenta de pagos'))).toBe(true);
    expect(filas.some((fila) => fila.startsWith('Total vigentes|'))).toBe(true);
    expect(filas.some((fila) => fila.startsWith('Nota|') && fila.includes('Pagos del 01/04/2026'))).toBe(true);
  });

  it('R7 lleva los cheques, los totales y la leyenda del Código de Comercio', async () => {
    const filas = await filasDe('cheques-posfechados/exportar?corte=2026-03-31');

    expect(filas.some((fila) => fila.startsWith('Cheques|'))).toBe(true);
    expect(filas.some((fila) => fila.startsWith('Total|'))).toBe(true);
    expect(filas.some((fila) => fila.includes('Código de Comercio, art. 501'))).toBe(true);
  });
});
