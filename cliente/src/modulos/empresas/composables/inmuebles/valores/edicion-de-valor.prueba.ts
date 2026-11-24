import { describe, expect, it } from 'vitest';
import type { ValorDeInmueble } from '../../../servicios/valores-de-inmueble.api';
import {
  datosDeValor,
  edicionDeValor,
  hoyEnIso,
  mensajeDeEliminacionDeValor,
  valorVigente,
  valoresDeLaFuente,
} from './edicion-de-valor';

const valor = (cambios: Partial<ValorDeInmueble>): ValorDeInmueble => ({
  id: 'v1',
  inmuebleId: 'i1',
  fuente: 'matricula_fiscal',
  vigenteDesde: '2026-01-01',
  origen: 'autoavaluo',
  valorTerreno: null,
  valorConstrucciones: null,
  valorCultivosPermanentes: null,
  valorTotal: '1000.00',
  categoriaIusi: null,
  documento: null,
  archivoId: null,
  ...cambios,
});

describe('ventana de valores del inmueble', () => {
  it('abre vacía con el origen usual de cada serie', () => {
    expect(edicionDeValor('matricula_fiscal')).toMatchObject({
      abierta: true,
      origen: 'avaluo_dicabi',
      valorTotal: '',
    });
    expect(edicionDeValor('catastro_municipal').origen).toBe('avaluo_municipal');
  });

  it('lo vacío se manda como null y los montos como texto, sin convertirlos en número', () => {
    const edicion = {
      ...edicionDeValor('matricula_fiscal'),
      vigenteDesde: '2026-03-01',
      valorTerreno: ' 600000.50 ',
      valorTotal: '1000000.00',
      documento: '  ',
    };

    expect(datosDeValor(edicion)).toEqual({
      fuente: 'matricula_fiscal',
      vigenteDesde: '2026-03-01',
      origen: 'avaluo_dicabi',
      valorTerreno: '600000.50',
      valorConstrucciones: null,
      valorCultivosPermanentes: null,
      valorTotal: '1000000.00',
      categoriaIusi: null,
      documento: null,
    });
  });

  it('la categoría del IUSI solo se manda con la matrícula fiscal', () => {
    const matricula = { ...edicionDeValor('matricula_fiscal'), categoriaIusi: 'mixto' as const };
    const catastro = { ...edicionDeValor('catastro_municipal'), categoriaIusi: 'mixto' as const };

    expect(datosDeValor(matricula).categoriaIusi).toBe('mixto');
    expect(datosDeValor(catastro).categoriaIusi).toBeNull();
  });
});

describe('series de valores', () => {
  const lista = [
    valor({ id: 'a', vigenteDesde: '2027-01-01' }),
    valor({ id: 'b', vigenteDesde: '2026-01-01' }),
    valor({ id: 'c', fuente: 'catastro_municipal', vigenteDesde: '2025-01-01' }),
    valor({ id: 'd', vigenteDesde: '2020-01-01' }),
  ];

  it('separa cada fuente en su lista', () => {
    expect(valoresDeLaFuente(lista, 'matricula_fiscal').map((v) => v.id)).toEqual(['a', 'b', 'd']);
    expect(valoresDeLaFuente(lista, 'catastro_municipal').map((v) => v.id)).toEqual(['c']);
  });

  it('el vigente es el más reciente que ya empezó, no uno futuro', () => {
    const matricula = valoresDeLaFuente(lista, 'matricula_fiscal');

    expect(valorVigente(matricula, '2026-09-29')?.id).toBe('b');
    expect(valorVigente(matricula, '2019-12-31')).toBeNull();
  });

  it('hoy se arma con la fecha local, con dos dígitos', () => {
    expect(hoyEnIso(new Date(2026, 2, 5, 23, 59))).toBe('2026-03-05');
  });

  it('el aviso de eliminación dice la fuente y la fecha', () => {
    expect(mensajeDeEliminacionDeValor('catastro_municipal', '01/01/2025')).toContain(
      'catastro municipal vigente desde 01/01/2025',
    );
  });
});
