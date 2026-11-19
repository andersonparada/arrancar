import { describe, expect, it } from 'vitest';
import {
  datosDeReimpresion,
  MAXIMO_DEL_MOTIVO,
  problemaDelMotivo,
  reimpresionCerrada,
  reimpresionNueva,
  resumenDeLaReimpresion,
} from './edicion-de-reimpresion';

describe('ventana de reimprimir', () => {
  it('abre sin motivo y con «Solo el comprobante»', () => {
    expect(reimpresionNueva('c1', 'cheque 7')).toEqual({
      abierta: true,
      chequeId: 'c1',
      titulo: 'cheque 7',
      motivo: '',
      conCheque: false,
    });
    expect(reimpresionCerrada().abierta).toBe(false);
  });

  it('manda el motivo recortado y lo que se eligió', () => {
    expect(
      datosDeReimpresion({ ...reimpresionNueva('c1', 'cheque 7'), motivo: '  Se atascó el papel ', conCheque: true }),
    ).toEqual({
      motivo: 'Se atascó el papel',
      conCheque: true,
    });
  });
});

describe('problemaDelMotivo', () => {
  it('sin motivo dice cómo corregirlo', () => {
    expect(problemaDelMotivo('   ')).toMatch(/Escriba el motivo/);
  });

  it('un motivo largo dice cuántos caracteres sobran', () => {
    expect(problemaDelMotivo('a'.repeat(MAXIMO_DEL_MOTIVO + 5))).toMatch(/sobran 5/);
  });

  it('un motivo bueno no tiene problema', () => {
    expect(problemaDelMotivo('Se atascó el papel')).toBeNull();
  });
});

describe('resumenDeLaReimpresion', () => {
  it('solo el comprobante no toca el cheque', () => {
    expect(resumenDeLaReimpresion({ titulo: 'cheque 7', conCheque: false })).toMatch(
      /Solo se imprimirá otra copia del comprobante/,
    );
  });

  it('con el cheque pide un formulario en blanco', () => {
    expect(resumenDeLaReimpresion({ titulo: 'cheque 7', conCheque: true })).toMatch(/formulario en blanco/);
  });
});
