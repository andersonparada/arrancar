import { describe, expect, it } from 'vitest';
import { armarArbol, filasVisibles, idsConHijas } from './arbol-de-cuentas';
import { cuentaDePrueba } from './cuentas-de-prueba';

const cuentas = [
  cuentaDePrueba('1.1.02'),
  cuentaDePrueba('1'),
  cuentaDePrueba('1.1'),
  cuentaDePrueba('1.1.01', { nombre: 'Caja general' }),
  cuentaDePrueba('1.1.10', { nombre: 'Banco', activo: false }),
  cuentaDePrueba('2'),
];
const todo = { texto: '', conInactivas: true };
const codigos = (filas: { cuenta: { codigo: string } }[]) => filas.map((fila) => fila.cuenta.codigo);

describe('árbol de cuentas', () => {
  it('ordena por código de forma numérica y cuelga cada cuenta de su superior', () => {
    const arbol = armarArbol(cuentas);
    expect(arbol.map((n) => n.cuenta.codigo)).toEqual(['1', '2']);
    expect(arbol[0]?.hijas[0]?.hijas.map((n) => n.cuenta.codigo)).toEqual(['1.1.01', '1.1.02', '1.1.10']);
    expect(idsConHijas(arbol)).toEqual(['id-1', 'id-1.1']);
  });

  it('una cuenta sin su superior se trata como de primer nivel', () => {
    const arbol = armarArbol([cuentaDePrueba('3.1', { padreId: 'no-esta' })]);
    expect(arbol).toHaveLength(1);
  });

  it('muestra solo lo que está abierto', () => {
    const arbol = armarArbol(cuentas);
    expect(codigos(filasVisibles(arbol, new Set(), todo))).toEqual(['1', '2']);
    expect(codigos(filasVisibles(arbol, new Set(['id-1']), todo))).toEqual(['1', '1.1', '2']);
    const abierto = filasVisibles(arbol, new Set(['id-1', 'id-1.1']), todo);
    expect(abierto.map((f) => f.profundidad)).toEqual([0, 1, 2, 2, 2, 0]);
    expect(abierto[0]).toMatchObject({ tieneHijas: true, abierta: true });
  });

  it('al buscar abre el camino hasta lo encontrado, sin tildes ni mayúsculas', () => {
    const filas = filasVisibles(armarArbol(cuentas), new Set(), { texto: 'CAJA', conInactivas: true });
    expect(codigos(filas)).toEqual(['1', '1.1', '1.1.01']);
  });

  it('esconde las inactivas si se pide', () => {
    const arbol = armarArbol(cuentas);
    const filas = filasVisibles(arbol, new Set(['id-1', 'id-1.1']), { texto: '', conInactivas: false });
    expect(codigos(filas)).not.toContain('1.1.10');
  });
});
