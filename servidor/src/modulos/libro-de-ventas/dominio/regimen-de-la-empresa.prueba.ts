import { describe, expect, it } from 'vitest';
import { RegimenDerogado } from './errores-de-documento.js';
import {
  AVISO_DE_EMPRESA_INSCRITA,
  avisosDeFamiliaContraRegimen,
  cobraIva,
  exigirRegimenVigente,
  type RegimenDeIva,
} from './regimen-de-la-empresa.js';
import type { TipoDeDocumento } from './tipos-de-documento.js';

const DEROGACION = '2025-07-09';

describe('qué documento carga débito', () => {
  const sinFactura = { tipoDeLaFactura: null };

  it('lo decide la familia del documento, no el régimen del mes', () => {
    expect(cobraIva({ regimen: 'general', tipo: 'factura', ...sinFactura })).toBe(true);
    expect(cobraIva({ regimen: 'pequeno_contribuyente', tipo: 'factura', ...sinFactura })).toBe(true);
    expect(cobraIva({ regimen: 'general', tipo: 'factura_pequeno_contribuyente', ...sinFactura })).toBe(false);
    expect(cobraIva({ regimen: 'primario_pecuario', tipo: 'factura_primario_pecuario', ...sinFactura })).toBe(false);
    expect(cobraIva({ regimen: 'no_afiliado', tipo: 'factura_especial_recibida', ...sinFactura })).toBe(true);
  });

  it('el recibo y la nota de abono nunca llevan IVA', () => {
    expect(cobraIva({ regimen: 'general', tipo: 'recibo', ...sinFactura })).toBe(false);
    expect(cobraIva({ regimen: 'general', tipo: 'nota_de_abono', tipoDeLaFactura: 'factura' })).toBe(false);
  });

  it('la nota hereda el tratamiento de su factura', () => {
    const regimen = 'general';
    expect(cobraIva({ regimen, tipo: 'nota_de_credito', tipoDeLaFactura: 'factura_pequeno_contribuyente' })).toBe(
      false,
    );
    expect(cobraIva({ regimen: 'pequeno_contribuyente', tipo: 'nota_de_debito', tipoDeLaFactura: 'factura' })).toBe(
      true,
    );
  });

  it('la nota de una factura del sistema anterior usa el régimen del mes', () => {
    expect(cobraIva({ regimen: 'general', tipo: 'nota_de_credito', tipoDeLaFactura: null })).toBe(true);
    expect(cobraIva({ regimen: 'pequeno_contribuyente', tipo: 'nota_de_credito', tipoDeLaFactura: null })).toBe(false);
  });
});

describe('derogación de regímenes y familias', () => {
  const datos = (regimenIva: RegimenDeIva, tipo: TipoDeDocumento, fechaDeEmision: string) => ({
    regimenIva,
    tipo,
    fechaDeEmision,
  });

  it('rechaza el régimen derogado desde la fecha de la configuración', () => {
    const intento = () =>
      exigirRegimenVigente(datos('contribuyente_agropecuario', 'nota_de_credito', '2025-07-09'), DEROGACION);

    expect(intento).toThrow(RegimenDerogado);
  });

  it('rechaza la familia derogada aunque el régimen del mes ya sea otro', () => {
    const intento = () =>
      exigirRegimenVigente(datos('general', 'factura_contribuyente_agropecuario', '2026-01-10'), DEROGACION);

    expect(intento).toThrow(RegimenDerogado);
  });

  it('antes de la fecha el histórico se acepta', () => {
    const ok = () =>
      exigirRegimenVigente(
        datos('pequeno_contribuyente_electronico', 'factura_pequeno_contribuyente_electronico', '2025-07-08'),
        DEROGACION,
      );

    expect(ok).not.toThrow();
  });

  it('usa la fecha que se le da, no una fija', () => {
    const intento = () =>
      exigirRegimenVigente(datos('contribuyente_agropecuario', 'nota_de_debito', '2025-12-01'), '2026-01-01');

    expect(intento).not.toThrow();
  });

  it('los regímenes vigentes no se tocan', () => {
    expect(() => exigirRegimenVigente(datos('general', 'factura', '2030-01-01'), DEROGACION)).not.toThrow();
  });
});

describe('avisos de la familia contra el régimen', () => {
  it('la familia del régimen no avisa', () => {
    expect(avisosDeFamiliaContraRegimen('general', 'factura_cambiaria')).toEqual([]);
    expect(avisosDeFamiliaContraRegimen('pequeno_contribuyente', 'nota_de_credito')).toEqual([]);
  });

  it('otra familia avisa y nombra el régimen', () => {
    const [aviso] = avisosDeFamiliaContraRegimen('general', 'factura_pequeno_contribuyente');

    expect(aviso).toContain('general del IVA');
  });

  it('la factura especial avisa en todo régimen menos en el no afiliado', () => {
    expect(avisosDeFamiliaContraRegimen('general', 'factura_especial_recibida')).toEqual([AVISO_DE_EMPRESA_INSCRITA]);
    expect(avisosDeFamiliaContraRegimen('primario_pecuario', 'factura_especial_recibida')).toEqual([
      AVISO_DE_EMPRESA_INSCRITA,
    ]);
    expect(avisosDeFamiliaContraRegimen('no_afiliado', 'factura_especial_recibida')).toEqual([]);
  });
});
