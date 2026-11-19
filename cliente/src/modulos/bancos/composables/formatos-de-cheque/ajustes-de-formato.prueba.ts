import { describe, expect, it } from 'vitest';
import { ajustesDeFormato, conMedidasNumericas, copiaDelFormato } from './ajustes-de-formato';
import { conModoDeFecha } from './campos-del-formato';
import { formatoDeEjemplo } from './ejemplos-de-formato';

describe('ajustesDeFormato', () => {
  it('sin cambios no manda ajustes', () => {
    expect(ajustesDeFormato(formatoDeEjemplo(), copiaDelFormato(formatoDeEjemplo()))).toEqual({});
  });

  it('manda solo lo que difiere de la plantilla, campo por campo', () => {
    const editado = copiaDelFormato(formatoDeEjemplo());
    editado.desplazamiento.yMm = 1.5;
    editado.beneficiario.xMm = 30;
    expect(ajustesDeFormato(formatoDeEjemplo(), editado)).toEqual({
      desplazamiento: { yMm: 1.5 },
      beneficiario: { xMm: 30 },
    });
  });

  it('un campo opcional que se quita viaja como null y uno que se agrega, completo', () => {
    const editado = copiaDelFormato(formatoDeEjemplo());
    editado.montoEnLetras.segundaLinea = null;
    editado.talonFecha = { xMm: 15, yMm: 15, anchoMm: 60, visible: true, alineacion: 'izquierda' };
    expect(ajustesDeFormato(formatoDeEjemplo(), editado)).toEqual({
      montoEnLetras: { segundaLinea: null },
      talonFecha: { xMm: 15, yMm: 15, anchoMm: 60, visible: true, alineacion: 'izquierda' },
    });
  });

  it('si cambia el modo de la fecha, la fecha va completa', () => {
    const editado = conModoDeFecha(copiaDelFormato(formatoDeEjemplo()), 'casillas');
    const ajustes = ajustesDeFormato(formatoDeEjemplo(), editado);
    expect(ajustes.fecha).toMatchObject({ modo: 'casillas', dia: { xMm: 105, yMm: 12 } });
    expect(Object.keys(ajustes)).toEqual(['fecha']);
  });

  it('las medidas escritas como texto viajan como números', () => {
    const editado = copiaDelFormato(formatoDeEjemplo()) as unknown as Record<string, Record<string, unknown>>;
    editado.beneficiario!.xMm = '31.5';
    expect(ajustesDeFormato(formatoDeEjemplo(), editado as never)).toEqual({ beneficiario: { xMm: 31.5 } });
  });
});

describe('conMedidasNumericas', () => {
  it('quita el tamaño de letra vacío y deja NaN en una medida vacía para que el servidor avise', () => {
    const resultado = conMedidasNumericas({ campo: { tamanoPt: '', xMm: '' } }) as unknown as {
      campo: Record<string, number>;
    };
    expect('tamanoPt' in resultado.campo).toBe(false);
    expect(Number.isNaN(resultado.campo.xMm)).toBe(true);
  });
});
