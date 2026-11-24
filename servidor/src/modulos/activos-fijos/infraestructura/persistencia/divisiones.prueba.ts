/**
 * Prueba de integración contra PostgreSQL (base de pruebas): aislamiento de las divisiones entre dos empresas de la misma
 * cuenta, llaves compuestas con la empresa, la llave del activo nuevo que queda en nulo al borrarlo y los `check` de la
 * base (diseño §5.15).
 */
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { errorDePostgres, prepararEscenarioEnBd, type EscenarioEnBd } from '../../pruebas/escenario-en-bd.js';
import { activos } from './activos.tablas.js';
import { divisiones } from './divisiones.tablas.js';

let escenario: EscenarioEnBd;
let origenA1: string;
let nuevoA1: string;
let activoA2: string;

const en = (empresaId: string): ContextoEmpresa => escenario.en(empresaId);
const enA1 = () => en(escenario.empresaA1);

const division = (cambios: Partial<typeof divisiones.$inferInsert> = {}) =>
  ({
    empresaId: escenario.empresaA1,
    activoOrigenId: origenA1,
    activoNuevoId: nuevoA1,
    codigoDelActivoNuevo: 'AF-0002',
    fecha: '2026-11-10',
    periodo: '2026-11-01',
    cantidadOriginal: 50,
    cantidadSeparada: 20,
    causa: 'manual',
    motivo: 'Entrega parcial',
    costoSeparado: '6000.00',
    costoFiscalSeparado: '6000.00',
    acumuladaContableSeparada: '200.00',
    acumuladaFiscalSeparada: '200.00',
    residualSeparado: '0.00',
    ...cambios,
  }) satisfies typeof divisiones.$inferInsert;

const insertar = (valores: typeof divisiones.$inferInsert, contexto = enA1()) =>
  enTransaccionSegura(contexto, (tx) => tx.insert(divisiones).values(valores).returning());

const restriccion = (valores: typeof divisiones.$inferInsert) =>
  errorDePostgres(insertar(valores)).then((e) => e?.constraint);

async function crearActivo(empresaId: string, claseId: string, codigo: string): Promise<string> {
  const [fila] = await enTransaccionSegura(en(empresaId), (tx) =>
    tx
      .insert(activos)
      .values({
        empresaId,
        claseId,
        codigo,
        descripcion: 'Silla',
        tipoDeRegistro: 'activo',
        origen: 'compra',
        estado: 'en_construccion',
        fechaDeAdquisicion: '2026-11-01',
        cantidad: 50,
      })
      .returning(),
  );
  return fila!.id;
}

