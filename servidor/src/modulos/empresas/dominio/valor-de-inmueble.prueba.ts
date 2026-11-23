import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import type { InmuebleId } from './inmueble.js';
import {
  CategoriaDeIusiFueraDeMatricula,
  ValorDeInmueble,
  ValorDeInmuebleInvalido,
  type DatosDeValorDeInmueble,
} from './valor-de-inmueble.js';

const contexto = { empresaId: Identificador.nuevo<'Empresa'>(), inmuebleId: Identificador.nuevo() as InmuebleId };

const datos = (cambios: Partial<DatosDeValorDeInmueble> = {}): DatosDeValorDeInmueble => ({
  fuente: 'matricula_fiscal',
  vigenteDesde: '2026-01-01',
  origen: 'avaluo_dicabi',
  valorTerreno: null,
  valorConstrucciones: null,
  valorCultivosPermanentes: null,
  valorTotal: '1000000.00',
  categoriaIusi: null,
  documento: null,
  ...cambios,
});

describe('valor de un inmueble', () => {
  it('guarda el valor con su fuente y su fecha, y recorta el documento', () => {
    const valor = ValorDeInmueble.crear(contexto, datos({ documento: '  Avalúo 123 ' }));

    expect(valor.instantanea()).toMatchObject({
      fuente: 'matricula_fiscal',
      documento: 'Avalúo 123',
      valorTotal: '1000000.00',
    });
  });

  it('el total debe ser mayor que cero y las partes no pueden ser negativas', () => {
    expect(() => ValorDeInmueble.crear(contexto, datos({ valorTotal: '0.00' }))).toThrow(ValorDeInmuebleInvalido);
    expect(() => ValorDeInmueble.crear(contexto, datos({ valorTerreno: '-1.00' }))).toThrow(ValorDeInmuebleInvalido);
  });

  it('las partes que vengan no pueden pasar del total', () => {
    const demasiado = datos({ valorTerreno: '600000.00', valorConstrucciones: '500000.00' });
    const justo = datos({ valorTerreno: '600000.00', valorConstrucciones: '400000.00' });

    expect(() => ValorDeInmueble.crear(contexto, demasiado)).toThrow('suman más');
    expect(ValorDeInmueble.crear(contexto, justo)).toBeInstanceOf(ValorDeInmueble);
  });

  it('si vienen las tres partes deben sumar exactamente el total, en centavos', () => {
    const faltan = datos({
      valorTerreno: '500000.00',
      valorConstrucciones: '400000.00',
      valorCultivosPermanentes: '99999.99',
    });
    const exacto = datos({
      valorTerreno: '0.10',
      valorConstrucciones: '0.20',
      valorCultivosPermanentes: '0.30',
      valorTotal: '0.60',
    });

    expect(() => ValorDeInmueble.crear(contexto, faltan)).toThrow('deben sumar');
    expect(ValorDeInmueble.crear(contexto, exacto)).toBeInstanceOf(ValorDeInmueble);
  });

  it('la categoría del IUSI solo va con el valor de matrícula fiscal', () => {
    const conMatricula = datos({ categoriaIusi: 'comercial' });
    const enCatastro = datos({ fuente: 'catastro_municipal', categoriaIusi: 'comercial' });

    expect(ValorDeInmueble.crear(contexto, conMatricula).instantanea().categoriaIusi).toBe('comercial');
    expect(() => ValorDeInmueble.crear(contexto, enCatastro)).toThrow(CategoriaDeIusiFueraDeMatricula);
  });

  it('el documento no pasa de 150 caracteres', () => {
    expect(() => ValorDeInmueble.crear(contexto, datos({ documento: 'x'.repeat(151) }))).toThrow(
      ValorDeInmuebleInvalido,
    );
  });
});
