import { describe, expect, it } from 'vitest';
import {
  ajustesDeSuperficie,
  convertirParaMostrar,
  vistaPreviaDeSuperficie,
  type AjustesDeSuperficie,
} from './unidades-de-superficie';

const AJUSTES: AjustesDeSuperficie = {
  factores: { metrosPorVara: 0.835905, varasCuadradasPorManzana: 10000, varasCuadradasPorCaballeria: 645816 },
  varasPorLadoDeCuerda: 25,
  unidadParaMostrar: 'manzana',
};

describe('ajustes de superficie de la sesión', () => {
  it('toma lo que manda el servidor y, si no llegó, los valores de fábrica', () => {
    const sinNada = ajustesDeSuperficie((_clave, predeterminado) => predeterminado);
    const conVaras = ajustesDeSuperficie((clave, predeterminado) =>
      clave.endsWith('varas_por_lado_de_cuerda') ? (40 as typeof predeterminado) : predeterminado,
    );

    expect(sinNada).toEqual(AJUSTES);
    expect(conVaras.varasPorLadoDeCuerda).toBe(40);
  });
});

describe('superficie en la unidad de la empresa', () => {
  it('los m² del servidor se convierten con los decimales de la unidad', () => {
    expect(convertirParaMostrar('6987.37', 'manzana', AJUSTES)).toEqual({ cifra: '1.0000', unidad: 'manzana' });
    expect(convertirParaMostrar('10000.00', 'hectarea', AJUSTES)).toEqual({ cifra: '1.0000', unidad: 'hectarea' });
    expect(convertirParaMostrar('1117.98', 'cuerda', { ...AJUSTES, varasPorLadoDeCuerda: 40 })).toEqual({
      cifra: '1.00',
      unidad: 'cuerda',
    });
  });

  it('sin superficie no hay nada que convertir', () => {
    expect(convertirParaMostrar(null, 'manzana', AJUSTES)).toBeNull();
  });
});

describe('vista previa de la calculadora', () => {
  const entrada = { cifra: '2', unidad: 'manzana' as const, varasPorLadoDeCuerda: 25 };

  it('muestra los m², las hectáreas y las manzanas en vivo', () => {
    const vista = vistaPreviaDeSuperficie(entrada, AJUSTES.factores);

    expect(vista.estado).toBe('lista');
    expect(vista.equivalencias).toEqual([
      { unidad: 'm2', cifra: '13974.74' },
      { unidad: 'hectarea', cifra: '1.3975' },
      { unidad: 'manzana', cifra: '2.0000' },
    ]);
    expect(vista.centesimas).toBe(1397474);
  });

  it('con cuerdas usa las varas por lado escritas', () => {
    const veinticinco = vistaPreviaDeSuperficie(
      { cifra: '16', unidad: 'cuerda', varasPorLadoDeCuerda: 25 },
      AJUSTES.factores,
    );
    const cuarenta = vistaPreviaDeSuperficie(
      { cifra: '1', unidad: 'cuerda', varasPorLadoDeCuerda: '40' },
      AJUSTES.factores,
    );

    expect(veinticinco.equivalencias[2]).toEqual({ unidad: 'manzana', cifra: '1.0000' });
    expect(cuarenta.equivalencias[0]).toEqual({ unidad: 'm2', cifra: '1117.98' });
  });

  it('mientras no se escribe nada no hay error ni equivalencias', () => {
    expect(vistaPreviaDeSuperficie({ ...entrada, cifra: '  ' }, AJUSTES.factores)).toMatchObject({
      estado: 'vacia',
      mensaje: null,
      equivalencias: [],
    });
  });

  it('una cifra que no sirve dice cómo corregirla', () => {
    expect(vistaPreviaDeSuperficie({ ...entrada, cifra: '1,5' }, AJUSTES.factores)).toMatchObject({
      estado: 'error',
      mensaje: expect.stringContaining('número positivo'),
    });
    expect(
      vistaPreviaDeSuperficie({ cifra: '1', unidad: 'cuerda', varasPorLadoDeCuerda: '' }, AJUSTES.factores).mensaje,
    ).toContain('varas');
  });
});
