/**
 * Notas sobre facturas del sistema anterior, segunda parte (U8l-5): bajas (la fila de la factura anterior se borra con
 * su última nota eliminada y el tope de la nota de débito), «Documento que modifica» en la ficha y en el Excel del
 * libro, y sugerencias de facturas anteriores.
 */
import ExcelJS from 'exceljs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { MODULOS_DE_CUENTAS_POR_PAGAR } from './soporte/cuentas-por-pagar.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  configurarEmpresa,
  consultar,
  documentoDePrueba,
  haceDias,
  HOY,
  instalarDestinoFalso,
  prepararEscenario,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import { operadorDeLaBandeja, sembrarFila, sembrarLote } from './soporte/escenario-de-bandeja.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
const FECHA_DE_INICIO = haceDias(10);
const FACTURA_ANTERIOR = haceDias(40);
const PERIODO = HOY.slice(0, 7);

let escenario: EscenarioDeDocumentos;
let soloVer: ClienteApi;
let numero = 0;

const anterior = (numeroDeFactura: string, cambios: Record<string, unknown> = {}) => ({
  tipo: 'factura',
  serie: 'B',
  numero: numeroDeFactura,
  fechaEmision: FACTURA_ANTERIOR,
  total: '1120.00',
  iva: '120.00',
  motivoSinCredito: null,
  ...cambios,
});

const nota = (tipoDte: 'NCRE' | 'NDEB', cambios: Record<string, unknown> = {}) =>
  documentoDePrueba(escenario, {
    tipoDte,
    serie: tipoDte === 'NCRE' ? 'N' : 'D',
    numero: `BAJA${++numero}`,
    lineas: [{ conceptoId: escenario.conceptoId, total: '560.00' }],
    ...cambios,
  });

const propietario = () => escenario.cuenta.propietario;
const registrar = async (cuerpo: Record<string, unknown>): Promise<string> => {
  const respuesta = await propietario().post(RUTA_DOCUMENTOS, cuerpo);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return respuesta.cuerpo.documento.id as string;
};
const eliminar = (id: string) => propietario().delete(`${RUTA_DOCUMENTOS}/${id}`);
const anular = (id: string) =>
  propietario().post(`${RUTA_DOCUMENTOS}/${id}/anular`, { causa: 'error_de_captura', motivo: 'Error de captura' });

const facturasAnteriores = (numeroDeFactura: string) =>
  consultar<{ id: string }>(
    'select id from libro_de_compras.facturas_anteriores where empresa_id = $1 and numero = $2',
    [escenario.cuenta.empresaId, numeroDeFactura],
  );

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'notasfacantbajas', MODULOS_DE_CUENTAS_POR_PAGAR);
  await configurarEmpresa(escenario.cuenta, {
    regimenIva: 'general',
    regimenIsr: 'utilidades',
    agenteDeRetencionIva: 'ninguno',
    esAgenteDeRetencionIsr: false,
  });
  const ruta = `/api/empresas/${escenario.cuenta.empresaId}/carga-inicial`;
  expect((await propietario().put(ruta, { fechaDeInicio: FECHA_DE_INICIO })).estado).toBe(200);
  soloVer = await crearUsuarioConPermisos(entorno, escenario.cuenta, {
    nombres: 'Solo ver',
    apellidos: 'Bajas',
    permisos: ['libro-de-compras.documentos.ver', 'libro-de-compras.libro.ver'],
  });
});

afterAll(() => vi.restoreAllMocks());

