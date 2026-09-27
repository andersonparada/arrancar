import { describe, expect, it } from 'vitest';
import { RaizAgregado } from './entidad.js';
import { EventoDominio } from './evento-dominio.js';
import { Identificador, IdentificadorInvalido } from './identificador.js';

type PotreroId = Identificador<'Potrero'>;

class PotreroSembrado extends EventoDominio<{ potreroId: string; pasto: string }> {
  readonly nombre = 'pruebas.potrero_sembrado';

  constructor(potreroId: PotreroId, pasto: string) {
    super({ potreroId: potreroId.valor, pasto });
  }
}

class Potrero extends RaizAgregado<PotreroId> {
  private constructor(id: PotreroId) {
    super(id);
  }

  static nuevo(): Potrero {
    return new Potrero(Identificador.nuevo());
  }

  static conId(id: PotreroId): Potrero {
    return new Potrero(id);
  }

  sembrar(pasto: string): void {
    this.registrarEvento(new PotreroSembrado(this.id, pasto));
  }
}

describe('Identificador', () => {
  it('genera identificadores distintos cada vez', () => {
    expect(Identificador.nuevo().esIgualA(Identificador.nuevo())).toBe(false);
  });

  it('acepta un UUID escrito en mayúsculas y lo guarda en minúsculas', () => {
    const id = Identificador.desde('5F0C6D2E-1B4A-4C8E-9D3F-2A7B8C9D0E1F');

    expect(id.valor).toBe('5f0c6d2e-1b4a-4c8e-9d3f-2a7b8c9d0e1f');
  });

  it('rechaza textos que no son un UUID', () => {
    expect(() => Identificador.desde('123')).toThrow(IdentificadorInvalido);
  });

  it('no deja usar el identificador de una entidad donde se espera el de otra', () => {
    const idDePotrero: PotreroId = Identificador.nuevo();

    // @ts-expect-error: un identificador de potrero no es un identificador de vaca.
    const idDeVaca: Identificador<'Vaca'> = idDePotrero;

    expect(idDeVaca).toBe(idDePotrero);
  });
});

describe('entidades y raíces de agregado', () => {
  it('dos objetos con el mismo identificador son la misma entidad', () => {
    const id: PotreroId = Identificador.nuevo();

    expect(Potrero.conId(id).esLaMismaQue(Potrero.conId(id))).toBe(true);
    expect(Potrero.nuevo().esLaMismaQue(Potrero.nuevo())).toBe(false);
  });

  it('anota los eventos en el orden en que ocurren', () => {
    const potrero = Potrero.nuevo();

    potrero.sembrar('Brachiaria');
    potrero.sembrar('Mombasa');

    expect(potrero.extraerEventos().map((evento) => evento.datos)).toEqual([
      { potreroId: potrero.id.valor, pasto: 'Brachiaria' },
      { potreroId: potrero.id.valor, pasto: 'Mombasa' },
    ]);
  });

  it('entrega cada evento una sola vez', () => {
    const potrero = Potrero.nuevo();
    potrero.sembrar('Brachiaria');

    potrero.extraerEventos();

    expect(potrero.extraerEventos()).toEqual([]);
  });
});
