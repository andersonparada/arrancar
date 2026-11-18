import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiDteRecibidos, type DteRecibido } from '../../servicios/dte-recibidos.api';
import type { CorteDeTandas } from './confirmar-por-tandas';
import { comprobarLaTandaCortada } from './comprobar-la-tanda-cortada';

vi.mock('../../servicios/dte-recibidos.api', () => ({ apiDteRecibidos: { listar: vi.fn() } }));

const fila = (id: string) => ({ id }) as DteRecibido;
const corte: CorteDeTandas = {
  tanda: 2,
  tandas: 3,
  mensaje: 'Sin conexión.',
  sinConfirmar: ['a', 'b', 'c', 'd'],
  deLaTandaQueFallo: ['a', 'b'],
  registradosDeLaTanda: null,
};

describe('comprobarLaTandaCortada', () => {
  beforeEach(() => {
    vi.mocked(apiDteRecibidos.listar).mockReset();
  });

  it('los de la tanda que ya no están pendientes se dan por registrados', async () => {
    vi.mocked(apiDteRecibidos.listar).mockResolvedValue({ elementos: [fila('b'), fila('c')], total: 2 } as never);
    const comprobado = await comprobarLaTandaCortada(corte);
    expect(comprobado.registradosDeLaTanda).toEqual(['a']);
    expect(comprobado.sinConfirmar).toEqual(['b', 'c', 'd']);
  });

  it('si no se puede preguntar, el corte queda como estaba', async () => {
    vi.mocked(apiDteRecibidos.listar).mockImplementation(() => Promise.reject(new Error('Sin red.')));
    expect(await comprobarLaTandaCortada(corte)).toBe(corte);
  });
});