describe('bajas de notas con factura anterior', () => {
  it('eliminar la única nota borra la factura anterior y la auditoría lleva sus datos', async () => {
    const id = await registrar(nota('NCRE', { facturaAnterior: anterior('U1') }));
    expect(await facturasAnteriores('U1')).toHaveLength(1);

    const respuesta = await eliminar(id);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(await facturasAnteriores('U1')).toEqual([]);
    const [auditoria] = await consultar<{ anterior: { facturaAnterior: { numero: string; total: string } } }>(
      `select anterior from core.auditoria where recurso = 'libro-de-compras.documentos' and accion = 'eliminar'
         and registro_id = $1`,
      [id],
    );
    expect(auditoria?.anterior.facturaAnterior).toMatchObject({ numero: 'U1', total: '1120.00' });
  });

  it('eliminar una de dos notas deja la factura anterior', async () => {
    const primera = await registrar(nota('NCRE', { facturaAnterior: anterior('U2') }));
    await registrar(nota('NDEB', { facturaAnterior: anterior('U2') }));

    expect((await eliminar(primera)).estado).toBe(200);

    expect(await facturasAnteriores('U2')).toHaveLength(1);
  });

  it('anular la nota deja la factura anterior, y aún así no se borra al eliminar otra', async () => {
    const id = await registrar(nota('NCRE', { facturaAnterior: anterior('U3') }));

    expect((await anular(id)).estado).toBe(200);

    expect(await facturasAnteriores('U3')).toHaveLength(1);
  });

  it('una nota de débito que sostiene notas de crédito no se anula ni se elimina, contando las notas de débito anteriores', async () => {
    const conAnteriores = anterior('U4', {
      notasDeDebitoAnterioresTotal: '560.00',
      notasDeDebitoAnterioresIva: '60.00',
    });
    const debito = await registrar(nota('NDEB', { facturaAnterior: conAnteriores }));
    // Cabe en 1,120 + 560 + 560 = 2,240, pero sin la nota de débito solo caben 1,680.
    await registrar(
      nota('NCRE', {
        facturaAnterior: conAnteriores,
        lineas: [{ conceptoId: escenario.conceptoId, total: '2000.00' }],
      }),
    );

    const anulada = await anular(debito);
    const eliminada = await eliminar(debito);

    expect(anulada.estado).toBe(422);
    expect(anulada.cuerpo.error.codigo).toBe('nota_de_debito_sostiene_notas_de_credito');
    expect(eliminada.estado).toBe(422);
    expect(eliminada.cuerpo.error.codigo).toBe('nota_de_debito_sostiene_notas_de_credito');
  });

  it('si las notas de crédito siguen cabiendo sin ella, la nota de débito sí se da de baja', async () => {
    const conAnteriores = anterior('U5', {
      notasDeDebitoAnterioresTotal: '560.00',
      notasDeDebitoAnterioresIva: '60.00',
    });
    const debito = await registrar(nota('NDEB', { facturaAnterior: conAnteriores }));
    await registrar(
      nota('NCRE', {
        facturaAnterior: conAnteriores,
        lineas: [{ conceptoId: escenario.conceptoId, total: '1500.00' }],
      }),
    );

    expect((await eliminar(debito)).estado).toBe(200);
    expect(await facturasAnteriores('U5')).toHaveLength(1);
  });
});

