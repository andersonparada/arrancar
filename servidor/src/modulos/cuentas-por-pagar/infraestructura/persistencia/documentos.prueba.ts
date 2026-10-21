/**
 * Prueba de integración contra PostgreSQL: las restricciones de `cuentas_por_pagar.documentos` (estado, notas,
 * vencimiento, separación de funciones, anulación) y sus llaves hacia Libro de compras.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { documentos } from './documentos.tablas.js';
import {
  contextoDe,
  crearDocumentoDeLibro,
  documentoValido,
  errorDePostgres,
  prepararEscenario,
  type Escenario,
} from './escenario.soporte.js';

let e: Escenario;
const contexto = () => contextoDe(e, e.empresaA1, e.cuentaA);

const insertar = (valores: typeof documentos.$inferInsert) =>
  enTransaccionSegura(contexto(), (tx) => tx.insert(documentos).values(valores).returning());

/** Crea el documento del libro y el de aquí con los cambios; devuelve la restricción que la base rechazó. */
async function restriccionDe(cambios: Record<string, unknown>): Promise<string | undefined> {
  const documentoId = await crearDocumentoDeLibro(contexto(), e.proveedorA);
  return (await errorDePostgres(insertar(documentoValido(e, documentoId, cambios))))?.constraint;
}

async function crear(cambios: Record<string, unknown> = {}) {
  const documentoId = await crearDocumentoDeLibro(contexto(), e.proveedorA);
  const [fila] = await insertar(documentoValido(e, documentoId, cambios));
  return fila!;
}

const quien = () => ({ registradoPor: e.usuarioId, registradoEn: new Date() });

