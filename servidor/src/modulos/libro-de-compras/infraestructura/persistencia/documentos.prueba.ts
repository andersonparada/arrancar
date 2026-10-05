/**
 * Prueba de integración contra PostgreSQL (base de pruebas): seguridad por empresa de los documentos, cada
 * `check` del diseño 3.5, las llaves (proveedor de la cuenta y factura de la nota) y la unicidad de los documentos.
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
  prepararEscenario,
  type Escenario,
} from './documentos.soporte.js';

let e: Escenario;

const enA1 = () => contextoDe(e, e.empresaA1, e.cuentaA);
const enA2 = () => contextoDe(e, e.empresaA2, e.cuentaA);
const enB = () => contextoDe(e, e.empresaB, e.cuentaB);
const crear = (cambios: Record<string, unknown> = {}, contexto = enA1()) =>
  insertarDocumento(documentoValido(e, { empresaId: contexto.empresaId, ...cambios }), contexto);
const restriccionDe = async (cambios: Record<string, unknown>) => (await errorDePostgres(crear(cambios)))?.constraint;

beforeAll(async () => {
  e = await prepararEscenario('documentos');
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('documentos: seguridad por empresa', () => {
  it('cada empresa ve solo los suyos, aunque sea de la misma cuenta', async () => {
    await crear();
    const visibles = (contexto: ReturnType<typeof enA1>) =>
      enTransaccionSegura(contexto, (tx) => tx.select().from(documentos));

    expect(await visibles(enA1())).toHaveLength(1);
    expect(await visibles(enA2())).toEqual([]);
    expect(await visibles(enB())).toEqual([]);
  });

  it('no se puede escribir un documento de otra empresa', async () => {
    await expect(crear({ empresaId: e.empresaA1 }, enA2())).rejects.toThrow();
  });
});

/** Un documento fuera del libro con todo en regla: sin FEL, sin IVA y con su motivo. */
const FUERA = {
  muestraEnReportesSat: false,
  motivoFueraDelLibro: 'sin_fel',
  nitEmisor: null,
  serie: null,
  autorizacionFel: null,
  iva: '0',
  base: '112',
};

const NOTA = { tipo: 'nota_de_credito', fechaRecepcion: '2026-04-10', periodo: '2026-04-01' };

