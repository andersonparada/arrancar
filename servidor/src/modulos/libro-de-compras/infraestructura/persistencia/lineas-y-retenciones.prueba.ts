/**
 * Prueba de integración contra PostgreSQL (base de pruebas): seguridad por empresa, `check` y llaves de las
 * líneas (3.6) y de las retenciones (3.7), y el borrado en cascada desde el documento.
 */
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { documentos } from './documentos.tablas.js';
import {
  contextoDe,
  documentoValido,
  errorDePostgres,
  insertarDocumento,
  lineaValida,
  prepararEscenario,
  type Escenario,
} from './documentos.soporte.js';
import { lineasDeDocumento } from './lineas-de-documento.tablas.js';
import { retenciones } from './retenciones.tablas.js';

let e: Escenario;
let facturaA1: string;

const enA1 = () => contextoDe(e, e.empresaA1, e.cuentaA);
const enA2 = () => contextoDe(e, e.empresaA2, e.cuentaA);
const enB = () => contextoDe(e, e.empresaB, e.cuentaB);

const conVigencia = (cambios: Record<string, unknown>) =>
  cambios.vigenciaDeCombustibleId === '@vigencia' ? { ...cambios, vigenciaDeCombustibleId: e.vigenciaA1 } : cambios;
const insertarLinea = (cambios: Record<string, unknown> = {}, contexto = enA1()) =>
  enTransaccionSegura(contexto, (tx) =>
    tx
      .insert(lineasDeDocumento)
      .values(lineaValida(e, facturaA1, conVigencia(cambios)))
      .returning(),
  );
const restriccionDeLinea = async (cambios: Record<string, unknown>) =>
  (await errorDePostgres(insertarLinea(cambios)))?.constraint;

const retencionValida = (cambios: Record<string, unknown> = {}) =>
  ({
    empresaId: e.empresaA1,
    documentoId: facturaA1,
    impuesto: 'iva',
    regla: 'iva_exportador',
    base: '100',
    porcentaje: '15',
    montoPropuesto: '10',
    monto: '10',
    fecha: '2026-03-10',
    ...cambios,
  }) as typeof retenciones.$inferInsert;
const insertarRetencion = (cambios: Record<string, unknown> = {}, contexto = enA1()) =>
  enTransaccionSegura(contexto, (tx) => tx.insert(retenciones).values(retencionValida(cambios)).returning());
const restriccionDeRetencion = async (cambios: Record<string, unknown>) =>
  (await errorDePostgres(insertarRetencion(cambios)))?.constraint;

/** La vigencia real se conoce al correr (`@vigencia`): las tablas de casos se arman antes del escenario. */
const COMBUSTIBLE = {
  vigenciaDeCombustibleId: '@vigencia',
  galones: '10',
  idpPorGalon: '4.70',
  porcentajeDeEtanol: '0',
};

