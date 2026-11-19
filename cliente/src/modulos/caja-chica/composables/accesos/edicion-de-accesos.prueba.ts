import { describe, expect, it } from 'vitest';
import {
  alternarFondo,
  fondosPorNombre,
  marcarTodos,
  opcionesDeUsuarios,
  resumenDeCambios,
} from './edicion-de-accesos';

describe('accesos a fondos', () => {
  it('alterna un fondo sin tocar la selección original', () => {
    const original = ['a'];
    expect(alternarFondo(original, 'b')).toEqual(['a', 'b']);
    expect(alternarFondo(original, 'a')).toEqual([]);
    expect(original).toEqual(['a']);
  });

  it('marca o desmarca solo los fondos dados', () => {
    expect(marcarTodos(['z'], ['a', 'b'], true)).toEqual(['z', 'a', 'b']);
    expect(marcarTodos(['z', 'a'], ['a', 'b'], false)).toEqual(['z']);
  });

  it('resume lo que hará guardar y no dice nada si no hay cambios', () => {
    expect(resumenDeCambios(['a'], ['a'])).toBeNull();
    expect(resumenDeCambios(['a'], ['a', 'b', 'c'])).toBe('Se dará acceso a 2 fondos.');
    expect(resumenDeCambios(['a', 'b'], ['c'])).toBe('Se dará acceso a 1 fondo y se quitará el acceso a 2 fondos.');
  });

  it('ordena usuarios y fondos por nombre y marca al propio operador', () => {
    const usuario = (id: string, nombres: string) => ({
      usuarioId: id,
      usuario: nombres.toLowerCase(),
      nombres,
      apellidos: 'Pérez',
      roles: [],
      veTodos: false,
    });
    const opciones = opcionesDeUsuarios([usuario('2', 'Zoila'), usuario('1', 'Ana')], '2');
    expect(opciones.map((o) => o.texto)).toEqual([
      'Elija un usuario',
      'Ana Pérez (ana)',
      'Zoila Pérez (zoila) (usted)',
    ]);
    const fondos = fondosPorNombre([
      { id: '2', nombre: 'Zona norte', estado: 'abierto', usuarioIds: [] },
      { id: '1', nombre: 'Almacén', estado: 'abierto', usuarioIds: [] },
    ]);
    expect(fondos.map((f) => f.nombre)).toEqual(['Almacén', 'Zona norte']);
  });
});
