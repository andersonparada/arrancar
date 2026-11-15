/**
 * Prueba de integración contra PostgreSQL: los reintegros y sus líneas (checks por forma, únicos, llaves compuestas
 * hacia el proveedor, la nota y Bancos, cascada y RLS).
 */
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { aplicacionesDeReintegros } from './aplicaciones-de-reintegros.tablas.js';
import { documentos } from './documentos.tablas.js';
import {
  contextoDe,
  crearDocumentoDeLibro,
  documentoValido,
  errorDePostgres,
  prepararEscenario,
  type Escenario,
} from './escenario.soporte.js';
import { prepararBancos } from './movimientos-de-bancos.soporte.js';
import { reintegros } from './reintegros.tablas.js';

let e: Escenario;
let nuevoMovimiento: () => Promise<string>;
let secuencia = 0;
const contexto = () => contextoDe(e, e.empresaA1, e.cuentaA);

type NuevoReintegro = typeof reintegros.$inferInsert;

async function crearNota(proveedorId = e.proveedorA) {
  const documentoId = await crearDocumentoDeLibro(contexto(), proveedorId);
  const [fila] = await enTransaccionSegura(contexto(), (tx) =>
    tx
      .insert(documentos)
      .values(documentoValido(e, documentoId, { proveedorId }))
      .returning(),
  );
  return fila!;
}

async function crearReintegro(cambios: Partial<NuevoReintegro> = {}) {
  secuencia += 1;
  const enEfectivo = cambios.forma === 'efectivo';
  const valores: NuevoReintegro = {
    empresaId: e.empresaA1,
    proveedorId: e.proveedorA,
    numero: secuencia,
    forma: 'deposito',
    fecha: '2026-03-15',
    monto: '100',
    movimientoId: enEfectivo ? null : await nuevoMovimiento(),
    referencia: enEfectivo ? 'Recibo 1' : null,
    ...cambios,
  };
  const [fila] = await enTransaccionSegura(contexto(), (tx) => tx.insert(reintegros).values(valores).returning());
  return fila!;
}

const restriccion = async (operacion: Promise<unknown>) => (await errorDePostgres(operacion))?.constraint;

