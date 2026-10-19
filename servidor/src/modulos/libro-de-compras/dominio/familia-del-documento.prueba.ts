import { describe, expect, it } from 'vitest';
import {
  FacturaEspecialNoDisponible,
  FamiliaAunNoVigente,
  FamiliaDerogada,
  TipoDeDocumentoObligatorio,
  TipoDteIncoherente,
  TipoDteObligatorio,
  TipoDteSinFel,
} from './errores-de-familia.js';
import {
  avisosDeLaFamilia,
  AVISO_DE_PRIMARIO_Y_PECUARIO,
  esFamiliaSinIva,
  exigirFechaDeLaFamilia,
  resolverTipoDeDocumento,
} from './familia-del-documento.js';
import { FAMILIA_DEL_TIPO_DTE, TIPOS_DTE } from './tipos-de-documento.js';

const FEL = '5b0f3c4e-6c1d-4f8e-9c3a-0d6c7e8f9a1b';
const DEROGACION = '2025-07-09';

describe('resolverTipoDeDocumento', () => {
  it('deduce la familia del código de la SAT', () => {
    for (const tipoDte of TIPOS_DTE.filter((codigo) => codigo !== 'FESP')) {
      expect(resolverTipoDeDocumento({ tipoDte, autorizacionFel: FEL })).toEqual({
        tipo: FAMILIA_DEL_TIPO_DTE[tipoDte],
        tipoDte,
      });
    }
  });

  it('si llegan los dos deben coincidir', () => {
    expect(resolverTipoDeDocumento({ tipo: 'factura', tipoDte: 'FCAM', autorizacionFel: FEL }).tipo).toBe('factura');
    expect(() => resolverTipoDeDocumento({ tipo: 'factura', tipoDte: 'FPEQ', autorizacionFel: FEL })).toThrow(
      TipoDteIncoherente,
    );
  });

  it('con FEL el código es obligatorio; sin FEL no se escribe', () => {
    expect(() => resolverTipoDeDocumento({ tipo: 'factura', autorizacionFel: FEL })).toThrow(TipoDteObligatorio);
    expect(() => resolverTipoDeDocumento({ tipoDte: 'FACT', autorizacionFel: null })).toThrow(TipoDteSinFel);
    expect(resolverTipoDeDocumento({ tipo: 'recibo', autorizacionFel: null })).toEqual({
      tipo: 'recibo',
      tipoDte: null,
    });
  });

  it('sin tipo ni código es un error', () => {
    expect(() => resolverTipoDeDocumento({ autorizacionFel: null })).toThrow(TipoDeDocumentoObligatorio);
  });

  it('la factura especial dice que estará disponible próximamente', () => {
    expect(() => resolverTipoDeDocumento({ tipoDte: 'FESP', autorizacionFel: FEL })).toThrow(
      FacturaEspecialNoDisponible,
    );
    expect(() => resolverTipoDeDocumento({ tipo: 'factura_especial', autorizacionFel: null })).toThrow(
      /disponible próximamente/,
    );
  });
});

describe('exigirFechaDeLaFamilia', () => {
  it('las derogadas se emitieron antes de la fecha de derogación', () => {
    for (const tipo of ['factura_pequeno_contribuyente_electronico', 'factura_contribuyente_agropecuario'] as const) {
      expect(() => exigirFechaDeLaFamilia({ tipo, fechaDeEmision: '2025-07-08' }, DEROGACION)).not.toThrow();
      expect(() => exigirFechaDeLaFamilia({ tipo, fechaDeEmision: DEROGACION }, DEROGACION)).toThrow(FamiliaDerogada);
    }
  });

  it('la fecha de derogación es la de la configuración', () => {
    const tipo = 'factura_contribuyente_agropecuario';

    expect(() => exigirFechaDeLaFamilia({ tipo, fechaDeEmision: '2025-09-01' }, '2025-12-31')).not.toThrow();
    expect(() => exigirFechaDeLaFamilia({ tipo, fechaDeEmision: '2025-09-01' }, '2025-08-31')).toThrow(FamiliaDerogada);
  });

  it('el primario y pecuario existe desde el 2025-04-09', () => {
    const tipo = 'factura_primario_pecuario';

    expect(() => exigirFechaDeLaFamilia({ tipo, fechaDeEmision: '2025-04-08' }, DEROGACION)).toThrow(
      FamiliaAunNoVigente,
    );
    expect(() => exigirFechaDeLaFamilia({ tipo, fechaDeEmision: '2025-04-09' }, DEROGACION)).not.toThrow();
    expect(() => exigirFechaDeLaFamilia({ tipo, fechaDeEmision: '2027-01-01' }, DEROGACION)).not.toThrow();
  });

  it('las demás familias no miran la fecha', () => {
    for (const tipo of ['factura', 'factura_pequeno_contribuyente', 'nota_de_credito', 'recibo'] as const) {
      expect(() => exigirFechaDeLaFamilia({ tipo, fechaDeEmision: '2030-01-01' }, DEROGACION)).not.toThrow();
    }
  });
});

describe('familias sin IVA y avisos', () => {
  it('cuatro familias no cobran IVA', () => {
    expect(esFamiliaSinIva('factura_primario_pecuario')).toBe(true);
    expect(esFamiliaSinIva('factura_contribuyente_agropecuario')).toBe(true);
    expect(esFamiliaSinIva('factura')).toBe(false);
    expect(esFamiliaSinIva('nota_de_credito')).toBe(false);
  });

  it('solo el primario y pecuario lleva el aviso de que paga el productor', () => {
    expect(avisosDeLaFamilia('factura_primario_pecuario')).toEqual([AVISO_DE_PRIMARIO_Y_PECUARIO]);
    expect(AVISO_DE_PRIMARIO_Y_PECUARIO).toBe(
      'Productor primario o pecuario: el impuesto lo paga el productor; no se retiene IVA ni ISR.',
    );
    expect(avisosDeLaFamilia('factura_contribuyente_agropecuario')).toEqual([]);
    expect(avisosDeLaFamilia('factura')).toEqual([]);
  });
});