describe('Documento que modifica', () => {
  let facturaId = '';
  let notaDelLibro = '';
  let notaAnterior = '';

  beforeAll(async () => {
    facturaId = await registrar(documentoDePrueba(escenario, { serie: 'L', numero: 'F-LIBRO' }));
    notaDelLibro = await registrar(nota('NCRE', { documentoAfectadoId: facturaId }));
    notaAnterior = await registrar(nota('NCRE', { facturaAnterior: anterior('F900') }));
  });

  const ficha = async (id: string) => (await propietario().get(`${RUTA_DOCUMENTOS}/${id}`)).cuerpo;

  it('la ficha de una nota sobre una factura del libro la enlaza', async () => {
    expect((await ficha(notaDelLibro)).documentoQueModifica).toEqual({
      origen: 'libro',
      documentoId: facturaId,
      tipo: 'factura',
      serie: 'L',
      numero: 'F-LIBRO',
      fechaEmision: HOY,
    });
  });

  it('la ficha de una nota sobre una factura anterior dice que es del sistema anterior', async () => {
    const cuerpo = await ficha(notaAnterior);

    expect(cuerpo.documentoQueModifica).toEqual({
      origen: 'sistema_anterior',
      documentoId: null,
      tipo: 'factura',
      serie: 'B',
      numero: 'F900',
      fechaEmision: FACTURA_ANTERIOR,
    });
    expect(cuerpo.facturaAnterior).toMatchObject({ numero: 'F900' });
  });

  it('la ficha de una factura no trae documento que modifica', async () => {
    expect((await ficha(facturaId)).documentoQueModifica).toBeNull();
  });

  it('el Excel del libro trae la columna al final, solo llena en las notas', async () => {
    const respuesta = await propietario().get(`/api/libro-de-compras/libro/exportar?periodo=${PERIODO}`);

    expect(respuesta.estado).toBe(200);
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(respuesta.cuerpo as ArrayBuffer);
    const hoja = libro.getWorksheet('Libro')!;
    const ultima = hoja.columnCount;
    const valores: string[] = [];
    hoja.eachRow((fila) => valores.push(String(fila.getCell(ultima).value ?? '')));
    expect(valores[0]).toBe('Documento que modifica');
    const dd = (fecha: string) => fecha.split('-').reverse().join('/');
    expect(valores).toContain(`L-F-LIBRO del ${dd(HOY)}`);
    expect(valores).toContain(`B-F900 del ${dd(FACTURA_ANTERIOR)}`);
    const llenas = valores.slice(1).filter((valor) => valor !== '');
    expect(llenas.length).toBeGreaterThanOrEqual(2);
    expect(llenas.every((valor) => valor.includes(' del '))).toBe(true);
  });
});

describe('sugerencias de facturas anteriores', () => {
  const ruta = () => `/api/libro-de-compras/proveedores/${escenario.proveedorId}/facturas-anteriores`;

  beforeAll(async () => {
    const operador = await operadorDeLaBandeja(escenario);
    const loteId = await sembrarLote(operador, { emisionDesde: haceDias(60), emisionHasta: HOY });
    const delProveedor = { proveedorId: escenario.proveedorId };
    await sembrarFila(operador, loteId, { ...delProveedor, serie: 'S', numero: 'DTE1', fechaEmision: haceDias(30) });
    await sembrarFila(operador, loteId, { ...delProveedor, serie: 'S', numero: 'DTE2', fechaEmision: haceDias(5) });
    await sembrarFila(operador, loteId, {
      ...delProveedor,
      tipoDte: 'NCRE',
      serie: 'S',
      numero: 'DTE3',
      fechaEmision: haceDias(30),
    });
    // La misma factura que ya cita una nota (B-F900): no se vuelve a proponer.
    await sembrarFila(operador, loteId, {
      ...delProveedor,
      serie: 'B',
      numero: 'F900',
      fechaEmision: FACTURA_ANTERIOR,
    });
  });

  it('trae las ya usadas y los DTE de factura de la bandeja anteriores a la fecha de inicio, sin repetir', async () => {
    const respuesta = await propietario().get(ruta());

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.fechaDeInicio).toBe(FECHA_DE_INICIO);
    expect(respuesta.cuerpo.usadas.map((f: any) => f.numero)).toContain('F900');
    expect(respuesta.cuerpo.deLaBandeja.map((f: any) => f.numero)).toEqual(['DTE1']);
    expect(respuesta.cuerpo.deLaBandeja[0]).toMatchObject({
      tipo: 'factura',
      total: '1120.00',
      iva: '120.00',
      motivoSinCredito: null,
    });
  });

  it('exige documentos.crear y un proveedor de la cuenta', async () => {
    expect((await soloVer.get(ruta())).estado).toBe(403);
    const inexistente = await propietario().get(
      `/api/libro-de-compras/proveedores/${crypto.randomUUID()}/facturas-anteriores`,
    );
    expect(inexistente.estado).toBe(404);
  });
});