beforeAll(async () => {
  e = await prepararEscenario('cuentasporpagarreintegros');
  nuevoMovimiento = await prepararBancos(contexto());
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('reintegros', () => {
  it('guarda un depósito con su movimiento y un efectivo con su recibo', async () => {
    const deposito = await crearReintegro();
    const efectivo = await crearReintegro({ forma: 'efectivo' });

    expect(deposito).toMatchObject({ estado: 'vigente', anioDeNumero: 0 });
    expect(efectivo).toMatchObject({ movimientoId: null, referencia: 'Recibo 1' });
  });

  it('el número es positivo y no se repite por empresa y año', async () => {
    const primero = await crearReintegro();

    expect(await restriccion(crearReintegro({ numero: 0 }))).toBe('reintegros_numero_positivo');
    expect(await restriccion(crearReintegro({ numero: primero.numero }))).toBe('reintegros_numero_unico');
    await expect(crearReintegro({ numero: primero.numero, anioDeNumero: 2026 })).resolves.toBeDefined();
  });

  it('la forma es depósito o efectivo y el monto es positivo', async () => {
    expect(await restriccion(crearReintegro({ forma: 'cheque' as never }))).toBe('reintegros_forma_valida');
    expect(await restriccion(crearReintegro({ monto: '0' }))).toBe('reintegros_monto_positivo');
  });

  it('solo el depósito lleva movimiento, y no se usa dos veces', async () => {
    const movimientoId = await nuevoMovimiento();
    await crearReintegro({ movimientoId });

    expect(await restriccion(crearReintegro({ movimientoId: null }))).toBe('reintegros_movimiento_de_su_forma');
    expect(await restriccion(crearReintegro({ forma: 'efectivo', movimientoId: await nuevoMovimiento() }))).toBe(
      'reintegros_movimiento_de_su_forma',
    );
    expect(await restriccion(crearReintegro({ movimientoId }))).toBe('reintegros_movimiento_unico');
    expect(await restriccion(crearReintegro({ movimientoId: crypto.randomUUID() }))).toBe('reintegros_movimiento_fk');
  });

  it('el efectivo exige su referencia, que va recortada y de 1 a 100 caracteres', async () => {
    expect(await restriccion(crearReintegro({ forma: 'efectivo', referencia: null }))).toBe(
      'reintegros_referencia_en_efectivo',
    );
    for (const referencia of [' con espacios ', '', 'x'.repeat(101)]) {
      expect(await restriccion(crearReintegro({ referencia }))).toBe('reintegros_referencia_valida');
    }
    await expect(crearReintegro({ referencia: 'x'.repeat(100) })).resolves.toBeDefined();
  });

  it('el estado es vigente o anulado, y la anulación se escribe completa', async () => {
    const completa = {
      anuladoEn: new Date(),
      anuladoPor: e.usuarioId,
      motivoDeAnulacion: 'Error',
      fechaDeAnulacion: '2026-03-15',
    };

    expect(await restriccion(crearReintegro({ estado: 'cobrado' as never }))).toBe('reintegros_estado_valido');
    expect(await restriccion(crearReintegro({ estado: 'anulado' }))).toBe('reintegros_anulacion_completa');
    expect(await restriccion(crearReintegro({ ...completa }))).toBe('reintegros_anulacion_completa');
    expect(await restriccion(crearReintegro({ estado: 'anulado', ...completa, motivoDeAnulacion: '' }))).toBe(
      'reintegros_motivo_de_anulacion_rango',
    );
    await expect(crearReintegro({ estado: 'anulado', ...completa })).resolves.toBeDefined();
  });

  it('la fecha de la anulación va si y solo si está anulado, y no es anterior a la del registro', async () => {
    const completa = { anuladoEn: new Date(), anuladoPor: e.usuarioId, motivoDeAnulacion: 'Error' };
    const anulado = (fechaDeAnulacion?: string) => ({ estado: 'anulado' as const, ...completa, fechaDeAnulacion });

    expect(await restriccion(crearReintegro(anulado()))).toBe('reintegros_fecha_de_anulacion_de_su_estado');
    expect(await restriccion(crearReintegro({ fechaDeAnulacion: '2026-03-15' }))).toBe(
      'reintegros_fecha_de_anulacion_de_su_estado',
    );
    expect(await restriccion(crearReintegro(anulado('2026-03-14')))).toBe('reintegros_fecha_de_anulacion_valida');
    await expect(crearReintegro(anulado('2026-03-15'))).resolves.toBeDefined();
    await expect(crearReintegro(anulado('2026-05-01'))).resolves.toBeDefined();
  });

  it('las observaciones van recortadas y de 1 a 500 caracteres', async () => {
    for (const observaciones of [' con espacios ', '', 'x'.repeat(501)]) {
      expect(await restriccion(crearReintegro({ observaciones }))).toBe('reintegros_observaciones_validas');
    }
  });

  it('el proveedor debe existir', async () => {
    expect(await restriccion(crearReintegro({ proveedorId: crypto.randomUUID() }))).toBe('reintegros_proveedor_fk');
  });

  it('cada empresa ve solo sus reintegros', async () => {
    await crearReintegro();

    const enA2 = await enTransaccionSegura(contextoDe(e, e.empresaA2, e.cuentaA), (tx) => tx.select().from(reintegros));

    expect(enA2).toEqual([]);
  });
});

describe('líneas de un reintegro', () => {
  const aplicar = (reintegroId: string, notaId: string, cambios: { monto?: string; proveedorId?: string } = {}) =>
    enTransaccionSegura(contexto(), (tx) =>
      tx.insert(aplicacionesDeReintegros).values({
        empresaId: e.empresaA1,
        proveedorId: cambios.proveedorId ?? e.proveedorA,
        reintegroId,
        notaId,
        monto: cambios.monto ?? '50',
      }),
    );

  it('aplica una nota del proveedor, una sola vez por reintegro', async () => {
    const reintegro = await crearReintegro();
    const nota = await crearNota();
    await aplicar(reintegro.id, nota.id);

    expect(await restriccion(aplicar(reintegro.id, nota.id))).toBe('aplicaciones_de_reintegros_par_unico');
    expect(await restriccion(aplicar(reintegro.id, (await crearNota()).id, { monto: '0' }))).toBe(
      'aplicaciones_de_reintegros_monto_positivo',
    );
  });

  it('rechaza una nota de otro proveedor, venga como venga el proveedor de la fila', async () => {
    const reintegro = await crearReintegro();
    const ajena = await crearNota(e.proveedorA2);

    expect(await restriccion(aplicar(reintegro.id, ajena.id))).toBe('aplicaciones_de_reintegros_nota_fk');
    expect(await restriccion(aplicar(reintegro.id, ajena.id, { proveedorId: e.proveedorA2 }))).toBe(
      'aplicaciones_de_reintegros_reintegro_fk',
    );
  });

  it('al eliminar la nota se van sus líneas; un reintegro con líneas no se borra', async () => {
    const reintegro = await crearReintegro();
    const nota = await crearNota();
    await aplicar(reintegro.id, nota.id);

    const alBorrar = await errorDePostgres(
      enTransaccionSegura(contexto(), (tx) => tx.delete(reintegros).where(eq(reintegros.id, reintegro.id))),
    );
    await enTransaccionSegura(contexto(), (tx) => tx.delete(documentos).where(eq(documentos.id, nota.id)));
    const quedan = await enTransaccionSegura(contexto(), (tx) =>
      tx.select().from(aplicacionesDeReintegros).where(eq(aplicacionesDeReintegros.reintegroId, reintegro.id)),
    );

    expect(alBorrar?.code).toBe('23503');
    expect(quedan).toEqual([]);
  });

  it('cada empresa ve solo las líneas de sus reintegros', async () => {
    await aplicar((await crearReintegro()).id, (await crearNota()).id);

    const enA2 = await enTransaccionSegura(contextoDe(e, e.empresaA2, e.cuentaA), (tx) =>
      tx.select().from(aplicacionesDeReintegros),
    );

    expect(enA2).toEqual([]);
  });
});
