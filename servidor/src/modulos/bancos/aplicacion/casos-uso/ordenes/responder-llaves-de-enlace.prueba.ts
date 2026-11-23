import { describe, expect, it } from 'vitest';
import { ResponderLlavesDeEnlaceDeBancos } from './responder-llaves-de-enlace.js';

const responder = new ResponderLlavesDeEnlaceDeBancos(
  { listar: async () => [{ id: 'c-1', nombre: 'Monetaria', activo: true }] as never },
  { listar: async () => [{ id: 'k-1', nombre: 'Pago a proveedor', activo: false }] as never },
);

describe('responder llaves de enlace de Bancos', () => {
  it('ofrece las cuentas bancarias para el rol cuenta_bancaria', async () => {
    expect(await responder.ejecutar({ rol: 'cuenta_bancaria' })).toEqual([
      { llave: 'c-1', nombre: 'Monetaria', activo: true },
    ]);
  });

  it('ofrece los conceptos (también los inactivos) para el rol concepto_bancario', async () => {
    expect(await responder.ejecutar({ rol: 'concepto_bancario' })).toEqual([
      { llave: 'k-1', nombre: 'Pago a proveedor', activo: false },
    ]);
  });

  it('de los demás roles no dice nada', async () => {
    expect(await responder.ejecutar({ rol: 'proveedores' })).toBeNull();
  });
});
