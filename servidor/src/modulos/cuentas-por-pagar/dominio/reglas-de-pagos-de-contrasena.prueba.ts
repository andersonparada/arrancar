import { describe, expect, it } from 'vitest';
import type { LineaDePago } from './pagos.js';
import {
  exigirContrasenaSinPagosVigentes,
  exigirDocumentoSinPagosEnLaContrasena,
} from './reglas-de-pagos-de-contrasena.js';

const linea = (cambios: Partial<LineaDePago> = {}): LineaDePago => ({
  pagoId: 'p1',
  numero: 1,
  anioDeNumero: 0,
  forma: 'cheque',
  fecha: '2026-11-14',
  estado: 'vigente',
  contrasenaId: 'c1',
  cargoId: 'doc1',
  montoCentavos: 1000,
  retencionDescontadaCentavos: 0,
  ...cambios,
});

describe('contraseña con pagos', () => {
  it('con un pago vigente no se anula', () => {
    expect(() => exigirContrasenaSinPagosVigentes('2026-3', [linea()])).toThrow(
      expect.objectContaining({ codigo: 'contrasena_con_pagos' }),
    );
    expect(() => exigirContrasenaSinPagosVigentes('2026-3', [linea()])).toThrow('La contraseña 2026-3 tiene pagos');
  });

  it('sin pagos, o solo con pagos anulados, se anula', () => {
    expect(() => exigirContrasenaSinPagosVigentes('3', [])).not.toThrow();
    expect(() => exigirContrasenaSinPagosVigentes('3', [linea({ estado: 'anulado' })])).not.toThrow();
  });

  it('cualquier forma de pago cuenta, también la que no tiene movimiento en Bancos', () => {
    expect(() => exigirContrasenaSinPagosVigentes('3', [linea({ forma: 'cuenta_de_apertura' })])).toThrow();
    expect(() => exigirContrasenaSinPagosVigentes('3', [linea({ forma: 'nota_ligada' })])).toThrow();
  });
});

describe('quitar un documento de la contraseña', () => {
  it('con un pago, vigente o anulado, el documento no se quita', () => {
    for (const estado of ['vigente', 'anulado'] as const) {
      expect(() => exigirDocumentoSinPagosEnLaContrasena('A-100', 'doc1', [linea({ estado })])).toThrow(
        expect.objectContaining({ codigo: 'documento_con_pagos_en_la_contrasena' }),
      );
    }
  });

  it('un documento sin pagos sí se quita aunque otro de la contraseña tenga', () => {
    expect(() => exigirDocumentoSinPagosEnLaContrasena('A-101', 'doc2', [linea()])).not.toThrow();
    expect(() => exigirDocumentoSinPagosEnLaContrasena('A-101', 'doc2', [])).not.toThrow();
  });
});