beforeAll(async () => {
  e = await prepararEscenario('lineas');
  facturaA1 = await insertarDocumento(documentoValido(e), enA1());
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('líneas: seguridad por empresa y llaves', () => {
  it('cada empresa ve solo las suyas', async () => {
    await insertarLinea();
    const visibles = (contexto: ReturnType<typeof enA1>) =>
      enTransaccionSegura(contexto, (tx) => tx.select().from(lineasDeDocumento));

    expect(await visibles(enA1())).toHaveLength(1);
    expect(await visibles(enA2())).toEqual([]);
    expect(await visibles(enB())).toEqual([]);
  });

  it('no se puede escribir en otra empresa ni apuntar al documento, concepto o vigencia de otra', async () => {
    const enOtraEmpresa = insertarLinea({ numero: 2 }, enA2());
    const conceptoAjeno = restriccionDeLinea({ numero: 3, conceptoId: e.conceptoA2 });
    const vigenciaAjena = restriccionDeLinea({
      numero: 4,
      ...COMBUSTIBLE,
      vigenciaDeCombustibleId: e.vigenciaA2,
      idp: '47',
      total: '159',
    });
    const documentoAjeno = errorDePostgres(insertarLinea({ empresaId: e.empresaA2, numero: 20 }, enA2()));

    await expect(enOtraEmpresa).rejects.toThrow();
    expect(await conceptoAjeno).toBe('lineas_de_documento_concepto_fk');
    expect(await vigenciaAjena).toBe('lineas_de_documento_vigencia_fk');
    expect((await documentoAjeno)?.constraint).toBe('lineas_de_documento_documento_fk');
  });

  it('el número de línea no se repite en el documento', async () => {
    expect(await restriccionDeLinea({ numero: 1 })).toBe('lineas_de_documento_numero_unico');
  });
});

describe('líneas: cada check', () => {
  it.each([
    ['numero_positivo', { numero: 0 }],
    ['tipo_valido', { tipo: 'otro' }],
    ['descripcion_largo', { descripcion: '' }],
    ['total_positivo', { total: '0', base: '0', iva: '0' }],
    ['exento_no_negativo', { exento: '-1', base: '101' }],
    ['base_no_negativa', { base: '-1', exento: '101' }],
    ['iva_no_acreditable_rango', { ivaNoAcreditable: '13' }],
    ['totales_cuadran', { total: '113' }],
    ['galones_positivos', { ...COMBUSTIBLE, galones: '0', total: '112' }],
    ['combustible_completo', { galones: '5' }],
    ['combustible_es_bien', { ...COMBUSTIBLE, tipo: 'servicio', idp: '47', total: '159' }],
    ['activo_fijo_es_bien', { tipo: 'servicio', esActivoFijo: true }],
    ['idp_calculado', { ...COMBUSTIBLE, idp: '40', total: '152' }],
  ])('rechaza %s', async (regla, cambios) => {
    const restriccion = await restriccionDeLinea({ numero: 9, ...cambios });

    expect(restriccion).toBe(`lineas_de_documento_${regla}`);
  });

  it('rechaza un IVA negativo y un IDP negativo', async () => {
    const iva = await restriccionDeLinea({ numero: 9, iva: '-12', base: '112', total: '100' });
    const idp = await restriccionDeLinea({ numero: 9, idp: '-1', base: '101' });

    expect(iva).toMatch(/^lineas_de_documento_iva_(no_negativo|no_acreditable_rango)$/);
    expect(idp).toMatch(/^lineas_de_documento_idp_(no_negativo|calculado)$/);
  });

  it('acepta el combustible con IDP calculado: galones x tasa x (100 - etanol) / 100', async () => {
    const combustible = { numero: 9, ...COMBUSTIBLE, porcentajeDeEtanol: '10', idp: '42.30', base: '57.70' };

    await expect(insertarLinea(combustible)).resolves.toBeTruthy();
  });
});

describe('retenciones: seguridad por empresa, llaves y check', () => {
  it('cada empresa ve solo las suyas y no se escribe en otra', async () => {
    await insertarRetencion();
    const visibles = (contexto: ReturnType<typeof enA1>) =>
      enTransaccionSegura(contexto, (tx) => tx.select().from(retenciones));

    expect(await visibles(enA1())).toHaveLength(1);
    expect(await visibles(enA2())).toEqual([]);
    expect(await visibles(enB())).toEqual([]);
    await expect(insertarRetencion({ regla: 'iva_sector_publico' }, enA2())).rejects.toThrow();
  });

  it('una regla no se repite en el documento ni apunta al documento de otra empresa', async () => {
    const repetida = await restriccionDeRetencion({});
    const ajena = errorDePostgres(insertarRetencion({ empresaId: e.empresaA2, regla: 'iva_sector_publico' }, enA2()));

    expect(repetida).toBe('retenciones_documento_regla_unico');
    expect((await ajena)?.constraint).toBe('retenciones_documento_fk');
  });

  it.each([
    ['impuesto_de_la_regla', { impuesto: 'isr' }],
    ['base_positiva', { base: '0', monto: '0', montoPropuesto: '0' }],
    ['porcentaje_rango', { regla: 'iva_otro_agente', porcentaje: '101' }],
    ['porcentaje_nulo_solo_isr', { regla: 'iva_otro_agente', porcentaje: null }],
    ['monto_propuesto_no_negativo', { montoPropuesto: '-1', motivoDelAjuste: 'x' }],
    ['monto_rango', { regla: 'iva_otro_agente', monto: '101', montoPropuesto: '101' }],
    ['motivo_del_ajuste', { regla: 'iva_otro_agente', monto: '5' }],
    ['fecha_obligatoria', { regla: 'iva_otro_agente', fecha: null }],
    ['constancia_completa', { regla: 'iva_otro_agente', constanciaNumero: 'C1' }],
  ])('rechaza %s', async (regla, cambios) => {
    expect(await restriccionDeRetencion(cambios)).toBe(`retenciones_${regla}`);
  });

  it('rechaza un impuesto o una regla desconocidos', async () => {
    const impuesto = await restriccionDeRetencion({ regla: 'iva_otro_agente', impuesto: 'otro' });
    const regla = await restriccionDeRetencion({ regla: 'otra', impuesto: 'otra' });

    expect(impuesto).toMatch(/^retenciones_impuesto_(valido|de_la_regla)$/);
    expect(regla).toMatch(/^retenciones_(regla_valida|impuesto_valido)$/);
  });

  it('el IVA de pequeño contribuyente puede quedar sin fecha, y el ISR sin porcentaje', async () => {
    const sinFecha = { regla: 'iva_pequeno_contribuyente', fecha: null };
    const escalonado = { impuesto: 'isr', regla: 'isr_opcional_simplificado', porcentaje: null };

    await expect(insertarRetencion(sinFecha)).resolves.toBeTruthy();
    await expect(insertarRetencion(escalonado)).resolves.toBeTruthy();
  });

  it('al eliminar el documento se van sus líneas y sus retenciones', async () => {
    const eliminar = () =>
      enTransaccionSegura(enA1(), (tx) => tx.delete(documentos).where(eq(documentos.id, facturaA1)));
    await eliminar();

    expect(await enTransaccionSegura(enA1(), (tx) => tx.select().from(lineasDeDocumento))).toEqual([]);
    expect(await enTransaccionSegura(enA1(), (tx) => tx.select().from(retenciones))).toEqual([]);
  });
});
