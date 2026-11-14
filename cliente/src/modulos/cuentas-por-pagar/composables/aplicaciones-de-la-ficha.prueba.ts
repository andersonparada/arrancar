import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { AplicacionDelDocumento, FichaDelDocumento } from '../servicios/tipos';
import { avisoDeAplicacionesManuales, resumenDeAnularAjuste, resumenDeQuitar } from './aplicaciones-de-la-ficha';

// Los formatos de fecha y monto leen la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));

function aplicacion(numero: string, forma: 'manual' | 'automatica'): AplicacionDelDocumento {
  return {
    id: numero,
    forma,
    fecha: '2026-11-01',
    referencia: null,
    puedeQuitar: forma === 'manual',
    notaId: `n${numero}`,
    notaSerie: 'N',
    notaNumero: numero,
    cargoId: 'c',
    cargoSerie: 'A',
    cargoNumero: '7',
    monto: '10.00',
  };
}

const ficha = (clase: 'cargo' | 'abono', aplicaciones: AplicacionDelDocumento[]) => ({ clase, aplicaciones });

describe('avisoDeAplicacionesManuales', () => {
  it('nombra la nota de las aplicaciones manuales de un cargo', () => {
    expect(avisoDeAplicacionesManuales(ficha('cargo', [aplicacion('1', 'manual')]))).toMatch(
      /la nota N-1.*quite primero/,
    );
  });

  it('nombra todas las notas sin repetirlas', () => {
    const aviso = avisoDeAplicacionesManuales(
      ficha('cargo', [aplicacion('1', 'manual'), aplicacion('2', 'manual'), aplicacion('1', 'manual')]),
    );
    expect(aviso).toMatch(/las notas N-1, N-2\./);
  });

  it('calla con aplicaciones automáticas o en la ficha de una nota', () => {
    expect(avisoDeAplicacionesManuales(ficha('cargo', [aplicacion('1', 'automatica')]))).toBeNull();
    expect(
      avisoDeAplicacionesManuales(ficha('abono', [aplicacion('1', 'manual')] as FichaDelDocumento['aplicaciones'])),
    ).toBeNull();
  });
});

describe('resumenDeQuitar', () => {
  it('dice qué documento vuelve a deber y qué nota recupera el saldo', () => {
    const texto = resumenDeQuitar(aplicacion('1', 'manual'));
    expect(texto).toContain('A-7');
    expect(texto).toContain('N-1');
  });
});

describe('resumenDeAnularAjuste', () => {
  it('dice que el monto vuelve al saldo a favor', () => {
    const texto = resumenDeAnularAjuste({ monto: '5.00', fecha: '2026-11-01' } as never);
    expect(texto).toMatch(/volverá al saldo a favor/);
  });
});
