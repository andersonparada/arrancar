import { describe, expect, it } from 'vitest';
import { DatosFiscalesDeEmpresa, type PropiedadesFiscalesDeEmpresa } from './datos-fiscales-de-empresa.js';
import { DatosFiscalesDeProveedor } from './datos-fiscales-de-proveedor.js';
import { DatosDeLaFelIncompletos } from './errores-de-documento.js';
import { VendedorDeFacturaEspecialInvalido, VendedorNoCoincide } from './errores-de-factura-especial.js';
import {
  AVISO_DE_EMPRESA_NO_AFILIADA,
  AVISO_DE_EMPRESA_SIN_CONTABILIDAD_COMPLETA,
  AVISO_DE_FACTURA_ESPECIFICA,
  AVISO_DE_PROVEEDOR_INSCRITO,
  avisosDeLaFacturaEspecial,
  resolverFacturaEspecial,
  type DatosDeLaFacturaEspecial,
} from './factura-especial.js';
import { ReceptorInvalido } from './errores-de-documento.js';

const NIT_EMPRESA = '12345679';
const NIT_VENDEDOR = '576937K';
const CUI_VENDEDOR = '1234567890101';

const datos = (cambios: Partial<DatosDeLaFacturaEspecial> = {}): DatosDeLaFacturaEspecial => ({
  nitDeLaEmpresa: NIT_EMPRESA,
  vendedor: NIT_VENDEDOR,
  serie: 'A',
  autorizacionFel: 'AUT-1',
  proveedor: { nit: null, dpi: null },
  ...cambios,
});

describe('encabezado de la factura especial', () => {
  it('el emisor es la empresa y el vendedor es el receptor', () => {
    const resuelta = resolverFacturaEspecial(datos({ proveedor: { nit: NIT_VENDEDOR, dpi: null } }));

    expect(resuelta).toEqual({
      nitEmisor: NIT_EMPRESA,
      nitReceptor: NIT_VENDEDOR,
      nitParaCompletar: null,
      dpiParaCompletar: null,
    });
  });

  it('el vendedor puede coincidir con el DPI del proveedor', () => {
    const resuelta = resolverFacturaEspecial(
      datos({ vendedor: '1234 56789 0101', proveedor: { nit: null, dpi: CUI_VENDEDOR } }),
    );

    expect(resuelta.nitReceptor).toBe(CUI_VENDEDOR);
    expect(resuelta.dpiParaCompletar).toBeNull();
  });

  it('sin NIT ni DPI en el proveedor, completa el NIT si el vendedor es un NIT', () => {
    const resuelta = resolverFacturaEspecial(datos());

    expect(resuelta.nitParaCompletar).toBe(NIT_VENDEDOR);
    expect(resuelta.dpiParaCompletar).toBeNull();
  });

  it('sin NIT ni DPI en el proveedor, completa el DPI si el vendedor es un CUI', () => {
    const resuelta = resolverFacturaEspecial(datos({ vendedor: CUI_VENDEDOR }));

    expect(resuelta.dpiParaCompletar).toBe(CUI_VENDEDOR);
    expect(resuelta.nitParaCompletar).toBeNull();
  });

  it('un vendedor distinto del NIT y del DPI guardados es un error', () => {
    expect(() => resolverFacturaEspecial(datos({ proveedor: { nit: '7654321', dpi: null } }))).toThrow(
      VendedorNoCoincide,
    );
    expect(() => resolverFacturaEspecial(datos({ proveedor: { nit: null, dpi: CUI_VENDEDOR } }))).toThrow(
      VendedorNoCoincide,
    );
  });

  it('el vendedor no puede faltar, ser consumidor final, la propia empresa ni algo que no es NIT ni CUI', () => {
    for (const vendedor of [null, '', 'CF', 'cf', NIT_EMPRESA]) {
      expect(() => resolverFacturaEspecial(datos({ vendedor }))).toThrow(VendedorDeFacturaEspecialInvalido);
    }
    expect(() => resolverFacturaEspecial(datos({ vendedor: '123' }))).toThrow(ReceptorInvalido);
  });

  it('exige la serie y la autorización de la FEL', () => {
    expect(() => resolverFacturaEspecial(datos({ serie: null }))).toThrow(DatosDeLaFelIncompletos);
    expect(() => resolverFacturaEspecial(datos({ autorizacionFel: null }))).toThrow(/serie|autorización/);
  });
});

describe('avisos de la factura especial', () => {
  const empresa = (cambios: Partial<PropiedadesFiscalesDeEmpresa> = {}) =>
    DatosFiscalesDeEmpresa.crear({ ...DatosFiscalesDeEmpresa.porOmision().instantanea(), ...cambios });
  const vendedor = DatosFiscalesDeProveedor.porOmision({ regimenIva: 'sin_inscripcion' });

  it('siempre menciona la factura específica y nada más si todo está en orden', () => {
    expect(avisosDeLaFacturaEspecial({ empresa: empresa(), proveedor: vendedor })).toEqual([
      AVISO_DE_FACTURA_ESPECIFICA,
    ]);
  });

  it('avisa si la empresa no lleva contabilidad completa', () => {
    const sinContabilidad = empresa({ esAgenteDeRetencionIsr: false });

    expect(avisosDeLaFacturaEspecial({ empresa: sinContabilidad, proveedor: vendedor })).toEqual([
      AVISO_DE_EMPRESA_SIN_CONTABILIDAD_COMPLETA,
      AVISO_DE_FACTURA_ESPECIFICA,
    ]);
  });

  it('avisa si la empresa no está afiliada al IVA', () => {
    const noAfiliada = empresa({ regimenIva: 'no_afiliado' });

    expect(avisosDeLaFacturaEspecial({ empresa: noAfiliada, proveedor: vendedor })).toContain(
      AVISO_DE_EMPRESA_NO_AFILIADA,
    );
  });

  it('avisa si el proveedor está inscrito en el IVA', () => {
    const inscrito = DatosFiscalesDeProveedor.porOmision();

    expect(avisosDeLaFacturaEspecial({ empresa: empresa(), proveedor: inscrito })).toEqual([
      AVISO_DE_PROVEEDOR_INSCRITO,
      AVISO_DE_FACTURA_ESPECIFICA,
    ]);
  });

  it('los textos son los que revisó el contador', () => {
    expect(AVISO_DE_EMPRESA_SIN_CONTABILIDAD_COMPLETA).toBe(
      'Su empresa no lleva contabilidad completa: confirme con su contador la retención del ISR (Decreto 10-2012 art. 16).',
    );
    expect(AVISO_DE_EMPRESA_NO_AFILIADA).toContain('confirme su habilitación como emisora de facturas especiales');
    expect(AVISO_DE_PROVEEDOR_INSCRITO).toBe(
      'No se emite factura especial entre contribuyentes del IVA, salvo que conste la negativa del vendedor a facturar (Ley del IVA art. 52).',
    );
    expect(AVISO_DE_FACTURA_ESPECIFICA).toBe(
      'Si compra productos agropecuarios a un productor del régimen primario o pecuario, puede corresponder la factura específica (FEPE).',
    );
  });
});
