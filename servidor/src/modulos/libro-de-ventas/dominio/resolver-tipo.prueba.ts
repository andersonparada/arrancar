import { describe, expect, it } from 'vitest';
import {
  TipoDeDocumentoObligatorio,
  TipoDteIncoherente,
  TipoDteObligatorio,
  TipoDteSinFel,
} from './errores-de-documento.js';
import { resolverTipoDeDocumento } from './resolver-tipo.js';
import {
  CODIGOS_DTE_DE_LA_FAMILIA,
  FAMILIA_DEL_TIPO_DTE,
  TIPOS_DE_DOCUMENTO,
  claseDeDocumento,
  tieneCartera,
} from './tipos-de-documento.js';

const AUTORIZACION = '11111111-1111-4111-8111-111111111111';

describe('resolver el tipo de documento', () => {
  it('deduce la familia del código de la SAT', () => {
    expect(resolverTipoDeDocumento({ tipoDte: 'FCAM', autorizacionFel: AUTORIZACION })).toEqual({
      tipo: 'factura_cambiaria',
      tipoDte: 'FCAM',
    });
    expect(resolverTipoDeDocumento({ tipoDte: 'NABN', autorizacionFel: AUTORIZACION }).tipo).toBe('nota_de_abono');
  });

  it('en papel basta la familia y no lleva código', () => {
    expect(resolverTipoDeDocumento({ tipo: 'factura', autorizacionFel: null })).toEqual({
      tipo: 'factura',
      tipoDte: null,
    });
  });

  it('rechaza lo incoherente', () => {
    expect(() => resolverTipoDeDocumento({ autorizacionFel: null })).toThrow(TipoDeDocumentoObligatorio);
    expect(() => resolverTipoDeDocumento({ tipo: 'factura', autorizacionFel: AUTORIZACION })).toThrow(
      TipoDteObligatorio,
    );
    expect(() => resolverTipoDeDocumento({ tipo: 'factura', tipoDte: 'FACT', autorizacionFel: null })).toThrow(
      TipoDteSinFel,
    );
    expect(() => resolverTipoDeDocumento({ tipo: 'factura', tipoDte: 'NCRE', autorizacionFel: AUTORIZACION })).toThrow(
      TipoDteIncoherente,
    );
  });
});

describe('el catálogo de tipos', () => {
  it('cada código pertenece a una sola familia', () => {
    const codigos = Object.values(CODIGOS_DTE_DE_LA_FAMILIA).flat();

    expect(new Set(codigos).size).toBe(codigos.length);
    expect(Object.keys(FAMILIA_DEL_TIPO_DTE)).toHaveLength(codigos.length);
  });

  it('las notas de crédito y de abono son abonos; lo demás, cargos', () => {
    const abonos = TIPOS_DE_DOCUMENTO.filter((tipo) => claseDeDocumento(tipo) === 'abono');

    expect(abonos).toEqual(['nota_de_credito', 'nota_de_abono']);
  });

  it('la factura especial y el recibo no son cartera', () => {
    expect(tieneCartera('factura')).toBe(true);
    expect(tieneCartera('nota_de_credito')).toBe(true);
    expect(tieneCartera('factura_especial_recibida')).toBe(false);
    expect(tieneCartera('recibo')).toBe(false);
  });
});
