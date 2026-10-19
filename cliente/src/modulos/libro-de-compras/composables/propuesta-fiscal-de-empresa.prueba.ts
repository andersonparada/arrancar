import { describe, expect, it } from 'vitest';
import {
  datosPropuestos,
  puedeSerAgenteDeIva,
  regimenesDeIsrPosibles,
  tieneRegimenDeIsr,
} from './propuesta-fiscal-de-empresa';

describe('datos propuestos de la empresa (tabla R1-e)', () => {
  it('general jurídica: utilidades, sin agente de IVA y con contabilidad completa', () => {
    expect(datosPropuestos('general', 'juridica')).toEqual({
      regimenIsr: 'utilidades',
      agenteDeRetencionIva: 'ninguno',
      esAgenteDeRetencionIsr: true,
    });
  });

  it('general individual con utilidades lleva contabilidad completa', () => {
    expect(datosPropuestos('general', 'individual', 'utilidades').esAgenteDeRetencionIsr).toBe(true);
  });

  it('general individual en el opcional simplificado no tiene propuesta: hay que preguntar', () => {
    const propuesta = datosPropuestos('general', 'individual', 'opcional_simplificado');
    expect(propuesta.regimenIsr).toBe('opcional_simplificado');
    expect(propuesta.esAgenteDeRetencionIsr).toBeUndefined();
  });

  it('una persona individual nunca queda exenta del ISR: vuelve a utilidades', () => {
    expect(datosPropuestos('general', 'individual', 'exento').regimenIsr).toBe('utilidades');
    expect(datosPropuestos('general', 'juridica', 'exento').regimenIsr).toBe('exento');
  });

  it.each(['pequeno_contribuyente', 'pequeno_contribuyente_electronico', 'primario_pecuario'] as const)(
    '%s: el ISR no aplica y solo la persona jurídica es agente del ISR',
    (regimen) => {
      expect(datosPropuestos(regimen, 'juridica')).toEqual({
        regimenIsr: null,
        agenteDeRetencionIva: 'ninguno',
        esAgenteDeRetencionIsr: true,
      });
      expect(datosPropuestos(regimen, 'individual').esAgenteDeRetencionIsr).toBe(false);
    },
  );

  it('contribuyente agropecuario individual: sin ISR ni agente; la jurídica no tiene propuesta', () => {
    expect(datosPropuestos('contribuyente_agropecuario', 'individual')).toEqual({
      regimenIsr: null,
      agenteDeRetencionIva: 'ninguno',
      esAgenteDeRetencionIsr: false,
    });
    expect(datosPropuestos('contribuyente_agropecuario', 'juridica').esAgenteDeRetencionIsr).toBeUndefined();
  });

  it('no afiliado jurídica: exento y agente; individual: sin propuesta de ISR y no agente', () => {
    expect(datosPropuestos('no_afiliado', 'juridica')).toMatchObject({
      regimenIsr: 'exento',
      esAgenteDeRetencionIsr: true,
    });
    expect(datosPropuestos('no_afiliado', 'individual')).toMatchObject({
      regimenIsr: undefined,
      esAgenteDeRetencionIsr: false,
    });
  });

  it('solo el general puede ser agente de IVA y solo general y no afiliado tienen régimen de ISR', () => {
    expect(puedeSerAgenteDeIva('general')).toBe(true);
    expect(puedeSerAgenteDeIva('no_afiliado')).toBe(false);
    expect(tieneRegimenDeIsr('no_afiliado')).toBe(true);
    expect(tieneRegimenDeIsr('primario_pecuario')).toBe(false);
  });

  it('la persona individual no puede escoger «exento»', () => {
    expect(regimenesDeIsrPosibles('individual')).not.toContain('exento');
    expect(regimenesDeIsrPosibles('juridica')).toContain('exento');
  });
});
