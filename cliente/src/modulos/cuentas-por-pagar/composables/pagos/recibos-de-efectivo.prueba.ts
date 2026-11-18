import { describe, expect, it } from 'vitest';
import { destinoDeLosRecibos, idsDeLosRecibos, idsQueFaltan, tituloDelPapelDeLosRecibos } from './recibos-de-efectivo';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

describe('los pagos del enlace de recibos', () => {
  it('se leen en el orden en que vienen, sin repetir', () => {
    expect(idsDeLosRecibos(`${A},${B},${A}`)).toEqual([A, B]);
  });

  it('lo que no es un id no cuenta y un valor raro no rompe la pantalla', () => {
    expect(idsDeLosRecibos(`${A}, basura ,`)).toEqual([A]);
    expect(idsDeLosRecibos(undefined)).toEqual([]);
    expect(idsDeLosRecibos(null)).toEqual([]);
    expect(idsDeLosRecibos([A, B])).toEqual([A, B]);
  });

  it('no pasan de 20, el máximo de un reparto', () => {
    const muchos = Array.from({ length: 25 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);
    expect(idsDeLosRecibos(muchos.join(','))).toHaveLength(20);
  });

  it('el destino los junta en la dirección', () => {
    expect(destinoDeLosRecibos([A, B])).toEqual({
      name: 'cuentas-por-pagar.pagos.recibos',
      query: { pagos: `${A},${B}` },
    });
  });
});

describe('recibos preparados', () => {
  const recibo = (id: string, numero: string) => ({ pago: { id, numero } }) as never;

  it('el nombre del papel lista los números de pago', () => {
    expect(tituloDelPapelDeLosRecibos([recibo(A, '2026-15'), recibo(B, '2026-16')])).toBe(
      'Recibos de efectivo 2026-15, 2026-16',
    );
  });

  it('dice cuáles no se pudieron preparar', () => {
    expect(idsQueFaltan([A, B], [recibo(A, '1')])).toEqual([B]);
    expect(idsQueFaltan([A], [recibo(A, '1')])).toEqual([]);
  });
});
