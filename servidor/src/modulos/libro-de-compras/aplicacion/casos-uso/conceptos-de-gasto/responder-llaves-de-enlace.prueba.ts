import { describe, expect, it } from 'vitest';
import { REGLAS_DE_RETENCION } from '../../../dominio/retencion-propuesta.js';
import { ResponderLlavesDeEnlaceDelLibro } from './responder-llaves-de-enlace.js';

const responder = new ResponderLlavesDeEnlaceDelLibro({
  listar: async () => [{ id: 'g-1', nombre: 'Alimento', activo: true }] as never,
});

describe('responder llaves de enlace del Libro de compras', () => {
  it('ofrece las nueve reglas de retención, con su nombre, para el rol retencion_por_pagar', async () => {
    const llaves = await responder.ejecutar({ rol: 'retencion_por_pagar' });

    expect(llaves?.map(({ llave }) => llave)).toEqual([...REGLAS_DE_RETENCION]);
    expect(llaves?.[0]).toEqual({
      llave: 'iva_exportador_agropecuario',
      nombre: 'IVA exportador agropecuario',
      activo: true,
    });
  });

  it('ofrece los conceptos de gasto para el rol gasto_por_concepto', async () => {
    expect(await responder.ejecutar({ rol: 'gasto_por_concepto' })).toEqual([
      { llave: 'g-1', nombre: 'Alimento', activo: true },
    ]);
  });

  it('de los demás roles no dice nada', async () => {
    expect(await responder.ejecutar({ rol: 'cuenta_bancaria' })).toBeNull();
  });
});
