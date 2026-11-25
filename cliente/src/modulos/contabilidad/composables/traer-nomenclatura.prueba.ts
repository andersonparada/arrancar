import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mascara, listar, enlaces } = vi.hoisted(() => ({ mascara: vi.fn(), listar: vi.fn(), enlaces: vi.fn() }));

vi.mock('../servicios/cuentas.api', () => ({ apiCuentas: { mascara, listar } }));
vi.mock('../servicios/enlaces.api', () => ({ apiEnlaces: { listar: enlaces } }));

import { traerNomenclatura } from './traer-nomenclatura';

beforeEach(() => vi.clearAllMocks());

describe('traerNomenclatura', () => {
  it('con solo el permiso de cuentas trae la máscara y el árbol sin tocar el inicio ni los enlaces', async () => {
    mascara.mockResolvedValue({ mascara: '9.9.99' });
    listar.mockResolvedValue([{ id: 'c1' }]);

    const datos = await traerNomenclatura(false);

    expect(datos).toEqual({ mascara: '9.9.99', cuentas: [{ id: 'c1' }], roles: [] });
    expect(enlaces).not.toHaveBeenCalled();
  });

  it('una contabilidad sin iniciar llega como máscara nula', async () => {
    mascara.mockResolvedValue({ mascara: null });
    listar.mockResolvedValue([]);
    expect((await traerNomenclatura(false)).mascara).toBeNull();
  });

  it('un fallo al traer las cuentas se propaga, no se confunde con «sin iniciar»', async () => {
    mascara.mockResolvedValue({ mascara: '9.9.99' });
    listar.mockRejectedValue(new Error('500'));
    await expect(traerNomenclatura(false)).rejects.toThrow('500');
  });

  it('si los enlaces no se pueden leer, la nomenclatura igual se muestra', async () => {
    mascara.mockResolvedValue({ mascara: '9.9.99' });
    listar.mockResolvedValue([]);
    enlaces.mockRejectedValue(new Error('403'));
    expect((await traerNomenclatura(true)).roles).toEqual([]);
  });
});
