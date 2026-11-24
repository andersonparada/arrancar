import { describe, expect, it } from 'vitest';
import {
  alternarBodega,
  diferenciaDeAccesos,
  marcarTodas,
  opcionesDeUsuarios,
  resumenDeCambios,
} from './edicion-de-accesos';

const usuario = (usuarioId: string, nombres: string, apellidos: string) => ({
  usuarioId,
  usuario: nombres.toLowerCase(),
  nombres,
  apellidos,
  roles: [],
  veTodas: false,
});

describe('edición de accesos a bodegas', () => {
  it('alterna una bodega sin tocar la selección original', () => {
    const original = ['a'];
    expect(alternarBodega(original, 'b')).toEqual(['a', 'b']);
    expect(alternarBodega(original, 'a')).toEqual([]);
    expect(original).toEqual(['a']);
  });

  it('marca y desmarca todas conservando las que no se listan', () => {
    expect(marcarTodas(['x', 'a'], ['a', 'b'], true).sort()).toEqual(['a', 'b', 'x']);
    expect(marcarTodas(['x', 'a'], ['a', 'b'], false)).toEqual(['x']);
  });

  it('calcula lo que se agrega y lo que se quita', () => {
    expect(diferenciaDeAccesos(['a', 'b'], ['b', 'c'])).toEqual({ agregadas: ['c'], quitadas: ['a'] });
  });

  it('resume los cambios y no dice nada si no hay', () => {
    expect(resumenDeCambios(['a'], ['a'])).toBeNull();
    expect(resumenDeCambios(['a'], ['b', 'c'])).toBe('Se dará acceso a 2 bodegas y se quitará el acceso a 1 bodega.');
  });

  it('ordena los usuarios por nombre y marca al propio', () => {
    const opciones = opcionesDeUsuarios([usuario('2', 'Zoila', 'Pérez'), usuario('1', 'Ana', 'López')], '2');
    expect(opciones.map((o) => o.texto)).toEqual([
      'Elija un usuario',
      'Ana López (ana)',
      'Zoila Pérez (zoila) (usted)',
    ]);
  });
});
