/**
 * Prueba de integración contra PostgreSQL (base de pruebas): aislamiento de los saldos iniciales entre dos empresas de la
 * misma cuenta, llave compuesta con la empresa, borrado en cascada con el activo y `check` de la base (diseño §5.6).
 */
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { errorDePostgres, prepararEscenarioEnBd, type EscenarioEnBd } from '../../pruebas/escenario-en-bd.js';
import { activos } from './activos.tablas.js';
import { saldosIniciales } from './saldos-iniciales.tablas.js';

let escenario: EscenarioEnBd;
let activoA1: string;
let activoA2: string;

const en = (empresaId: string): ContextoEmpresa => escenario.en(empresaId);
const enA1 = () => en(escenario.empresaA1);

const saldo = (cambios: Partial<typeof saldosIniciales.$inferInsert> = {}) =>
  ({
    empresaId: escenario.empresaA1,
    activoId: activoA1,
    fechaDeCorte: '2025-12-31',
    costo: '120000.00',
    depreciacionAcumuladaContable: '50000.00',
    costoFiscal: '120000.00',
    baseFiscal: '120000.00',
    depreciacionAcumuladaFiscal: '72000.00',
    vidaUtilRestanteMeses: 36,
    ...cambios,
  }) satisfies typeof saldosIniciales.$inferInsert;

const insertar = (valores: typeof saldosIniciales.$inferInsert, contexto = enA1()) =>
  enTransaccionSegura(contexto, (tx) => tx.insert(saldosIniciales).values(valores).returning());

const restriccion = (valores: typeof saldosIniciales.$inferInsert) =>
  errorDePostgres(insertar(valores)).then((e) => e?.constraint);

async function crearActivo(empresaId: string, claseId: string, codigo: string): Promise<string> {
  const [fila] = await enTransaccionSegura(en(empresaId), (tx) =>
    tx
      .insert(activos)
      .values({
        empresaId,
        claseId,
        codigo,
        descripcion: 'Camión',
        tipoDeRegistro: 'activo',
        origen: 'saldo_inicial',
        estado: 'en_construccion',
        fechaDeAdquisicion: '2024-01-15',
      })
      .returning(),
  );
  return fila!.id;
}

beforeAll(async () => {
  escenario = await prepararEscenarioEnBd('saldosaf');
  activoA1 = await crearActivo(escenario.empresaA1, escenario.claseA1, 'AF-0001');
  activoA2 = await crearActivo(escenario.empresaA2, escenario.claseA2, 'AF-0001');
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('saldos iniciales: aislamiento entre dos empresas de la misma cuenta (solo por empresa, AF-P2 a)', () => {
  it('cada empresa ve solo sus saldos y no puede escribir a nombre de otra', async () => {
    await insertar(saldo());
    const visibles = (empresaId: string) =>
      enTransaccionSegura(en(empresaId), (tx) => tx.select().from(saldosIniciales));

    expect(await visibles(escenario.empresaA1)).toHaveLength(1);
    expect(await visibles(escenario.empresaA2)).toEqual([]);
    await expect(insertar(saldo({ empresaId: escenario.empresaA2, activoId: activoA2 }), enA1())).rejects.toThrow();
  });

  it('no se cruza la llave compuesta: el saldo de una empresa no cuelga del activo de otra', async () => {
    expect(await restriccion(saldo({ activoId: activoA2 }))).toBe('saldos_iniciales_activo_fk');
  });

  it('hay un solo saldo por activo y se va con el activo si este se elimina', async () => {
    await expect(insertar(saldo())).rejects.toThrow();
    await enTransaccionSegura(enA1(), (tx) => tx.delete(activos).where(eq(activos.id, activoA1)));

    const restantes = await enTransaccionSegura(enA1(), (tx) => tx.select().from(saldosIniciales));

    expect(restantes).toEqual([]);
    activoA1 = await crearActivo(escenario.empresaA1, escenario.claseA1, 'AF-0002');
  });
});

describe('saldos iniciales: lo que la base garantiza', () => {
  it('el costo y el costo fiscal son mayores que cero', async () => {
    const sinCosto = saldo({ costo: '0.00', depreciacionAcumuladaContable: '0.00' });
    const sinCostoFiscal = saldo({ costoFiscal: '0.00', baseFiscal: '0.00', depreciacionAcumuladaFiscal: '0.00' });

    expect(await restriccion(sinCosto)).toBe('saldos_iniciales_costo');
    expect(await restriccion(sinCostoFiscal)).toBe('saldos_iniciales_costo');
  });

  it('la acumulada contable va de cero al costo', async () => {
    const sobra = await restriccion(saldo({ depreciacionAcumuladaContable: '120000.01' }));
    const negativa = await restriccion(saldo({ depreciacionAcumuladaContable: '-1.00' }));

    expect([sobra, negativa]).toEqual(['saldos_iniciales_acumulada_contable', 'saldos_iniciales_acumulada_contable']);
  });

  it('la base fiscal no pasa del costo fiscal y la acumulada fiscal no pasa de la base', async () => {
    expect(await restriccion(saldo({ baseFiscal: '120000.01' }))).toBe('saldos_iniciales_base_fiscal');
    expect(await restriccion(saldo({ baseFiscal: '60000.00', depreciacionAcumuladaFiscal: '60000.01' }))).toBe(
      'saldos_iniciales_acumulada_fiscal',
    );
  });

  it('la vida restante va de 0 a 1200 meses', async () => {
    expect(await restriccion(saldo({ vidaUtilRestanteMeses: -1 }))).toBe('saldos_iniciales_vida_restante');
    expect(await restriccion(saldo({ vidaUtilRestanteMeses: 1201 }))).toBe('saldos_iniciales_vida_restante');
    await expect(insertar(saldo({ vidaUtilRestanteMeses: 0 }))).resolves.toBeTruthy();
  });
});
