/**
 * Prueba de integración contra PostgreSQL: los pagos (checks por forma, únicos, llaves hacia el proveedor y Bancos,
 * RLS) y la diferencia menor de un cargo ligada a su pago.
 */
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { ajustesDeSaldo } from './ajustes-de-saldo.tablas.js';
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
import { pagos } from './pagos.tablas.js';

let e: Escenario;
let nuevoMovimiento: () => Promise<string>;
let secuencia = 0;
const contexto = () => contextoDe(e, e.empresaA1, e.cuentaA);

async function crearDocumento(proveedorId = e.proveedorA) {
  const documentoId = await crearDocumentoDeLibro(contexto(), proveedorId);
  const [fila] = await enTransaccionSegura(contexto(), (tx) =>
    tx
      .insert(documentos)
      .values(documentoValido(e, documentoId, { proveedorId }))
      .returning(),
  );
  return fila!;
}

type NuevoPago = typeof pagos.$inferInsert;

async function pagoValido(cambios: Partial<NuevoPago> = {}): Promise<NuevoPago> {
  secuencia += 1;
  return {
    empresaId: e.empresaA1,
    proveedorId: e.proveedorA,
    numero: secuencia,
    forma: 'cheque',
    fecha: '2026-03-15',
    monto: '100',
    movimientoId: await nuevoMovimiento(),
    ...cambios,
  };
}

async function crearPago(cambios: Partial<NuevoPago> = {}) {
  const valores = await pagoValido(cambios);
  const [fila] = await enTransaccionSegura(contexto(), (tx) => tx.insert(pagos).values(valores).returning());
  return fila!;
}

const restriccion = async (operacion: Promise<unknown>) => (await errorDePostgres(operacion))?.constraint;

const apertura: Partial<NuevoPago> = {
  forma: 'cuenta_de_apertura',
  movimientoId: null,
  motivo: 'Cheque anterior',
  conCargaCerrada: false,
};
const anulacion = { anuladoEn: new Date(), anuladoPor: undefined as string | undefined, motivoDeAnulacion: 'Error' };

