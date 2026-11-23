import { describe, expect, it } from 'vitest';
import { ResponderLlavesDeEnlaceDeCuentasPorPagar } from './responder-llaves-de-enlace.js';

const responder = new ResponderLlavesDeEnlaceDeCuentasPorPagar({
  listar: async () => [{ id: 'cat-1', nombre: 'Insumos', activo: false }],
});

describe('responder llaves de enlace de Cuentas por pagar', () => {
  it('ofrece las categorías de proveedor para el rol proveedores', async () => {
    expect(await responder.ejecutar({ rol: 'proveedores' })).toEqual([
      { llave: 'cat-1', nombre: 'Insumos', activo: false },
    ]);
  });

  it('de los demás roles no dice nada', async () => {
    expect(await responder.ejecutar({ rol: 'efectivo_para_pagos' })).toBeNull();
  });
});
