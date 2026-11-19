/**
 * Prueba de integración contra PostgreSQL (base de pruebas): aislamiento de los cierres y las cuotas entre dos empresas
 * de la misma cuenta, llaves compuestas con la empresa, único de la cuota vigente y `check` de la base (§5.9 y §5.10).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { errorDePostgres, prepararEscenarioEnBd, type EscenarioEnBd } from '../../pruebas/escenario-en-bd.js';
import { activos } from './activos.tablas.js';
import { cierres } from './cierres.tablas.js';
import { cuotas } from './cuotas.tablas.js';
import { tramos } from './tramos.tablas.js';

let escenario: EscenarioEnBd;
let activoA1: string;
let activoA2: string;
let tramoA1: string;
let tramoA2: string;

const en = (empresaId: string): ContextoEmpresa => escenario.en(empresaId);
const enA1 = () => en(escenario.empresaA1);

const cierre = (cambios: Partial<typeof cierres.$inferInsert> = {}) =>
  ({
    empresaId: escenario.empresaA1,
    periodo: '2026-11-01',
    estado: 'cerrado',
    cerradoEn: new Date(),
    cerradoPor: escenario.usuarioId,
    totalContable: '4166.67',
    totalFiscal: '4166.67',
    activosDepreciados: 1,
    ...cambios,
  }) satisfies typeof cierres.$inferInsert;

const cuota = (cambios: Partial<typeof cuotas.$inferInsert> = {}) =>
  ({
    empresaId: escenario.empresaA1,
    periodo: '2026-11-01',
    activoId: activoA1,
    libro: 'contable',
    tramoId: tramoA1,
    monto: '4166.67',
    acumulada: '4166.67',
    ...cambios,
  }) satisfies typeof cuotas.$inferInsert;

const insertarCierre = (valores: typeof cierres.$inferInsert, contexto = enA1()) =>
  enTransaccionSegura(contexto, (tx) => tx.insert(cierres).values(valores).returning());
const insertarCuota = (valores: typeof cuotas.$inferInsert, contexto = enA1()) =>
  enTransaccionSegura(contexto, (tx) => tx.insert(cuotas).values(valores).returning());
const restriccion = (operacion: Promise<unknown>) => errorDePostgres(operacion).then((e) => e?.constraint);

async function crearActivoConTramo(empresaId: string, claseId: string): Promise<{ activoId: string; tramoId: string }> {
  const [activo] = await enTransaccionSegura(en(empresaId), (tx) =>
    tx
      .insert(activos)
      .values({
        empresaId,
        claseId,
        codigo: 'AF-0001',
        descripcion: 'Tractor',
        tipoDeRegistro: 'activo',
        origen: 'compra',
        estado: 'en_uso',
        fechaDeInicioDeUso: '2026-11-10',
        porcentajeFiscal: '20.00',
        vidaUtilContableMeses: 60,
        valorResidual: '0',
        fechaDeAdquisicion: '2026-11-01',
      })
      .returning(),
  );
  const [tramo] = await enTransaccionSegura(en(empresaId), (tx) =>
    tx
      .insert(tramos)
      .values({
        empresaId,
        activoId: activo!.id,
        libro: 'contable',
        desdePeriodo: '2026-11-01',
        causa: 'inicio_de_uso',
        porDepreciar: '250000.00',
        valorResidual: '0',
        meses: 60,
        cuotaMensual: '4166.67',
      })
      .returning(),
  );
  return { activoId: activo!.id, tramoId: tramo!.id };
}

beforeAll(async () => {
  escenario = await prepararEscenarioEnBd('cierresaf');
  ({ activoId: activoA1, tramoId: tramoA1 } = await crearActivoConTramo(escenario.empresaA1, escenario.claseA1));
  ({ activoId: activoA2, tramoId: tramoA2 } = await crearActivoConTramo(escenario.empresaA2, escenario.claseA2));
  await insertarCierre(cierre());
  await insertarCierre(cierre({ empresaId: escenario.empresaA2 }), en(escenario.empresaA2));
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('cierres y cuotas: aislamiento entre dos empresas de la misma cuenta (solo por empresa)', () => {
  it('cada empresa ve solo sus cierres y sus cuotas, y no escribe a nombre de otra', async () => {
    await insertarCuota(cuota());
    const visibles = (empresaId: string) =>
      enTransaccionSegura(en(empresaId), async (tx) => ({
        cierres: await tx.select().from(cierres),
        cuotas: await tx.select().from(cuotas),
      }));

    expect(await visibles(escenario.empresaA1)).toMatchObject({ cierres: [{ periodo: '2026-11-01' }], cuotas: [{}] });
    expect((await visibles(escenario.empresaA2)).cuotas).toEqual([]);
    await expect(
      insertarCuota(cuota({ empresaId: escenario.empresaA2, activoId: activoA2, tramoId: tramoA2 })),
    ).rejects.toThrow();
    await expect(insertarCierre(cierre({ empresaId: escenario.empresaA2, periodo: '2026-12-01' }))).rejects.toThrow();
  });

  it('no se cruzan las llaves compuestas: la cuota no cuelga del activo, el tramo ni el cierre de otra empresa', async () => {
    const delActivoAjeno = restriccion(insertarCuota(cuota({ libro: 'fiscal', activoId: activoA2 })));
    const delTramoAjeno = restriccion(insertarCuota(cuota({ libro: 'fiscal', tramoId: tramoA2 })));

    expect(await delActivoAjeno).toBe('cuotas_activo_fk');
    expect(await delTramoAjeno).toBe('cuotas_tramo_fk');
    expect(await restriccion(insertarCuota(cuota({ periodo: '2027-01-01' })))).toBe('cuotas_cierre_fk');
  });
});

describe('cuotas: una sola vigente por activo, libro y mes', () => {
  it('repetir la cuota vigente se rechaza, y una no vigente (mes reabierto) convive con la nueva', async () => {
    expect(await restriccion(insertarCuota(cuota()))).toBe('cuotas_vigente_unica');

    await enTransaccionSegura(enA1(), (tx) => tx.update(cuotas).set({ vigente: false }));
    await insertarCuota(cuota());
    const todas = await enTransaccionSegura(enA1(), (tx) => tx.select().from(cuotas));
    expect(todas.map((c) => c.vigente).sort()).toEqual([false, true]);
  });

  it('los montos nunca son negativos', async () => {
    expect(await restriccion(insertarCuota(cuota({ periodo: '2026-11-01', libro: 'fiscal', monto: '-1.00' })))).toBe(
      'cuotas_montos',
    );
  });
});

describe('cierres: reglas de la base', () => {
  it('el período es el primer día del mes', async () => {
    expect(await restriccion(insertarCierre(cierre({ periodo: '2026-12-15' })))).toBe('cierres_primer_dia');
  });

  it('reabierto exige quién, cuándo y el motivo, y cerrado no los lleva', async () => {
    const completo = {
      reabiertoEn: new Date(),
      reabiertoPor: escenario.usuarioId,
      motivoDeReapertura: 'Falta un costo',
    };

    expect(await restriccion(insertarCierre(cierre({ periodo: '2026-12-01', estado: 'reabierto' })))).toBe(
      'cierres_reapertura_completa',
    );
    expect(await restriccion(insertarCierre(cierre({ periodo: '2026-12-01', ...completo })))).toBe(
      'cierres_reapertura_completa',
    );
    const [bueno] = await insertarCierre(cierre({ periodo: '2026-12-01', estado: 'reabierto', ...completo }));
    expect(bueno?.estado).toBe('reabierto');
  });

  it('el motivo de reapertura no pasa de 500 caracteres y un mes no se repite', async () => {
    const largo = {
      estado: 'reabierto' as const,
      reabiertoEn: new Date(),
      reabiertoPor: escenario.usuarioId,
      motivoDeReapertura: 'x'.repeat(501),
    };

    expect(await restriccion(insertarCierre(cierre({ periodo: '2027-01-01', ...largo })))).toBe(
      'cierres_motivo_acotado',
    );
    expect(await restriccion(insertarCierre(cierre()))).toBe('cierres_pk');
  });
});
