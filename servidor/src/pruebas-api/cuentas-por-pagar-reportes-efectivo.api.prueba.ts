/**
 * R10 (retiros de efectivo por liquidar a un corte), R11 (notas de débito para proveedores sin aplicar, la cuenta transitoria)
 * y la conciliación al pie de R1 (saldo neto del auxiliar menos R11 al mismo corte), con sus permisos y su Excel.
 */
import ExcelJS from 'exceljs';
import { beforeAll, describe, expect, it } from 'vitest';
import { anularPagoEnLaBase } from './soporte/cuentas-por-pagar-reportes.js';
import {
  registrarRetiro,
  retiroConCheque,
  retiroConNota,
  RUTA_DE_RETIROS,
  sembrarPagoDelRetiro,
} from './soporte/cuentas-por-pagar-retiros.js';
import { EscenarioDePagos, RUTA_DE_PAGOS } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, haceDias, HOY, primerDiaDelMes } from './soporte/escenario-de-documentos.js';
import { conceptoGeneral } from './soporte/escenarios-de-bancos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const RUTA = '/api/cuentas-por-pagar/reportes';
const CUENTA_QUE_NO_EXISTE = '00000000-0000-4000-8000-000000000000';
const entorno = usarEntornoApi();
let e: EscenarioDePagos;
let proveedorId: string;
let abierto: string;
let anulado: string;
let liquidado: string;
let notaParcial: string;
let notaTotal: string;
let notaSuelta: string;

const ver = async (ruta: string) => {
  const respuesta = await e.propietario().get(`${RUTA}/${ruta}`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo;
};

/** Una nota de débito de la cuenta, marcada para Cuentas por pagar (o suelta), con su fecha puesta en la base. */
async function nota(monto: string, fecha: string, { marcada = true } = {}): Promise<string> {
  const creada = await e.propietario().post('/api/bancos/notas', {
    cuentaBancariaId: e.cuentaBancariaId,
    tipo: 'debito',
    fecha: HOY,
    monto,
    referencia: 'Débito del banco',
    beneficiario: 'Aseguradora Prueba',
    observaciones: null,
    ...(marcada ? { marcarParaCuentasPorPagar: true } : { conceptoId: await conceptoGeneral(e.propietario()) }),
  });
  expect(creada.estado, JSON.stringify(creada.cuerpo)).toBe(201);
  await consultar('update bancos.movimientos set fecha = $2 where id = $1', [creada.cuerpo.id, fecha]);
  return creada.cuerpo.id;
}

/** Liga un pago a la nota y le pone su fecha. */
async function ligar(
  movimientoId: string,
  aplicacion: { cargoId: string; monto: string },
  fecha: string,
): Promise<string> {
  const pago = await e.propietario().post(`${RUTA_DE_PAGOS}/ligar`, {
    forma: 'nota_ligada',
    movimientoId,
    proveedorId,
    aplicaciones: [aplicacion],
  });
  expect(pago.estado, JSON.stringify(pago.cuerpo)).toBe(201);
  await consultar('update cuentas_por_pagar.pagos set fecha = $2 where id = $1', [pago.cuerpo.id, fecha]);
  return pago.cuerpo.id;
}

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxprepefectivo');
  const { cuenta } = e.mundo.escenario;
  const inicio = await cuenta.propietario.put(`/api/empresas/${cuenta.empresaId}/carga-inicial`, {
    fechaDeInicio: '2026-01-01',
  });
  expect(inicio.estado, JSON.stringify(inicio.cuerpo)).toBe(200);
  const propietario = e.propietario();
  const proveedor = await e.mundo.unProveedor();
  proveedorId = proveedor.proveedorId;
  const [uno, dos, tres] = [
    await e.cargoAutorizado(proveedor, '5000.00'),
    await e.cargoAutorizado(proveedor, '5000.00'),
    await e.cargoAutorizado(proveedor, '5000.00'),
  ];
  await e.contrasena(proveedor, [uno]);
  await e.contrasena(proveedor, [dos]);
  await e.contrasena(proveedor, [tres]);

  notaParcial = await nota('1500.00', haceDias(40));
  await ligar(notaParcial, { cargoId: dos, monto: '1000.00' }, haceDias(10));
  notaTotal = await nota('800.00', haceDias(30));
  await ligar(notaTotal, { cargoId: tres, monto: '800.00' }, HOY);
  notaSuelta = await nota('999.00', haceDias(30), { marcada: false });
  // El pago sembrado del retiro va después: el correlativo de la API no sabe del número que se siembra.
  abierto = (await registrarRetiro(propietario, retiroConCheque(e, '200.00', { fecha: primerDiaDelMes(-1) }))).id;
  await sembrarPagoDelRetiro(abierto, uno, { monto: '50.00', fecha: HOY });
  anulado = (await registrarRetiro(propietario, retiroConNota(e, '300.00', { fecha: haceDias(3) }))).id;
  await propietario.post(`${RUTA_DE_RETIROS}/${anulado}/anular`, { motivo: 'Error', fecha: HOY });
  liquidado = (await registrarRetiro(propietario, retiroConCheque(e, '100.00'))).id;
  await propietario.post(`${RUTA_DE_RETIROS}/${liquidado}/liquidar`, { devuelto: '100.00', faltante: '0.00' });
}, 90_000);

