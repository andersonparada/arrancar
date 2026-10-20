import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  configurarEmpresa,
  documentoDePrueba,
  haceDias,
  HOY,
  instalarDestinoFalso,
  nitValido,
  prepararEscenario,
  primerDiaDelMes,
  registrarProveedor,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
const RUTA = '/api/libro-de-compras/libro';
const PERIODO = HOY.slice(0, 7);
let escenario: EscenarioDeDocumentos;
let simplificado: EscenarioDeDocumentos;
let soloDocumentos: ClienteApi;
let conLibro: ClienteApi;
let facturaId: string;
let anuladaId: string;

const propietario = () => escenario.cuenta.propietario;
const linea = (total: string) => [{ conceptoId: escenario.conceptoId, total }];

async function registrar(cambios: Record<string, unknown> = {}, donde: EscenarioDeDocumentos = escenario) {
  const respuesta = await donde.cuenta.propietario.post(RUTA_DOCUMENTOS, documentoDePrueba(donde, cambios));
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return respuesta.cuerpo.documento.id as string;
}

/** Un período armado: factura, nota de crédito, nota de débito, fuera de plazo, combustible exento y primario. */
async function armarElPeriodo(): Promise<void> {
  const vigencia = await propietario().post('/api/libro-de-compras/vigencias-de-combustible', {
    combustibleId: escenario.combustibleId,
    idpPorGalon: '0.00',
    porcentajeDeEtanol: '0.00',
    ivaExento: true,
    vigenteDesde: haceDias(30),
    vigenteHasta: null,
  });
  expect(vigencia.estado).toBe(201);
  facturaId = await registrar();
  await registrar({ tipoDte: 'NCRE', serie: 'N', documentoAfectadoId: facturaId, lineas: linea('560.00') });
  await registrar({ tipoDte: 'NDEB', serie: 'D', documentoAfectadoId: facturaId, lineas: linea('112.00') });
  await registrar({ fechaEmision: haceDias(100) });
  await registrar({
    lineas: [
      { conceptoId: escenario.conceptoId, combustibleId: escenario.combustibleId, galones: '10', total: '500.00' },
    ],
  });
  const { proveedorId } = await registrarProveedor(escenario.cuenta, 'Finca La Esperanza');
  await registrar({ tipoDte: 'FARP', proveedorId, nitEmisor: nitValido('3000001'), lineas: linea('5600.00') });
  anuladaId = await registrar();
  await propietario().post(`${RUTA_DOCUMENTOS}/${anuladaId}/anular`, { causa: 'error_de_captura', motivo: 'Error' });
  await registrar({ fechaEmision: primerDiaDelMes(-1), fechaRecepcion: primerDiaDelMes(-1) });
}

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'librodelperiodo');
  simplificado = await prepararEscenario(entorno, 'librosimplificado');
  await configurarEmpresa(simplificado.cuenta, {
    regimenIva: 'pequeno_contribuyente',
    agenteDeRetencionIva: 'ninguno',
  });
  await armarElPeriodo();
  await registrar({}, simplificado);
  soloDocumentos = await crearUsuarioConPermisos(entorno, escenario.cuenta, {
    nombres: 'Solo documentos',
    apellidos: 'Libro',
    permisos: ['libro-de-compras.documentos.ver'],
  });
  conLibro = await crearUsuarioConPermisos(entorno, escenario.cuenta, {
    nombres: 'Con libro',
    apellidos: 'Libro',
    permisos: ['libro-de-compras.libro.ver'],
  });
});

afterAll(() => vi.restoreAllMocks());

