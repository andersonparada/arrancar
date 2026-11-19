import { describe, expect, it } from 'vitest';
import type { LineaDeBandeja } from '../../servicios/bandeja.api';
import {
  alternarDocumento,
  alternarLinea,
  estadoDelDocumento,
  lineasElegidas,
  podarSeleccion,
} from './seleccion-de-lineas';

const linea = (lineaId: string) => ({ lineaId }) as LineaDeBandeja;
const grupo = { lineas: [linea('a'), linea('b'), linea('c')] };

describe('selección de líneas de la bandeja', () => {
  it('alterna una línea', () => {
    expect(alternarLinea([], 'a')).toEqual(['a']);
    expect(alternarLinea(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('dice cuántas líneas del documento están elegidas', () => {
    expect(estadoDelDocumento(grupo, [])).toBe('ninguna');
    expect(estadoDelDocumento(grupo, ['b'])).toBe('algunas');
    expect(estadoDelDocumento(grupo, ['c', 'b', 'a'])).toBe('todas');
  });

  it('elegir un documento completa lo que falta sin repetir, y volver a elegirlo lo quita', () => {
    expect(alternarDocumento(['b', 'x'], grupo)).toEqual(['b', 'x', 'a', 'c']);
    expect(alternarDocumento(['a', 'b', 'c', 'x'], grupo)).toEqual(['x']);
  });

  it('tras recargar deja solo lo que sigue en la bandeja', () => {
    expect(podarSeleccion(['a', 'z'], grupo.lineas)).toEqual(['a']);
  });

  it('las elegidas salen en el orden de la bandeja', () => {
    expect(lineasElegidas(grupo.lineas, ['c', 'a']).map((l) => l.lineaId)).toEqual(['a', 'c']);
  });
});
