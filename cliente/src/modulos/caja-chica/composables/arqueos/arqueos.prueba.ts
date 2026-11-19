import { describe, expect, it } from 'vitest';
import {
  contadoEnCentavos,
  cuerpoDelArqueo,
  edicionDeArqueo,
  faltantesDelArqueo,
  resultadoDelConteo,
  unidadesDe,
} from './edicion-de-arqueo';

const propuesta = { denominaciones: ['100.00', '50.00', '1.00', '0.25'], efectivoEsperado: '351.25' };
const conteo = (cantidades: Record<string, string | number>) => ({ ...edicionDeArqueo(), cantidades });

describe('conteo del arqueo', () => {
  it('entiende solo enteros de cero en adelante; vacío es cero', () => {
    expect(unidadesDe('')).toBe(0);
    expect(unidadesDe(3)).toBe(3);
    expect(unidadesDe('2.5')).toBeNull();
    expect(unidadesDe('-1')).toBeNull();
  });

  it('suma denominación por cantidad', () => {
    const edicion = conteo({ '100.00': 3, '50.00': 1, '0.25': 5 });
    expect(contadoEnCentavos(edicion, propuesta.denominaciones)).toBe(35125);
  });

  it('dice que cuadra, falta o sobra contra lo esperado', () => {
    expect(resultadoDelConteo(conteo({ '100.00': 3, '50.00': 1, '1.00': 1, '0.25': 1 }), propuesta)).toEqual({
      contado: '351.25',
      porCambiar: '0.00',
      diferencia: '0.00',
      tipo: 'cuadra',
    });
    expect(resultadoDelConteo(conteo({ '100.00': 3 }), propuesta)).toMatchObject({
      diferencia: '-51.25',
      tipo: 'faltante',
    });
    const conCheques = { ...conteo({ '100.00': 3 }), valoresPorCambiar: '60' };
    expect(resultadoDelConteo(conCheques, propuesta)).toMatchObject({
      porCambiar: '60.00',
      diferencia: '8.75',
      tipo: 'sobrante',
    });
  });
});

describe('lo que falta para registrar el arqueo', () => {
  it('pide responder por los comprobantes aunque cuadre', () => {
    expect(Object.keys(faltantesDelArqueo(edicionDeArqueo(), { tipo: 'cuadra' }))).toEqual(['comprobantesCompletos']);
  });

  it('con faltante pide el motivo y qué hacer con él; con sobrante solo el motivo', () => {
    const edicion = { ...edicionDeArqueo(), comprobantesCompletos: true };
    expect(Object.keys(faltantesDelArqueo(edicion, { tipo: 'faltante' })).sort()).toEqual([
      'destinoDelFaltante',
      'motivoDeDiferencia',
    ]);
    expect(Object.keys(faltantesDelArqueo(edicion, { tipo: 'sobrante' }))).toEqual(['motivoDeDiferencia']);
  });

  it('rechaza una cantidad que no es un entero', () => {
    const edicion = { ...conteo({ '100.00': '1.5' }), comprobantesCompletos: true };
    expect(faltantesDelArqueo(edicion, { tipo: 'cuadra' })).toHaveProperty('conteo');
  });
});

describe('cuerpo del arqueo', () => {
  it('envía solo lo contado, en centavos', () => {
    const edicion = { ...conteo({ '100.00': 2, '50.00': '', '0.25': '4' }), comprobantesCompletos: true };
    expect(cuerpoDelArqueo(edicion, { denominaciones: propuesta.denominaciones, tipo: 'cuadra' })).toEqual({
      conteo: [
        { denominacionCentavos: 10000, cantidad: 2 },
        { denominacionCentavos: 25, cantidad: 4 },
      ],
      comprobantesCompletos: true,
      observaciones: null,
      motivoDeDiferencia: null,
      destinoDelFaltante: null,
    });
  });

  it('con faltante lleva el motivo, el destino y los valores por cambiar', () => {
    const edicion = {
      ...conteo({ '100.00': 1 }),
      valoresPorCambiar: '12.5',
      comprobantesCompletos: false,
      motivoDeDiferencia: ' Se pagó sin vale ',
      destinoDelFaltante: 'perdida' as const,
    };
    expect(cuerpoDelArqueo(edicion, { denominaciones: propuesta.denominaciones, tipo: 'faltante' })).toMatchObject({
      valoresPorCambiar: '12.50',
      comprobantesCompletos: false,
      motivoDeDiferencia: 'Se pagó sin vale',
      destinoDelFaltante: 'perdida',
    });
  });
});