describe('libro de compras del período', () => {
  it('entran solo los vigentes del período, en orden de emisión y tipo, numerados', async () => {
    const respuesta = await propietario().get(`${RUTA}?periodo=${PERIODO}`);

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ tipoDeLibro: 'completo', periodo: `${PERIODO}-01` });
    expect(respuesta.cuerpo.empresa).toMatchObject({ nombre: 'Rancho fiscal' });
    const filas = respuesta.cuerpo.filas;
    expect(filas.map((fila: { tipoDte: string }) => fila.tipoDte)).toEqual([
      'FACT',
      'FACT',
      'FACT',
      'FARP',
      'NCRE',
      'NDEB',
    ]);
    expect(filas.map((fila: { numeroDeFila: number }) => fila.numeroDeFila)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(filas[0]).toMatchObject({ fecha: haceDias(100), motivo: 'fuera_de_plazo', siglaDelMotivo: 'FP' });
  });

  it('reparte las columnas con su signo: nota de crédito negativa, nota de débito positiva', async () => {
    const { filas } = (await propietario().get(`${RUTA}?periodo=${PERIODO}`)).cuerpo;

    const nota = filas.find((fila: { tipoDte: string }) => fila.tipoDte === 'NCRE');
    const debito = filas.find((fila: { tipoDte: string }) => fila.tipoDte === 'NDEB');
    expect(nota).toMatchObject({ bienes: '-500.00', ivaConCredito: '-60.00', total: '-560.00' });
    expect(debito).toMatchObject({ bienes: '100.00', ivaConCredito: '12.00', total: '112.00' });
    expect(filas[0]).toMatchObject({ ivaConCredito: '0.00', ivaSinCredito: '120.00', bienes: '1000.00' });
    expect(filas.find((fila: { tipoDte: string }) => fila.tipoDte === 'FARP')).toMatchObject({
      primarioPecuario: '5600.00',
      bienes: '0.00',
      siglaDelMotivo: 'RE',
    });
  });

  it('el combustible exento del Decreto 22-2026 va en exento y no afecto', async () => {
    const { filas, resumen } = (await propietario().get(`${RUTA}?periodo=${PERIODO}`)).cuerpo;

    const exento = filas.find((fila: { siglaDelMotivo: string }) => fila.siglaDelMotivo === 'EX');
    expect(exento).toMatchObject({ exentoYNoAfecto: '500.00', ivaConCredito: '0.00', total: '500.00' });
    expect(resumen.combustibles).toMatchObject({ exentoPorDecreto: '500.00', iva: '0.00' });
  });

  it('el resumen suma el período y las columnas cuadran con el total', async () => {
    const { resumen } = (await propietario().get(`${RUTA}?periodo=${PERIODO}`)).cuerpo;

    expect(resumen.totales).toMatchObject({
      bienes: '1600.00',
      exentoYNoAfecto: '500.00',
      primarioPecuario: '5600.00',
      ivaConCredito: '72.00',
      ivaSinCredito: '120.00',
      total: '7892.00',
    });
    expect(resumen.creditoFiscalDelPeriodo).toBe('72.00');
    expect(resumen.ivaSinCreditoPorMotivo).toEqual([{ motivo: 'fuera_de_plazo', ivaSinCredito: '120.00' }]);
    expect(resumen.porTipoDte).toEqual([
      { tipoDte: 'FACT', cantidad: 3, total: '2740.00' },
      { tipoDte: 'FARP', cantidad: 1, total: '5600.00' },
      { tipoDte: 'NCRE', cantidad: 1, total: '-560.00' },
      { tipoDte: 'NDEB', cantidad: 1, total: '112.00' },
    ]);
  });

  it('un período sin documentos da un libro vacío', async () => {
    const respuesta = await propietario().get(`${RUTA}?periodo=2020-01`);

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ filas: [], tipoDeLibro: 'completo' });
    expect(respuesta.cuerpo.resumen.totales.total).toBe('0.00');
  });

  it('exige el período con el formato AAAA-MM', async () => {
    expect((await propietario().get(RUTA)).estado).toBe(400);
    expect((await propietario().get(`${RUTA}?periodo=2026-13`)).estado).toBe(400);
  });
});

describe('libro simplificado', () => {
  it('la empresa sin crédito lleva el IVA informativo y sin columnas de crédito', async () => {
    const respuesta = await simplificado.cuenta.propietario.get(`${RUTA}?periodo=${PERIODO}`);

    expect(respuesta.cuerpo.tipoDeLibro).toBe('simplificado');
    expect(respuesta.cuerpo.filas).toHaveLength(1);
    expect(respuesta.cuerpo.filas[0]).toMatchObject({
      bienes: '1000.00',
      ivaInformativo: '120.00',
      ivaConCredito: '0.00',
      ivaSinCredito: '0.00',
      siglaDelMotivo: null,
      total: '1120.00',
    });
    expect(respuesta.cuerpo.resumen.creditoFiscalDelPeriodo).toBe('0.00');
  });

  it('un período sin documentos toma el tipo del régimen que rige', async () => {
    const respuesta = await simplificado.cuenta.propietario.get(`${RUTA}?periodo=2020-01`);

    expect(respuesta.cuerpo.tipoDeLibro).toBe('simplificado');
  });
});

describe('anexo de anulados', () => {
  it('lista solo los anulados del período, aparte del libro, con montos positivos', async () => {
    const respuesta = await propietario().get(`${RUTA}/anulados?periodo=${PERIODO}`);

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo).toHaveLength(1);
    expect(respuesta.cuerpo[0]).toMatchObject({
      id: anuladaId,
      tipoDte: 'FACT',
      total: '1120.00',
      iva: '120.00',
      causaDeAnulacion: 'error_de_captura',
      motivoDeAnulacion: 'Error',
    });
    expect(respuesta.cuerpo[0].anuladoPor).toBeTruthy();
  });
});

describe('permisos y aislamiento', () => {
  it('sin libro.ver responde 403; con libro.ver, 200', async () => {
    expect((await soloDocumentos.get(`${RUTA}?periodo=${PERIODO}`)).estado).toBe(403);
    expect((await soloDocumentos.get(`${RUTA}/anulados?periodo=${PERIODO}`)).estado).toBe(403);
    expect((await conLibro.get(`${RUTA}?periodo=${PERIODO}`)).estado).toBe(200);
  });

  it('cada empresa ve solo lo suyo', async () => {
    const mio = await propietario().get(`${RUTA}?periodo=${PERIODO}`);
    const ajeno = await simplificado.cuenta.propietario.get(`${RUTA}?periodo=${PERIODO}`);

    expect(mio.cuerpo.filas).toHaveLength(6);
    expect(ajeno.cuerpo.filas).toHaveLength(1);
  });
});