beforeAll(async () => {
  escenario = await prepararEscenarioEnBd('divisionesaf');
  origenA1 = await crearActivo(escenario.empresaA1, escenario.claseA1, 'AF-0001');
  nuevoA1 = await crearActivo(escenario.empresaA1, escenario.claseA1, 'AF-0002');
  activoA2 = await crearActivo(escenario.empresaA2, escenario.claseA2, 'AF-0003');
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('divisiones: aislamiento y llaves', () => {
  it('cada empresa ve solo sus divisiones y no puede escribir a nombre de otra', async () => {
    await insertar(division());
    const visibles = (empresaId: string) => enTransaccionSegura(en(empresaId), (tx) => tx.select().from(divisiones));

    expect(await visibles(escenario.empresaA1)).toHaveLength(1);
    expect(await visibles(escenario.empresaA2)).toEqual([]);
    await expect(
      insertar(division({ empresaId: escenario.empresaA2, activoOrigenId: activoA2 }), enA1()),
    ).rejects.toThrow();
  });

  it('no se cruza la llave compuesta: ni el origen ni el nuevo son de otra empresa', async () => {
    const libre = await crearActivo(escenario.empresaA1, escenario.claseA1, 'AF-0006');

    expect(await restriccion(division({ activoOrigenId: activoA2, activoNuevoId: libre }))).toBe(
      'divisiones_origen_fk',
    );
    expect(await restriccion(division({ activoNuevoId: activoA2, codigoDelActivoNuevo: 'AF-0003' }))).toBe(
      'divisiones_nuevo_fk',
    );
  });

  it('un activo nuevo nace de una sola división', async () => {
    expect(await restriccion(division())).toBe('divisiones_nuevo_unico');
  });

  it('el activo nuevo de una división vigente no se borra; al anularla la llave queda en nulo y la empresa se conserva', async () => {
    const otroOrigen = await crearActivo(escenario.empresaA1, escenario.claseA1, 'AF-0004');
    const otroNuevo = await crearActivo(escenario.empresaA1, escenario.claseA1, 'AF-0005');
    const [fila] = await insertar(
      division({ activoOrigenId: otroOrigen, activoNuevoId: otroNuevo, codigoDelActivoNuevo: 'AF-0005' }),
    );
    const borrar = () => enTransaccionSegura(enA1(), (tx) => tx.delete(activos).where(eq(activos.id, otroNuevo)));
    const conBorrado = await errorDePostgres(borrar());
    await enTransaccionSegura(enA1(), (tx) =>
      tx
        .update(divisiones)
        .set({ estado: 'anulada', anuladoEn: new Date(), anuladoPor: escenario.usuarioId, motivoDeAnulacion: 'Error' })
        .where(eq(divisiones.id, fila!.id)),
    );

    await borrar();
    const [despues] = await enTransaccionSegura(enA1(), (tx) =>
      tx.select().from(divisiones).where(eq(divisiones.id, fila!.id)),
    );

    expect(conBorrado?.constraint).toBe('divisiones_nuevo_requerido');
    expect(despues).toMatchObject({ activoNuevoId: null, empresaId: escenario.empresaA1 });
  });
});

describe('divisiones: lo que la base garantiza', () => {
  it.each([
    ['separar todo', { cantidadSeparada: 50 }, 'divisiones_cantidades'],
    ['separar cero', { cantidadSeparada: 0 }, 'divisiones_cantidades'],
    ['una causa desconocida', { causa: 'otra' as never }, 'divisiones_causa'],
    ['un estado desconocido', { estado: 'x' as never }, 'divisiones_estado'],
    ['un período que no es primer día', { periodo: '2026-11-15' }, 'divisiones_primer_dia'],
    ['un costo fiscal mayor que el costo', { costoFiscalSeparado: '6000.01' }, 'divisiones_montos'],
    ['un monto negativo', { residualSeparado: '-1.00' }, 'divisiones_montos'],
    ['más acumulada contable que costo', { acumuladaContableSeparada: '6000.01' }, 'divisiones_acumuladas'],
    ['un motivo vacío', { motivo: ' ' }, 'divisiones_textos'],
    ['una anulación incompleta', { estado: 'anulada' as const }, 'divisiones_anulacion_completa'],
  ])('rechaza %s', async (_caso, cambios, esperada) => {
    expect(await restriccion(division({ ...cambios, codigoDelActivoNuevo: 'AF-0009' }))).toBe(esperada);
  });

  it('el activo nuevo no es el de origen', async () => {
    expect(await restriccion(division({ activoNuevoId: origenA1, codigoDelActivoNuevo: 'AF-0009' }))).toBe(
      'divisiones_nuevo_distinto',
    );
  });

  it('una división vigente exige su activo nuevo; la anulada puede dejarlo en nulo', async () => {
    const sinNuevo = await restriccion(division({ activoNuevoId: null }));
    const anulada = await insertar(
      division({
        activoNuevoId: null,
        estado: 'anulada',
        anuladoEn: new Date(),
        anuladoPor: escenario.usuarioId,
        motivoDeAnulacion: 'Error',
      }),
    );

    expect(sinNuevo).toBe('divisiones_nuevo_requerido');
    expect(anulada).toHaveLength(1);
  });
});