beforeAll(async () => {
  e = await prepararEscenario('cuentasporpagardocumentos');
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('documentos por pagar: valores y montos', () => {
  it('guarda una factura pendiente con sus valores por omisión', async () => {
    const fila = await crear();

    expect(fila).toMatchObject({ estado: 'pendiente', retenciones: '0.00', autorizacionPropia: false });
  });

  it('rechaza un tipo o un estado que no existen y un total que no es positivo', async () => {
    expect(await restriccionDe({ tipo: 'cheque' })).toBe('documentos_tipo_valido');
    expect(await restriccionDe({ estado: 'pagado' })).toBe('documentos_estado_valido');
    expect(await restriccionDe({ total: '0' })).toBe('documentos_total_positivo');
  });

  it('las retenciones no pasan del total', async () => {
    await expect(crear({ retenciones: '112' })).resolves.toBeTruthy();

    expect(await restriccionDe({ retenciones: '112.01' })).toBe('documentos_retenciones_validas');
  });

  it('una nota de crédito no lleva retenciones ni vencimiento, y una factura sí tiene vencimiento', async () => {
    const nota = { tipo: 'nota_de_credito', documentoAfectadoId: crypto.randomUUID() };

    expect(await restriccionDe({ ...nota, vencimiento: null, retenciones: '1' })).toBe(
      'documentos_nota_de_credito_sin_retenciones',
    );
    expect(await restriccionDe({ ...nota, vencimiento: '2026-04-10' })).toBe('documentos_vencimiento_de_cargos');
    expect(await restriccionDe({ vencimiento: null })).toBe('documentos_vencimiento_de_cargos');
  });

  it('el vencimiento no es anterior a la emisión', async () => {
    expect(await restriccionDe({ vencimiento: '2026-03-09' })).toBe('documentos_vencimiento_desde_emision');
  });

  it('solo las notas llevan factura, y toda nota la lleva', async () => {
    expect(await restriccionDe({ documentoAfectadoId: crypto.randomUUID() })).toBe('documentos_nota_con_factura');
    expect(await restriccionDe({ tipo: 'nota_de_debito' })).toBe('documentos_nota_con_factura');
  });
});

describe('documentos por pagar: registro, autorización y anulación', () => {
  it('registrado y autorizado exigen quién y cuándo', async () => {
    expect(await restriccionDe({ estado: 'registrado' })).toBe('documentos_registro_completo');
    expect(await restriccionDe({ registradoPor: e.usuarioId })).toBe('documentos_registro_completo');
    await expect(crear({ estado: 'registrado', ...quien() })).resolves.toBeTruthy();
  });

  it('autorizado sin quién autorizó se rechaza, y la marca de lo propio exige la autorización', async () => {
    const registrado = { ...quien() };

    expect(await restriccionDe({ estado: 'autorizado', ...registrado })).toBe('documentos_autorizacion_completa');
    expect(await restriccionDe({ estado: 'registrado', ...registrado, autorizacionPropia: true })).toBe(
      'documentos_autorizacion_completa',
    );
  });

  it('autorizar lo que uno mismo registró o ingresó exige la marca de autorización propia', async () => {
    const otro = crypto.randomUUID();
    const autorizado = { estado: 'autorizado', autorizadoEn: new Date() };

    expect(await restriccionDe({ ...autorizado, ...quien(), autorizadoPor: e.usuarioId })).toBe(
      'documentos_separacion_de_funciones',
    );
    expect(
      await restriccionDe({ ...autorizado, registradoPor: otro, registradoEn: new Date(), autorizadoPor: e.usuarioId }),
    ).toBe('documentos_separacion_de_funciones');
    await expect(
      crear({ ...autorizado, ...quien(), autorizadoPor: e.usuarioId, autorizacionPropia: true }),
    ).resolves.toBeTruthy();
  });

  it('lo autoriza un tercero que ni ingresó ni registró', async () => {
    const tercero = crypto.randomUUID();
    const registro = { registradoPor: crypto.randomUUID(), registradoEn: new Date() };

    await expect(
      crear({ estado: 'autorizado', ...registro, autorizadoPor: tercero, autorizadoEn: new Date() }),
    ).resolves.toBeTruthy();
  });

  it('anulado exige quién, cuándo, el motivo y si estaba autorizado, y no al revés', async () => {
    const anulacion = { anuladoPor: e.usuarioId, anuladoEn: new Date(), motivoDeAnulacion: 'Error de captura' };

    expect(await restriccionDe({ estado: 'anulado', ...anulacion })).toBe('documentos_anulacion_completa');
    expect(await restriccionDe({ ...anulacion, estabaAutorizado: false })).toBe('documentos_anulacion_completa');
    await expect(crear({ estado: 'anulado', ...anulacion, estabaAutorizado: false })).resolves.toBeTruthy();
  });

  it('el motivo de anulación tiene entre 1 y 300 caracteres', async () => {
    const anulacion = { estado: 'anulado', anuladoPor: e.usuarioId, anuladoEn: new Date(), estabaAutorizado: false };

    expect(await restriccionDe({ ...anulacion, motivoDeAnulacion: '' })).toBe('documentos_motivo_rango');
    expect(await restriccionDe({ ...anulacion, motivoDeAnulacion: 'x'.repeat(301) })).toBe('documentos_motivo_rango');
  });
});

describe('documentos por pagar: llaves', () => {
  it('un documento de Libro de compras entra una sola vez', async () => {
    const documentoId = await crearDocumentoDeLibro(contexto(), e.proveedorA);
    await insertar(documentoValido(e, documentoId));

    const repetido = await errorDePostgres(insertar(documentoValido(e, documentoId)));

    expect(repetido?.constraint).toBe('documentos_documento_unico');
  });

  it('el documento del libro debe ser del mismo proveedor', async () => {
    const documentoId = await crearDocumentoDeLibro(contexto(), e.proveedorA2);

    const error = await errorDePostgres(insertar(documentoValido(e, documentoId)));

    expect(error?.constraint).toBe('documentos_documento_fk');
  });

  it('el documento del libro debe ir a este destino', async () => {
    const documentoId = await crearDocumentoDeLibro(contexto(), e.proveedorA, 'caja-chica');

    const error = await errorDePostgres(insertar(documentoValido(e, documentoId)));

    expect(error?.constraint).toBe('documentos_documento_fk');
  });

  it('la factura de una nota debe estar aquí y ser del mismo proveedor', async () => {
    const factura = await crear();
    const nota = { tipo: 'nota_de_debito', documentoAfectadoId: factura.documentoId };
    const sinFactura = { ...nota, documentoAfectadoId: crypto.randomUUID() };

    await expect(crear(nota)).resolves.toBeTruthy();
    expect(await restriccionDe(sinFactura)).toBe('documentos_factura_fk');
    expect(await restriccionDe({ ...nota, proveedorId: e.proveedorA2 })).toBe('documentos_documento_fk');
  });

  it('la nota apunta a una factura del mismo proveedor aunque el documento del libro coincida', async () => {
    const factura = await crear();
    const documentoId = await crearDocumentoDeLibro(contexto(), e.proveedorA2);
    const nota = documentoValido(e, documentoId, {
      tipo: 'nota_de_debito',
      proveedorId: e.proveedorA2,
      documentoAfectadoId: factura.documentoId,
    });

    const error = await errorDePostgres(insertar(nota));

    expect(error?.constraint).toBe('documentos_factura_fk');
  });
});

describe('documentos por pagar: seguridad por empresa', () => {
  it('cada empresa ve solo sus documentos', async () => {
    const propio = await crear();

    const enA2 = await enTransaccionSegura(contextoDe(e, e.empresaA2, e.cuentaA), (tx) => tx.select().from(documentos));
    const enA1 = await enTransaccionSegura(contexto(), (tx) => tx.select().from(documentos));

    expect(enA2).toEqual([]);
    expect(enA1.map((fila) => fila.id)).toContain(propio.id);
  });

  it('no deja crear documentos de otra empresa', async () => {
    const documentoId = await crearDocumentoDeLibro(contexto(), e.proveedorA);

    const error = await errorDePostgres(
      enTransaccionSegura(contextoDe(e, e.empresaA2, e.cuentaA), (tx) =>
        tx.insert(documentos).values(documentoValido(e, documentoId)),
      ),
    );

    expect(error?.code).toBe('42501');
  });
});