beforeAll(async () => {
  e = await prepararEscenario('cuentasporpagarpagos');
  nuevoMovimiento = await prepararBancos(contexto());
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('pagos', () => {
  it('guarda un cheque vigente y una cuenta de apertura sin movimiento', async () => {
    const cheque = await crearPago({ observaciones: 'Pago de marzo' });
    const deApertura = await crearPago({ ...apertura, referencia: 'CH-1' });

    expect(cheque).toMatchObject({ estado: 'vigente', anioDeNumero: 0, anuladoEn: null });
    expect(deApertura).toMatchObject({ movimientoId: null, conCargaCerrada: false });
  });

  it('el número es positivo y no se repite por empresa y año', async () => {
    const primero = await crearPago();

    expect(await restriccion(crearPago({ numero: 0 }))).toBe('pagos_numero_positivo');
    expect(await restriccion(crearPago({ numero: primero.numero }))).toBe('pagos_numero_unico');
    await expect(crearPago({ numero: primero.numero, anioDeNumero: 2026 })).resolves.toBeDefined();
  });

  it('la forma es una de las cinco y el monto es positivo', async () => {
    expect(await restriccion(crearPago({ forma: 'trueque' as never }))).toBe('pagos_forma_valida');
    expect(await restriccion(crearPago({ monto: '0' }))).toBe('pagos_monto_positivo');
    expect(await restriccion(crearPago({ monto: '-1' }))).toBe('pagos_monto_positivo');
  });

  it('solo la cuenta de apertura va sin movimiento de Bancos', async () => {
    expect(await restriccion(crearPago({ movimientoId: null }))).toBe('pagos_movimiento_de_su_forma');
    expect(await restriccion(crearPago({ ...apertura, movimientoId: await nuevoMovimiento() }))).toBe(
      'pagos_movimiento_de_su_forma',
    );
  });

  it('el movimiento debe existir y un cheque o nota creados son de un solo pago', async () => {
    const movimientoId = await nuevoMovimiento();
    await crearPago({ movimientoId });

    expect(await restriccion(crearPago({ movimientoId: crypto.randomUUID() }))).toBe('pagos_movimiento_fk');
    expect(await restriccion(crearPago({ movimientoId }))).toBe('pagos_movimiento_creado_unico');
    expect(await restriccion(crearPago({ movimientoId, forma: 'nota_de_debito' }))).toBe(
      'pagos_movimiento_creado_unico',
    );
  });

  it('una nota ligada puede cubrir varios pagos', async () => {
    const movimientoId = await nuevoMovimiento();

    await crearPago({ forma: 'nota_ligada', movimientoId, referencia: 'Póliza 1' });
    await expect(crearPago({ forma: 'nota_ligada', movimientoId })).resolves.toBeDefined();
  });

  it('la referencia solo va en nota ligada y cuenta de apertura, recortada y de 1 a 100 caracteres', async () => {
    expect(await restriccion(crearPago({ referencia: 'CH-1' }))).toBe('pagos_referencia_de_su_forma');
    expect(await restriccion(crearPago({ forma: 'nota_de_debito', referencia: 'ND-1' }))).toBe(
      'pagos_referencia_de_su_forma',
    );
    for (const referencia of [' con espacios ', '', 'x'.repeat(101)]) {
      expect(await restriccion(crearPago({ forma: 'nota_ligada', referencia }))).toBe('pagos_referencia_valida');
    }
    await expect(crearPago({ forma: 'nota_ligada', referencia: 'x'.repeat(100) })).resolves.toBeDefined();
  });

  it('el motivo y la carga cerrada son solo de la cuenta de apertura', async () => {
    expect(await restriccion(crearPago({ ...apertura, motivo: null }))).toBe('pagos_motivo_de_apertura');
    expect(await restriccion(crearPago({ motivo: 'Sobra' }))).toBe('pagos_motivo_de_apertura');
    expect(await restriccion(crearPago({ ...apertura, conCargaCerrada: null }))).toBe('pagos_carga_de_apertura');
    expect(await restriccion(crearPago({ conCargaCerrada: true }))).toBe('pagos_carga_de_apertura');
  });

  it('el motivo va de 1 a 300 caracteres', async () => {
    expect(await restriccion(crearPago({ ...apertura, motivo: '' }))).toBe('pagos_motivo_rango');
    expect(await restriccion(crearPago({ ...apertura, motivo: 'x'.repeat(301) }))).toBe('pagos_motivo_rango');
    await expect(crearPago({ ...apertura, motivo: 'x'.repeat(300) })).resolves.toBeDefined();
  });

  it('las observaciones van recortadas y de 1 a 500 caracteres', async () => {
    for (const observaciones of [' con espacios ', '', 'x'.repeat(501)]) {
      expect(await restriccion(crearPago({ observaciones }))).toBe('pagos_observaciones_validas');
    }
  });

  it('el estado es vigente o anulado, y la anulación se escribe completa', async () => {
    const completa = { ...anulacion, anuladoPor: e.usuarioId, fechaDeAnulacion: '2026-03-15' };

    expect(await restriccion(crearPago({ estado: 'pagado' as never }))).toBe('pagos_estado_valido');
    expect(await restriccion(crearPago({ estado: 'anulado' }))).toBe('pagos_anulacion_completa');
    expect(await restriccion(crearPago({ ...completa }))).toBe('pagos_anulacion_completa');
    expect(await restriccion(crearPago({ estado: 'anulado', ...completa, anuladoPor: null }))).toBe(
      'pagos_anulacion_completa',
    );
    expect(await restriccion(crearPago({ estado: 'anulado', ...completa, motivoDeAnulacion: '' }))).toBe(
      'pagos_motivo_de_anulacion_rango',
    );
    await expect(crearPago({ estado: 'anulado', ...completa })).resolves.toBeDefined();
  });

  it('la fecha de la anulación va si y solo si está anulado, y no es anterior a la del registro', async () => {
    const completa = { anuladoEn: new Date(), anuladoPor: e.usuarioId, motivoDeAnulacion: 'Error' };
    const anulado = (fechaDeAnulacion?: string) => ({ estado: 'anulado' as const, ...completa, fechaDeAnulacion });

    expect(await restriccion(crearPago(anulado()))).toBe('pagos_fecha_de_anulacion_de_su_estado');
    expect(await restriccion(crearPago({ fechaDeAnulacion: '2026-03-15' }))).toBe(
      'pagos_fecha_de_anulacion_de_su_estado',
    );
    expect(await restriccion(crearPago(anulado('2026-03-14')))).toBe('pagos_fecha_de_anulacion_valida');
    await expect(crearPago(anulado('2026-03-15'))).resolves.toBeDefined();
    await expect(crearPago(anulado('2026-05-01'))).resolves.toBeDefined();
  });

  it('el pago es de un proveedor que existe y no se borra con pagos', async () => {
    await expect(crearPago({ proveedorId: e.proveedorA2 })).resolves.toBeDefined();

    expect(await restriccion(crearPago({ proveedorId: crypto.randomUUID() }))).toBe('pagos_proveedor_fk');
  });

  it('cada empresa ve solo sus pagos', async () => {
    await crearPago();

    const enA2 = await enTransaccionSegura(contextoDe(e, e.empresaA2, e.cuentaA), (tx) => tx.select().from(pagos));

    expect(enA2).toEqual([]);
  });
});

describe('ajuste ligado a un pago', () => {
  const ajustar = async (cambios: Partial<typeof ajustesDeSaldo.$inferInsert>) => {
    const documento = await crearDocumento();
    return enTransaccionSegura(contexto(), (tx) =>
      tx.insert(ajustesDeSaldo).values({
        empresaId: e.empresaA1,
        proveedorId: e.proveedorA,
        documentoId: documento.id,
        monto: '0.5',
        fecha: '2026-03-15',
        causa: 'diferencia_menor',
        motivo: 'Centavos',
        ...cambios,
      }),
    );
  };

  it('un pago puede dejar una diferencia menor, y el ajuste nace sin pago por omisión', async () => {
    const pago = await crearPago();

    await expect(ajustar({ pagoId: pago.id })).resolves.toBeDefined();
    await expect(ajustar({})).resolves.toBeDefined();
  });

  it('el ajuste de un pago solo es diferencia menor', async () => {
    const pago = await crearPago();

    expect(await restriccion(ajustar({ pagoId: pago.id, causa: 'no_recuperable' }))).toBe(
      'ajustes_pago_solo_diferencia',
    );
    await expect(ajustar({ causa: 'no_recuperable' })).resolves.toBeDefined();
  });

  it('el pago debe existir y no se borra con ajustes', async () => {
    const pago = await crearPago();
    await ajustar({ pagoId: pago.id });

    expect(await restriccion(ajustar({ pagoId: crypto.randomUUID() }))).toBe('ajustes_pago_fk');
    const alBorrar = await errorDePostgres(
      enTransaccionSegura(contexto(), (tx) => tx.delete(pagos).where(eq(pagos.id, pago.id))),
    );
    expect(alBorrar?.code).toBe('23503');
  });
});
