import { describe, expect, it } from 'vitest';
import {
  agruparPorNit,
  cifrasEnCero,
  nitEnVariasFichas,
  repartirEnBloques,
  type SaldoDeProveedor,
} from './saldos-por-nit.js';

function proveedor(datos: Partial<SaldoDeProveedor> & { proveedorId: string; neto: number }): SaldoDeProveedor {
  return { ...cifrasEnCero(), nombre: datos.proveedorId, nit: null, totalCargos: Math.max(datos.neto, 0), ...datos };
}

describe('agrupar proveedores por NIT', () => {
  it('dos fichas con el mismo NIT forman un grupo con las dos como subrenglones, y el neto es la suma', () => {
    const grupos = agruparPorNit([
      proveedor({ proveedorId: 'b', nombre: 'Beta', nit: '1234567', neto: 100 }),
      proveedor({ proveedorId: 'a', nombre: 'Alfa', nit: '1234567', neto: -30 }),
    ]);

    expect(grupos).toHaveLength(1);
    expect(grupos[0]).toMatchObject({ nit: '1234567', nombre: 'Alfa', proveedorId: null, neto: 70 });
    expect(grupos[0]!.fichas.map((ficha) => ficha.proveedorId)).toEqual(['a', 'b']);
    expect(nitEnVariasFichas(grupos)).toHaveLength(1);
  });

  it('el NIT se compara sin importar mayúsculas ni espacios', () => {
    const grupos = agruparPorNit([
      proveedor({ proveedorId: 'a', nit: '123K', neto: 10 }),
      proveedor({ proveedorId: 'b', nit: ' 123k ', neto: 20 }),
    ]);

    expect(grupos).toHaveLength(1);
    expect(grupos[0]!.nit).toBe('123K');
  });

  it('los proveedores sin NIT o con «CF» no se agrupan entre sí', () => {
    const grupos = agruparPorNit([
      proveedor({ proveedorId: 'a', nit: 'CF', neto: 10 }),
      proveedor({ proveedorId: 'b', nit: 'CF', neto: 20 }),
      proveedor({ proveedorId: 'c', nit: null, neto: 30 }),
      proveedor({ proveedorId: 'd', nit: '', neto: 40 }),
    ]);

    expect(grupos).toHaveLength(4);
    expect(grupos.every((grupo) => grupo.nit === null && grupo.fichas.length === 1)).toBe(true);
    expect(nitEnVariasFichas(grupos)).toEqual([]);
  });

  it('un grupo de una sola ficha lleva el id del proveedor', () => {
    const [grupo] = agruparPorNit([proveedor({ proveedorId: 'a', nit: '9', neto: 5 })]);

    expect(grupo!.proveedorId).toBe('a');
  });
});

describe('repartir en acreedores y deudores', () => {
  const grupos = agruparPorNit([
    proveedor({ proveedorId: 'a', nit: '1', neto: 500 }),
    proveedor({ proveedorId: 'b', nit: '2', neto: -200 }),
    proveedor({ proveedorId: 'c', nit: '3', neto: 0 }),
  ]);

  it('neto positivo es acreedor, negativo es deudor y cero no sale', () => {
    const { acreedores, deudores } = repartirEnBloques(grupos, false);

    expect(acreedores.map((grupo) => grupo.proveedorId)).toEqual(['a']);
    expect(deudores.map((grupo) => grupo.proveedorId)).toEqual(['b']);
  });

  it('con `incluirSinSaldo` el que está en cero sale entre los acreedores', () => {
    const { acreedores } = repartirEnBloques(grupos, true);

    expect(acreedores.map((grupo) => grupo.proveedorId)).toEqual(['a', 'c']);
  });

  it('un NIT que netea en cero entre sus fichas no sale, aunque cada ficha tenga saldo', () => {
    const unido = agruparPorNit([
      proveedor({ proveedorId: 'a', nit: '7', neto: 100 }),
      proveedor({ proveedorId: 'b', nit: '7', neto: -100 }),
    ]);

    expect(repartirEnBloques(unido, false)).toEqual({ acreedores: [], deudores: [] });
  });
});
