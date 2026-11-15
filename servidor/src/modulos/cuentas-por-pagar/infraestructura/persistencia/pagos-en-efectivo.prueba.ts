/**
 * Prueba de integración contra PostgreSQL: la forma `efectivo` de los pagos (retiro, recibido por, motivo sin
 * bancarizar) y su llave compuesta al retiro.
 */
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { contextoDe, errorDePostgres, prepararEscenario, type Escenario } from './escenario.soporte.js';
import { prepararBancos } from './movimientos-de-bancos.soporte.js';
import { pagos } from './pagos.tablas.js';
import { retirosDeEfectivo } from './retiros-de-efectivo.tablas.js';

let e: Escenario;
let nuevoMovimiento: () => Promise<string>;
let secuencia = 0;
const contexto = () => contextoDe(e, e.empresaA1, e.cuentaA);

type NuevoPago = typeof pagos.$inferInsert;

async function crearRetiro() {
  secuencia += 1;
  const [fila] = await enTransaccionSegura(contexto(), async (tx) =>
    tx
      .insert(retirosDeEfectivo)
      .values({
        empresaId: e.empresaA1,
        numero: secuencia,
        forma: 'cheque',
        fecha: '2026-03-15',
        monto: '1000',
        movimientoId: await nuevoMovimiento(),
        custodio: 'Juan Pérez',
      })
      .returning(),
  );
  return fila!;
}

async function crearPagoEnEfectivo(cambios: Partial<NuevoPago> = {}) {
  secuencia += 1;
  const retiro = await crearRetiro();
  const valores: NuevoPago = {
    empresaId: e.empresaA1,
    proveedorId: e.proveedorA,
    numero: secuencia,
    forma: 'efectivo',
    fecha: '2026-03-16',
    monto: '100',
    retiroId: retiro.id,
    ...cambios,
  };
  const [fila] = await enTransaccionSegura(contexto(), (tx) => tx.insert(pagos).values(valores).returning());
  return fila!;
}

const restriccion = async (operacion: Promise<unknown>) => (await errorDePostgres(operacion))?.constraint;

beforeAll(async () => {
  e = await prepararEscenario('cuentasporpagarefectivo');
  nuevoMovimiento = await prepararBancos(contexto());
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('pagos en efectivo', () => {
  it('guarda un pago en efectivo con retiro, sin movimiento, y lo opcional', async () => {
    const pago = await crearPagoEnEfectivo({
      recibidoPor: 'María López',
      referencia: 'Recibo 55',
      motivoSinBancarizar: 'Proveedor sin cuenta',
    });

    expect(pago).toMatchObject({ forma: 'efectivo', movimientoId: null, recibidoPor: 'María López' });
  });

  it('el efectivo exige su retiro y el movimiento va nulo', async () => {
    expect(await restriccion(crearPagoEnEfectivo({ retiroId: null }))).toBe('pagos_retiro_de_su_forma');
    expect(await restriccion(crearPagoEnEfectivo({ movimientoId: await nuevoMovimiento() }))).toBe(
      'pagos_movimiento_de_su_forma',
    );
  });

  it('el retiro solo lo lleva el efectivo', async () => {
    const retiro = await crearRetiro();

    expect(
      await restriccion(
        crearPagoEnEfectivo({ forma: 'cheque', retiroId: retiro.id, movimientoId: await nuevoMovimiento() }),
      ),
    ).toBe('pagos_retiro_de_su_forma');
  });

  it('el retiro debe existir y ser de la misma empresa', async () => {
    const contextoA2 = contextoDe(e, e.empresaA2, e.cuentaA);
    const movimientoDeA2 = await (await prepararBancos(contextoA2))();
    const [ajeno] = await enTransaccionSegura(contextoA2, (tx) =>
      tx
        .insert(retirosDeEfectivo)
        .values({
          empresaId: e.empresaA2,
          numero: 1,
          forma: 'cheque',
          fecha: '2026-03-15',
          monto: '10',
          movimientoId: movimientoDeA2,
          custodio: 'Ana',
        })
        .returning(),
    );

    expect(await restriccion(crearPagoEnEfectivo({ retiroId: crypto.randomUUID() }))).toBe('pagos_retiro_fk');
    expect(await restriccion(crearPagoEnEfectivo({ retiroId: ajeno!.id }))).toBe('pagos_retiro_fk');
  });

  it('quien recibió y el motivo sin bancarizar son solo del efectivo y van validados', async () => {
    const retiro = await crearRetiro();
    const cheque = { forma: 'cheque' as const, retiroId: null, movimientoId: await nuevoMovimiento() };

    expect(await restriccion(crearPagoEnEfectivo({ ...cheque, recibidoPor: 'Ana' }))).toBe(
      'pagos_recibido_por_de_su_forma',
    );
    expect(await restriccion(crearPagoEnEfectivo({ ...cheque, motivoSinBancarizar: 'Porque sí' }))).toBe(
      'pagos_motivo_sin_bancarizar_de_su_forma',
    );
    for (const recibidoPor of [' Ana ', '', 'x'.repeat(151)]) {
      expect(await restriccion(crearPagoEnEfectivo({ retiroId: retiro.id, recibidoPor }))).toBe(
        'pagos_recibido_por_valido',
      );
    }
    for (const motivoSinBancarizar of ['', 'x'.repeat(301)]) {
      expect(await restriccion(crearPagoEnEfectivo({ retiroId: retiro.id, motivoSinBancarizar }))).toBe(
        'pagos_motivo_sin_bancarizar_rango',
      );
    }
  });

  it('un retiro cubre varios pagos y no se borra con pagos', async () => {
    const retiro = await crearRetiro();
    await crearPagoEnEfectivo({ retiroId: retiro.id, numero: 9001 });
    await crearPagoEnEfectivo({ retiroId: retiro.id, numero: 9002, proveedorId: e.proveedorA2 });

    const alBorrar = await errorDePostgres(
      enTransaccionSegura(contexto(), (tx) => tx.delete(retirosDeEfectivo).where(eq(retirosDeEfectivo.id, retiro.id))),
    );

    expect(alBorrar?.code).toBe('23503');
  });
});
