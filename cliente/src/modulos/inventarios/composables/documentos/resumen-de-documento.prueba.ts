import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { renglonNuevo } from './edicion-de-renglones';
import { costoEscrito, resumenDeDocumento } from './resumen-de-documento';

const con = (articuloId: string, cantidad: string, costoTotal = '') => ({
  ...renglonNuevo(articuloId, cantidad),
  costoTotal,
});

beforeEach(() => setActivePinia(createPinia()));

describe('resumen de un documento', () => {
  it('suma los costos escritos sin errores de decimales', () => {
    expect(costoEscrito([con('a', '1', '0.10'), con('b', '1', '0.20'), con('c', '1')])).toBe('0.30');
    expect(costoEscrito([con('a', '1')])).toBeNull();
  });

  it('la entrada dice dónde entra, cuánto cuesta y que se puede anular', () => {
    const texto = resumenDeDocumento({
      tipo: 'entrada',
      fecha: '2026-11-23',
      bodega: 'Principal',
      renglones: [con('a', '2', '100'), con('b', '1', '50.50')],
    });
    expect(texto).toContain('2 artículos');
    expect(texto).toContain('«Principal»');
    expect(texto).toMatch(/150\.50/);
    expect(texto).toContain('anularla');
  });

  it('la salida aclara que el costo lo pone el método', () => {
    const texto = resumenDeDocumento({
      tipo: 'salida',
      fecha: '2026-11-23',
      bodega: 'Principal',
      renglones: [con('a', '2')],
    });
    expect(texto).toContain('1 artículo ');
    expect(texto).toContain('método de costeo');
  });
});
