/**
 * Prueba de integración contra PostgreSQL (base de pruebas): los `check` de otros impuestos (documento y línea) y del
 * IDP escrito (línea), pasos L4-1 del diseño (3.3b.3 y 3.3b.4).
 */
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import {
  contextoDe,
  documentoValido,
  errorDePostgres,
  insertarDocumento,
  lineaValida,
  prepararEscenario,
  type Escenario,
} from './documentos.soporte.js';
import { documentos } from './documentos.tablas.js';
import { lineasDeDocumento } from './lineas-de-documento.tablas.js';

let e: Escenario;
let facturaA1: string;
let numeroDeLinea = 1;

const enA1 = () => contextoDe(e, e.empresaA1, e.cuentaA);

const restriccionDeDocumento = async (cambios: Record<string, unknown>) =>
  (await errorDePostgres(insertarDocumento(documentoValido(e, cambios), enA1())))?.constraint;

const insertarLinea = (cambios: Record<string, unknown>) => {
  numeroDeLinea += 1;
  const valores = lineaValida(e, facturaA1, { numero: numeroDeLinea, ...cambios });
  return enTransaccionSegura(enA1(), (tx) => tx.insert(lineasDeDocumento).values(valores).returning());
};
const restriccionDeLinea = async (cambios: Record<string, unknown>) =>
  (await errorDePostgres(insertarLinea(cambios)))?.constraint;

/** Un combustible de 10 galones a Q4.70: el IDP calculado sería Q47. */
const conVigencia = (cambios: Record<string, unknown>) => ({
  vigenciaDeCombustibleId: e.vigenciaA1,
  galones: '10',
  idpPorGalon: '4.70',
  porcentajeDeEtanol: '0',
  ...cambios,
});

beforeAll(async () => {
  e = await prepararEscenario('otrosimpuestos');
  facturaA1 = await insertarDocumento(documentoValido(e), enA1());
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('otros impuestos en el documento', () => {
  it('cuadra solo si se suman al total', async () => {
    const conOtros = { total: '127', base: '100', iva: '12', otrosImpuestos: '15' };

    await expect(insertarDocumento(documentoValido(e, conOtros), enA1())).resolves.toBeTruthy();
    expect(await restriccionDeDocumento({ total: '127', base: '100', iva: '12' })).toBe('documentos_totales_cuadran');
  });

  it('no puede ser negativo', async () => {
    const restriccion = await restriccionDeDocumento({ total: '111', base: '100', iva: '12', otrosImpuestos: '-1' });

    expect(restriccion).toBe('documentos_otros_impuestos_no_negativo');
  });

  it('sin el dato vale cero y lo registrado sigue cuadrando', async () => {
    const id = await insertarDocumento(documentoValido(e), enA1());
    const [fila] = await enTransaccionSegura(enA1(), (tx) => tx.select().from(documentos).where(eq(documentos.id, id)));

    expect(fila?.otrosImpuestos).toBe('0.00');
  });
});

describe('otros impuestos en la línea', () => {
  it('cuadra solo si se suman al total', async () => {
    const conOtros = { total: '127', base: '100', iva: '12', otrosImpuestos: '15' };

    await expect(insertarLinea(conOtros)).resolves.toBeTruthy();
    expect(await restriccionDeLinea({ total: '127' })).toBe('lineas_de_documento_totales_cuadran');
  });

  it('no puede ser negativo', async () => {
    const restriccion = await restriccionDeLinea({ total: '111', otrosImpuestos: '-1' });

    expect(restriccion).toBe('lineas_de_documento_otros_impuestos_no_negativo');
  });
});

describe('IDP escrito en la línea', () => {
  const idpEscrito = { idpEscrito: true, idp: '40', total: '152', base: '100' };

  it('acepta un IDP sin combustible ni galones', async () => {
    await expect(insertarLinea(idpEscrito)).resolves.toBeTruthy();
  });

  it('acepta un IDP distinto del que salen de los galones', async () => {
    await expect(insertarLinea(conVigencia(idpEscrito))).resolves.toBeTruthy();
  });

  it('rechaza un IDP escrito en cero', async () => {
    const restriccion = await restriccionDeLinea({ idpEscrito: true, idp: '0' });

    expect(restriccion).toBe('lineas_de_documento_idp_escrito_positivo');
  });

  it('rechaza un IDP escrito en una línea de servicio', async () => {
    const restriccion = await restriccionDeLinea({ ...idpEscrito, tipo: 'servicio' });

    expect(restriccion).toBe('lineas_de_documento_idp_escrito_positivo');
  });

  it('sin la marca, un IDP que no coincide con los galones se rechaza', async () => {
    const restriccion = await restriccionDeLinea(conVigencia({ idp: '40', total: '152', base: '100' }));

    expect(restriccion).toBe('lineas_de_documento_idp_calculado');
  });

  it('sin la marca y sin combustible, el IDP sigue siendo cero', async () => {
    const restriccion = await restriccionDeLinea({ idp: '40', total: '152', base: '100' });

    expect(restriccion).toBe('lineas_de_documento_idp_calculado');
  });

  it('el combustible incompleto sigue rechazándose aunque el IDP sea escrito', async () => {
    const restriccion = await restriccionDeLinea({ ...idpEscrito, galones: '5' });

    expect(restriccion).toBe('lineas_de_documento_combustible_completo');
  });
});