describe('R10: retiros de efectivo por liquidar', () => {
  it('hoy solo está el retiro abierto, con lo pagado, lo disponible, los días y el aviso de mes anterior', async () => {
    const reporte = await ver(`retiros-por-liquidar?corte=${HOY}`);

    expect(reporte.filas).toHaveLength(1);
    expect(reporte.filas[0]).toMatchObject({
      id: abierto,
      monto: '200.00',
      pagado: '50.00',
      disponible: '150.00',
      custodio: 'Juan Pérez',
      deMesAnterior: true,
    });
    expect(reporte.filas[0].diasAbierto).toBeGreaterThan(0);
    expect(reporte.total).toEqual({ cantidad: 1, monto: '200.00', pagado: '50.00', disponible: '150.00' });
  });

  it('un retiro anulado o liquidado después del corte sí estaba abierto ese día', async () => {
    const reporte = await ver(`retiros-por-liquidar?corte=${haceDias(1)}`);

    expect(reporte.filas.map(({ id }: { id: string }) => id)).toContain(anulado);
    expect(reporte.filas.map(({ id }: { id: string }) => id)).not.toContain(liquidado);
    expect(reporte.total.disponible).toBe('500.00');
  });

  it('al cierre del mes anterior, con todo su efectivo, y filtra por custodio', async () => {
    const cierre = await ver(`retiros-por-liquidar?corte=${primerDiaDelMes(-1)}`);
    const otro = await ver(`retiros-por-liquidar?corte=${HOY}&custodio=Nadie`);
    const parte = await ver(`retiros-por-liquidar?corte=${HOY}&custodio=juan`);

    expect(cierre.filas).toMatchObject([{ id: abierto, pagado: '0.00', disponible: '200.00' }]);
    expect(otro.filas).toEqual([]);
    expect(otro.total.disponible).toBe('0.00');
    expect(parte.filas).toHaveLength(1);
  });

  it('rechaza un corte con formato malo', async () => {
    expect((await e.propietario().get(`${RUTA}/retiros-por-liquidar?corte=ayer`)).estado).toBe(400);
  });
});

describe('R11: notas de débito sin aplicar (la transitoria)', () => {
  const notas = (corte: string) => ver(`notas-sin-aplicar?corte=${corte}`);

  it('hoy solo sale la nota con disponible, con lo aplicado y lo que le queda', async () => {
    const reporte = await notas(HOY);

    expect(reporte.filas).toHaveLength(1);
    expect(reporte.filas[0]).toMatchObject({
      movimientoId: notaParcial,
      cuenta: 'Cuenta de pagos',
      monto: '1500.00',
      aplicado: '1000.00',
      disponible: '500.00',
      conciliada: false,
    });
    expect(reporte.filas[0].diasSinAplicar).toBe(40);
    expect(reporte.total).toEqual({ cantidad: 1, monto: '1500.00', aplicado: '1000.00', disponible: '500.00' });
  });

  it('a un corte anterior los pagos posteriores no cuentan, y la nota de otra fecha aún no existía', async () => {
    const reporte = await notas(haceDias(20));

    expect(reporte.filas.map(({ movimientoId: id }: { movimientoId: string }) => id).sort()).toEqual(
      [notaParcial, notaTotal].sort(),
    );
    expect(reporte.total).toMatchObject({ cantidad: 2, aplicado: '0.00', disponible: '2300.00' });
    expect((await notas(haceDias(35))).total.disponible).toBe('1500.00');
    expect((await notas(haceDias(41))).filas).toEqual([]);
  });

  it('no incluye la nota suelta ni la nota del retiro, y filtra por cuenta', async () => {
    const todas = await notas(haceDias(20));
    const otraCuenta = await ver(`notas-sin-aplicar?corte=${haceDias(20)}&cuentaBancariaId=${CUENTA_QUE_NO_EXISTE}`);

    expect(JSON.stringify(todas.filas)).not.toContain(notaSuelta);
    expect(todas.filas).toHaveLength(2);
    expect(otraCuenta.filas).toEqual([]);
    expect(
      (await ver(`notas-sin-aplicar?corte=${haceDias(20)}&cuentaBancariaId=${e.cuentaBancariaId}`)).filas,
    ).toHaveLength(2);
  });

  it('por omisión corta al fin del mes anterior', async () => {
    const finDelMesAnterior = haceDias(1, primerDiaDelMes(0));

    expect((await ver('notas-sin-aplicar')).corte).toBe(finDelMesAnterior);
  });

  it('un pago anulado después del corte no cambia ese corte, y uno anulado antes libera la nota', async () => {
    const [pago] = await consultar<{ id: string }>(`select id from cuentas_por_pagar.pagos where movimiento_id = $1`, [
      notaParcial,
    ]);
    await anularPagoEnLaBase(pago!.id);

    expect((await notas(haceDias(5))).filas[0]).toMatchObject({ aplicado: '1000.00', disponible: '500.00' });
    expect(
      (await notas(HOY)).filas.find((f: { movimientoId: string }) => f.movimientoId === notaParcial),
    ).toMatchObject({
      aplicado: '0.00',
      disponible: '1500.00',
    });
  });
});

