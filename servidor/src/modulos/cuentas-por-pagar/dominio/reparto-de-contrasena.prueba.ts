import { describe, expect, it } from 'vitest';
import {
  fechaDeLaAplicacion,
  repartirNotasDeLaContrasena,
  type CargoDeLaContrasena,
  type NotaDeLaContrasena,
} from './reparto-de-contrasena.js';

const cargo = (id: string, saldoCentavos: number, cambios: Partial<CargoDeLaContrasena> = {}): CargoDeLaContrasena => ({
  id,
  saldoCentavos,
  vencimiento: '2026-05-01',
  fechaEmision: '2026-03-01',
  creadoEn: '2026-03-01T00:00:00.000Z',
  entrada: '2026-03-01',
  ...cambios,
});

const nota = (
  id: string,
  saldoLibreCentavos: number,
  cambios: Partial<NotaDeLaContrasena> = {},
): NotaDeLaContrasena => ({
  id,
  saldoLibreCentavos,
  fechaEmision: '2026-03-02',
  creadoEn: '2026-03-02T00:00:00.000Z',
  entrada: '2026-03-02',
  ...cambios,
});

const montos = (aplicaciones: Array<{ notaId: string; cargoId: string; montoCentavos: number }>) =>
  aplicaciones.map(({ notaId, cargoId, montoCentavos }) => [notaId, cargoId, montoCentavos]);

describe('repartir las notas de una contraseña', () => {
  it('una nota sobre dos cargos: primero el que vence antes', () => {
    const reparto = repartirNotasDeLaContrasena(
      '2026-04-01',
      [nota('n1', 15000)],
      [cargo('tarde', 10000, { vencimiento: '2026-06-01' }), cargo('temprano', 10000, { vencimiento: '2026-05-01' })],
    );

    expect(montos(reparto.aplicaciones)).toEqual([
      ['n1', 'temprano', 10000],
      ['n1', 'tarde', 5000],
    ]);
    expect(reparto.saldoPorCargo.get('temprano')).toBe(0);
    expect(reparto.saldoPorCargo.get('tarde')).toBe(5000);
  });

  it('dos notas: la segunda rebaja lo que dejó la primera', () => {
    const reparto = repartirNotasDeLaContrasena(
      '2026-04-01',
      [nota('n2', 4000, { fechaEmision: '2026-03-05' }), nota('n1', 7000)],
      [cargo('a', 10000)],
    );

    expect(montos(reparto.aplicaciones)).toEqual([
      ['n1', 'a', 7000],
      ['n2', 'a', 3000],
    ]);
    expect(reparto.saldoPorCargo.get('a')).toBe(0);
  });

  it('lo que sobra de una nota no se aplica: sigue libre', () => {
    const reparto = repartirNotasDeLaContrasena('2026-04-01', [nota('n1', 50000)], [cargo('a', 10000)]);

    expect(montos(reparto.aplicaciones)).toEqual([['n1', 'a', 10000]]);
  });

  it('si las notas cubren todo, ningún cargo conserva saldo', () => {
    const reparto = repartirNotasDeLaContrasena(
      '2026-04-01',
      [nota('n1', 30000)],
      [cargo('a', 10000), cargo('b', 5000)],
    );

    expect([...reparto.saldoPorCargo.values()]).toEqual([0, 0]);
  });

  it('sin notas no hay aplicaciones y los saldos quedan como estaban', () => {
    const reparto = repartirNotasDeLaContrasena('2026-04-01', [], [cargo('a', 10000)]);

    expect(reparto.aplicaciones).toEqual([]);
    expect(reparto.saldoPorCargo.get('a')).toBe(10000);
  });

  it('es determinista: el orden en que llegan no cambia el reparto', () => {
    const cargos = [cargo('a', 5000, { vencimiento: null }), cargo('b', 5000)];
    const una = repartirNotasDeLaContrasena('2026-04-01', [nota('n1', 6000)], cargos);
    const otra = repartirNotasDeLaContrasena('2026-04-01', [nota('n1', 6000)], [...cargos].reverse());

    expect(otra.aplicaciones).toEqual(una.aplicaciones);
    expect(montos(una.aplicaciones)).toEqual([
      ['n1', 'b', 5000],
      ['n1', 'a', 1000],
    ]);
  });
});

describe('la fecha de cada aplicación', () => {
  it('es la mayor entre la contraseña, la recepción de la nota y la del cargo', () => {
    expect(fechaDeLaAplicacion('2026-04-01', '2026-03-01', '2026-02-01')).toBe('2026-04-01');
    expect(fechaDeLaAplicacion('2026-04-01', '2026-04-10', '2026-02-01')).toBe('2026-04-10');
    expect(fechaDeLaAplicacion('2026-04-01', '2026-03-01', '2026-04-20')).toBe('2026-04-20');
  });

  it('con una nota recibida después de la contraseña no queda antes de existir', () => {
    const reparto = repartirNotasDeLaContrasena(
      '2026-04-01',
      [nota('n1', 1000, { entrada: '2026-04-15' })],
      [cargo('a', 5000)],
    );

    expect(reparto.aplicaciones[0]!.fecha).toBe('2026-04-15');
  });

  it('con un saldo inicial usa la fecha de inicio que se le dio como entrada', () => {
    const reparto = repartirNotasDeLaContrasena(
      '2026-01-10',
      [nota('n1', 1000)],
      [cargo('a', 5000, { entrada: '2026-01-31' })],
    );

    expect(reparto.aplicaciones[0]!.fecha).toBe('2026-03-02');
    const sinEntradas = repartirNotasDeLaContrasena(
      '2026-01-10',
      [nota('n1', 1000, { entrada: null })],
      [cargo('a', 5000, { entrada: '2026-01-31' })],
    );
    expect(sinEntradas.aplicaciones[0]!.fecha).toBe('2026-01-31');
  });

  it('con todo anterior a la contraseña, es la fecha de la contraseña', () => {
    const reparto = repartirNotasDeLaContrasena('2026-06-01', [nota('n1', 1000)], [cargo('a', 5000)]);

    expect(reparto.aplicaciones[0]!.fecha).toBe('2026-06-01');
  });
});
