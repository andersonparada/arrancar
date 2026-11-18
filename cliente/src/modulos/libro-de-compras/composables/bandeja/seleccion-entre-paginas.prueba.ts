import { describe, expect, it } from 'vitest';
import { filaDte } from './bandeja.soporte';
import {
  alternarFilas,
  conLosDatosAlDia,
  conMarcadas,
  cuantasMarcadas,
  estanTodasMarcadas,
  paginasParaTraer,
  sinMarcadas,
} from './seleccion-entre-paginas';

const [a, b, c] = [filaDte({ id: 'a' }), filaDte({ id: 'b' }), filaDte({ id: 'c' })] as const;

describe('selección entre páginas', () => {
  it('conserva lo marcado de una página al marcar la siguiente', () => {
    const elegidas = conMarcadas(conMarcadas(new Map(), [a]), [b, c]);
    expect([...elegidas.keys()]).toEqual(['a', 'b', 'c']);
  });

  it('quita solo los ids dados y no cambia el original', () => {
    const original = conMarcadas(new Map(), [a, b]);
    expect([...sinMarcadas(original, ['a']).keys()]).toEqual(['b']);
    expect(original.size).toBe(2);
  });

  it('pone al día lo ya marcado y no marca lo nuevo', () => {
    const original = conMarcadas(new Map(), [{ ...a, anteriorALaFechaDeInicio: true }]);
    const nueva = { ...a, total: '5.00', anteriorALaFechaDeInicio: false };
    const resultado = conLosDatosAlDia(original, [nueva, b]);
    expect(resultado.size).toBe(1);
    expect(resultado.get('a')).toMatchObject({ total: '5.00', anteriorALaFechaDeInicio: true });
  });

  it('sabe si todas las de la página están marcadas y cuántas', () => {
    const elegidas = conMarcadas(new Map(), [a, b]);
    expect(estanTodasMarcadas(elegidas, [a, b])).toBe(true);
    expect(estanTodasMarcadas(elegidas, [a, c])).toBe(false);
    expect(estanTodasMarcadas(elegidas, [])).toBe(false);
    expect(cuantasMarcadas(elegidas, [a, b, c])).toBe(2);
  });

  it('alterna: si todas están marcadas las quita, si no las marca todas', () => {
    const una = conMarcadas(new Map(), [a]);
    expect([...alternarFilas(una, [a, b]).keys()]).toEqual(['a', 'b']);
    expect(alternarFilas(una, [a]).size).toBe(0);
    expect(alternarFilas(new Map(), [a]).has('a')).toBe(true);
  });

  it('calcula las páginas para traer todo el filtro', () => {
    expect(paginasParaTraer(0, 200)).toBe(0);
    expect(paginasParaTraer(200, 200)).toBe(1);
    expect(paginasParaTraer(201, 200)).toBe(2);
  });
});