describe('conciliación al pie de R1', () => {
  it('el saldo neto del auxiliar menos R11 al mismo corte es lo que se presenta como Proveedores', async () => {
    for (const corte of [HOY, haceDias(20)]) {
      const saldos = await ver(`saldos-por-proveedor?corte=${corte}`);
      const transitoria = (await ver(`notas-sin-aplicar?corte=${corte}`)).total.disponible;
      const centavos = (texto: string) => Math.round(Number(texto) * 100);

      expect(saldos.conciliacion.pagosPorAplicar, corte).toBe(transitoria);
      expect(saldos.conciliacion.saldoNetoDelAuxiliar).toBe(saldos.totales.saldoNeto);
      expect(centavos(saldos.conciliacion.proveedoresNetoDePagosPorAplicar)).toBe(
        centavos(saldos.totales.saldoNeto) - centavos(transitoria),
      );
    }
  });

  it('no concilia si se filtra por proveedor o por autorización', async () => {
    expect((await ver(`saldos-por-proveedor?proveedorId=${proveedorId}`)).conciliacion).toBeUndefined();
    expect((await ver('saldos-por-proveedor?autorizacion=autorizados')).conciliacion).toBeUndefined();
  });
});

describe('permisos y Excel de R10 y R11', () => {
  const RUTAS = ['retiros-por-liquidar', 'notas-sin-aplicar'];

  it('pide el permiso de ver o de exportar de cada ruta', async () => {
    const permiso = (nombre: string, accion: string) =>
      crearUsuarioConPermisos(entorno, e.mundo.escenario.cuenta, {
        nombres: nombre,
        apellidos: 'Efectivo',
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

  it('R10 lleva los retiros, el total y el corte', async () => {
    const filas = await filasDe(`retiros-por-liquidar/exportar?corte=${HOY}`);

    expect(filas.some((fila) => fila.startsWith('Retiros|') && fila.includes('Juan Pérez'))).toBe(true);
    expect(filas).toContain('Total|||||1 retiros|200|50|150');
    expect(filas.some((fila) => fila.startsWith('Nota|') && fila.includes('por liquidar al'))).toBe(true);
  });

  it('R11 lleva las notas, el total y la leyenda de la transitoria', async () => {
    const filas = await filasDe(`notas-sin-aplicar/exportar?corte=${haceDias(20)}`);

    expect(filas.some((fila) => fila.startsWith('Notas|') && fila.includes('Cuenta de pagos'))).toBe(true);
    expect(filas.some((fila) => fila.startsWith('Total|') && fila.includes('|2300|'))).toBe(true);
    expect(filas.some((fila) => fila.includes('Pagos a proveedores por aplicar'))).toBe(true);
  });

  it('el Excel de R1 lleva la conciliación', async () => {
    const filas = await filasDe(`saldos-por-proveedor/exportar?corte=${HOY}`);

    expect(filas.filter((fila) => fila.startsWith('Conciliación|'))).toHaveLength(3);
  });
});
