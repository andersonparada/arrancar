import { describe, expect, it, vi } from 'vitest';
import type { ProveedorPorPagar } from '../../servicios/tipos-de-pagos';
import { juntarProveedoresPorPagar } from './paginas-de-proveedores';

const proveedor = (id: string) => ({ proveedorId: id, nombre: id, nit: null, porPagar: '1.00' }) as ProveedorPorPagar;

describe('juntar proveedores por pagar', () => {
  it('pide páginas hasta tener todos, aunque pasen de una página', async () => {
    const traer = vi.fn(async (pagina: number) => ({
      elementos: pagina === 1 ? [proveedor('a'), proveedor('b')] : [proveedor('c')],
      total: 3,
    }));
    const { proveedores: todos, incompleta } = await juntarProveedoresPorPagar(traer);
    expect(incompleta).toBe(false);
    expect(todos.map(({ proveedorId }) => proveedorId)).toEqual(['a', 'b', 'c']);
    expect(traer).toHaveBeenCalledTimes(2);
  });

  it('con una sola página no pide más', async () => {
    const traer = vi.fn(async () => ({ elementos: [proveedor('a')], total: 1 }));
    await juntarProveedoresPorPagar(traer);
    expect(traer).toHaveBeenCalledTimes(1);
  });

  it('se detiene si el servidor devuelve una página vacía', async () => {
    const traer = vi.fn(async () => ({ elementos: [], total: 5 }));
    expect((await juntarProveedoresPorPagar(traer)).proveedores).toEqual([]);
    expect(traer).toHaveBeenCalledTimes(1);
  });

  it('si llega al tope de páginas con proveedores sin traer, avisa que la lista está incompleta', async () => {
    const traer = vi.fn(async (pagina: number) => ({ elementos: [proveedor(`p${pagina}`)], total: 1000 }));
    const resultado = await juntarProveedoresPorPagar(traer);
    expect(traer).toHaveBeenCalledTimes(50);
    expect(resultado.proveedores).toHaveLength(50);
    expect(resultado.incompleta).toBe(true);
  });
});
