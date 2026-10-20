import { describe, expect, it } from 'vitest';
import type { NotaDeFactura } from '../../servicios/documentos.api';
import { gruposDeNotas, nombreDeLasNotas } from './notas-de-la-factura';

const nota = (id: string, tipo?: NotaDeFactura['tipo']): NotaDeFactura => ({
  id,
  tipo,
  serie: null,
  numero: id,
  fechaEmision: '2026-10-01',
  total: '10.00',
  estado: 'vigente',
});

describe('grupos de notas en la ficha', () => {
  it('sin notas no hay grupos', () => {
    expect(gruposDeNotas([])).toEqual([]);
  });

  it('solo de crédito muestra un grupo de crédito', () => {
    const grupos = gruposDeNotas([nota('1', 'nota_de_credito')]);
    expect(grupos.map((grupo) => grupo.titulo)).toEqual(['Notas de crédito (1)']);
  });

  it('separa las de débito y pone primero las de crédito', () => {
    const grupos = gruposDeNotas([
      nota('1', 'nota_de_debito'),
      nota('2', 'nota_de_credito'),
      nota('3', 'nota_de_debito'),
    ]);
    expect(grupos.map((grupo) => grupo.titulo)).toEqual(['Notas de crédito (1)', 'Notas de débito (2)']);
    expect(grupos[0]?.notas.map((n) => n.id)).toEqual(['2']);
    expect(grupos[1]?.notas.map((n) => n.id)).toEqual(['1', '3']);
  });

  it('una nota sin tipo cuenta como de crédito', () => {
    const grupos = gruposDeNotas([nota('1'), nota('2', 'nota_de_debito')]);
    expect(grupos.map((grupo) => grupo.titulo)).toEqual(['Notas de crédito (1)', 'Notas de débito (1)']);
  });
});

describe('nombre de las notas en los textos', () => {
  it('sin notas o solo de crédito dice «notas de crédito»', () => {
    expect(nombreDeLasNotas([])).toBe('notas de crédito');
    expect(nombreDeLasNotas([nota('1', 'nota_de_credito'), nota('2')])).toBe('notas de crédito');
  });

  it('solo de débito dice «notas de débito»', () => {
    expect(nombreDeLasNotas([nota('1', 'nota_de_debito')])).toBe('notas de débito');
  });

  it('con las dos familias dice ambas', () => {
    expect(nombreDeLasNotas([nota('1', 'nota_de_debito'), nota('2', 'nota_de_credito')])).toBe(
      'notas de crédito o de débito',
    );
  });
});