describe('documentos: cada check', () => {
  it.each([
    ['tipo_valido', { tipo: 'otro' }],
    ['destino_valido', { destino: 'banco' }],
    ['motivo_sin_credito_valido', { motivoSinCredito: 'otro' }],
    ['estado_valido', { estado: 'otro' }],
    ['nit_emisor_valido', { nitEmisor: 'CF' }],
    ['nombre_emisor_largo', { nombreEmisor: '   ' }],
    ['serie_valida', { serie: 'a' }],
    ['numero_valido', { numero: 'a 1' }],
    ['fechas_ordenadas', { fechaRecepcion: '2026-03-09' }],
    ['total_positivo', { total: '0', base: '0', iva: '0' }],
    ['base_no_negativa', { base: '-1', exento: '101' }],
    ['idp_no_negativo', { idp: '-1', base: '101' }],
    ['exento_no_negativo', { exento: '-1', base: '101' }],
    ['totales_cuadran', { total: '113' }],
    ['observaciones_largo', { observaciones: '' }],
    ['periodo_primer_dia', { periodo: '2026-03-15' }],
    ['periodo_desde_emision', { periodo: '2026-02-01' }],
    ['plazo_del_credito', { periodo: '2026-06-01' }],
    ['fuera_de_plazo_real', { motivoSinCredito: 'fuera_de_plazo', ivaNoAcreditable: '12' }],
    ['nota_con_factura', { ...NOTA }],
    ['datos_sat', { serie: null }],
    ['motivo_fuera_del_libro_valido', { motivoFueraDelLibro: 'otro' }],
    ['muestra_segun_motivo', { muestraEnReportesSat: false }],
    ['muestra_segun_motivo', { motivoFueraDelLibro: 'fel_a_otro_nit' }],
    ['sin_fel_sin_autorizacion', { ...FUERA, autorizacionFel: crypto.randomUUID() }],
    ['fel_con_autorizacion', { ...FUERA, motivoFueraDelLibro: 'fel_a_otro_nit', autorizacionFel: null }],
    ['sin_sat_sin_credito', { ...FUERA, base: '100', iva: '12' }],
    ['pequeno_contribuyente', { tipo: 'factura_pequeno_contribuyente', iva: '0', base: '112' }],
    [
      'pequeno_contribuyente_sin_iva',
      { tipo: 'factura_pequeno_contribuyente', motivoSinCredito: 'pequeno_contribuyente' },
    ],
    ['iva_no_acreditable_por_motivo', { ivaNoAcreditable: '5' }],
    ['exento_sin_iva', { motivoSinCredito: 'exento' }],
    ['anulacion_completa', { estado: 'anulado' }],
    ['recibo_desmarcado', { tipo: 'recibo' }],
  ])('rechaza %s', async (regla, cambios) => {
    expect(await restriccionDe(cambios)).toBe(`documentos_${regla}`);
  });

  it('rechaza un IVA negativo y uno no acreditable fuera de rango', async () => {
    const ivaNegativo = await restriccionDe({ iva: '-12', base: '112', total: '100' });
    const fueraDeRango = await restriccionDe({ ivaNoAcreditable: '13' });

    expect(ivaNegativo).toMatch(/^documentos_iva_(no_negativo|no_acreditable_rango)$/);
    expect(fueraDeRango).toMatch(/^documentos_iva_no_acreditable_(rango|por_motivo)$/);
  });

  it('rechaza un motivo de anulación vacío', async () => {
    const anulado = { estado: 'anulado', anuladoEn: new Date(), anuladoPor: e.usuarioId, motivoDeAnulacion: ' ' };

    expect(await restriccionDe(anulado)).toBe('documentos_motivo_de_anulacion_largo');
  });

  it('rechaza una nota fuera del mes en que se recibe', async () => {
    const factura = await crear();
    const nota = { ...NOTA, documentoAfectadoId: factura, periodo: '2026-03-01' };

    expect(await restriccionDe(nota)).toBe('documentos_nota_en_su_mes');
  });

  it('acepta una nota que hereda fuera_de_plazo aunque ella misma llegue dentro del plazo', async () => {
    const factura = await crear();
    const nota = { ...NOTA, documentoAfectadoId: factura, motivoSinCredito: 'fuera_de_plazo', ivaNoAcreditable: '12' };

    await expect(crear(nota)).resolves.toBeTruthy();
  });

  it('acepta una nota bien formada, una factura de pequeño contribuyente y un recibo desmarcado', async () => {
    const factura = await crear();
    const pequeno = { tipo: 'factura_pequeno_contribuyente', motivoSinCredito: 'pequeno_contribuyente' };
    const recibo = { ...FUERA, tipo: 'recibo' };
    const felAOtroNit = { ...FUERA, motivoFueraDelLibro: 'fel_a_otro_nit', autorizacionFel: crypto.randomUUID() };

    await expect(crear({ ...NOTA, documentoAfectadoId: factura })).resolves.toBeTruthy();
    await expect(crear({ ...pequeno, iva: '0', base: '112', ivaNoAcreditable: '0' })).resolves.toBeTruthy();
    await expect(crear(recibo)).resolves.toBeTruthy();
    await expect(crear(felAOtroNit)).resolves.toBeTruthy();
  });
});

describe('documentos: llaves', () => {
  it('el proveedor debe ser de la misma cuenta (llave compuesta)', async () => {
    const error = await errorDePostgres(crear({ proveedorId: e.proveedorB }));

    expect(error?.constraint).toBe('documentos_proveedor_fk');
  });

  it('la nota no puede apuntar a una factura de otro proveedor, otro destino ni otra empresa', async () => {
    const deOtroProveedor = await crear({ proveedorId: e.proveedorA2 });
    const deOtroDestino = await crear({ destino: 'caja-chica' });
    const deOtraEmpresa = await crear({}, enA2());
    const apuntar = (documentoAfectadoId: string) => restriccionDe({ ...NOTA, documentoAfectadoId });

    expect(await apuntar(deOtroProveedor)).toBe('documentos_nota_factura_fk');
    expect(await apuntar(deOtroDestino)).toBe('documentos_nota_factura_fk');
    expect(await apuntar(deOtraEmpresa)).toBe('documentos_nota_factura_fk');
  });

  it('una factura con notas no se elimina', async () => {
    const factura = await crear();
    await crear({ ...NOTA, documentoAfectadoId: factura });

    const error = await errorDePostgres(
      enTransaccionSegura(enA1(), (tx) => tx.delete(documentos).where(eq(documentos.id, factura))),
    );

    expect(error?.code).toBe('23503');
  });
});
