import { describe, expect, it } from 'vitest';
import {
  costoFiscalDeControl,
  estaObligadaAContabilidadCompleta,
  type DatosFiscalesDeLaVenta,
} from './costo-fiscal-de-control.js';
import { BajaInvalida } from './errores-de-baja.js';

const SOCIEDAD: DatosFiscalesDeLaVenta = {
  tipoDePersona: 'juridica',
  regimenDeIva: 'general',
  regimenDeIsr: 'utilidades',
  llevaContabilidadCompleta: true,
};
const SIMPLIFICADO: DatosFiscalesDeLaVenta = {
  tipoDePersona: 'individual',
  regimenDeIva: 'general',
  regimenDeIsr: 'opcional_simplificado',
  llevaContabilidadCompleta: false,
};
const PEQUENO: DatosFiscalesDeLaVenta = {
  tipoDePersona: 'individual',
  regimenDeIva: 'pequeno_contribuyente',
  regimenDeIsr: null,
  llevaContabilidadCompleta: false,
};

describe('estaObligadaAContabilidadCompleta', () => {
  it('sigue la casilla de los datos fiscales: una sociedad en el simplificado que la lleva está obligada', () => {
    expect(estaObligadaAContabilidadCompleta(SOCIEDAD)).toBe(true);
    expect(estaObligadaAContabilidadCompleta({ ...SOCIEDAD, regimenDeIsr: 'opcional_simplificado' })).toBe(true);
    expect(estaObligadaAContabilidadCompleta(SIMPLIFICADO)).toBe(false);
    expect(estaObligadaAContabilidadCompleta(PEQUENO)).toBe(false);
    expect(estaObligadaAContabilidadCompleta({ ...SIMPLIFICADO, llevaContabilidadCompleta: true })).toBe(true);
  });

  it('sin datos fiscales se supone obligada: el costo fiscal queda en cero', () => {
    const sinDatos = { tipoDePersona: null, regimenDeIva: null, regimenDeIsr: null, llevaContabilidadCompleta: null };

    expect(estaObligadaAContabilidadCompleta(sinDatos)).toBe(true);
  });
});

describe('costoFiscalDeControl', () => {
  const entrada = (datosFiscales: DatosFiscalesDeLaVenta, documentadoCentavos = 80000) => ({
    datosFiscales,
    documentadoCentavos,
    delContador: null,
  });

  it('A: quien lleva contabilidad completa vende con costo fiscal cero aunque haya documento', () => {
    expect(costoFiscalDeControl(entrada(SOCIEDAD))).toMatchObject({
      costoFiscalCentavos: 0,
      costoFiscal: { origen: 'en_libros', motivo: null },
    });
    expect(
      costoFiscalDeControl(entrada({ ...SOCIEDAD, regimenDeIsr: 'opcional_simplificado' })).costoFiscalCentavos,
    ).toBe(0);
  });

  it('B: quien no la lleva sostiene el costo documentado, en el simplificado y en el pequeño contribuyente', () => {
    for (const datos of [SIMPLIFICADO, PEQUENO])
      expect(costoFiscalDeControl(entrada(datos))).toMatchObject({
        costoFiscalCentavos: 80000,
        costoFiscal: { origen: 'documentado' },
      });
  });

  it('C: sin documento, cero', () => {
    expect(costoFiscalDeControl(entrada(SIMPLIFICADO, 0))).toMatchObject({
      costoFiscalCentavos: 0,
      costoFiscal: { origen: 'sin_documento' },
    });
    expect(costoFiscalDeControl(entrada(SIMPLIFICADO, -5000)).costoFiscalCentavos).toBe(0);
  });

  it('D: el contador escribe el costo con su motivo y queda lo que daba la regla', () => {
    const resultado = costoFiscalDeControl({
      ...entrada(SOCIEDAD),
      delContador: { montoCentavos: 80000, motivo: '  Factura 123 de Ferretería López  ' },
    });

    expect(resultado).toMatchObject({
      costoFiscalCentavos: 80000,
      costoFiscal: { origen: 'criterio_del_contador', motivo: 'Factura 123 de Ferretería López' },
      segunLaRegla: { costoFiscalCentavos: 0, origen: 'en_libros' },
    });
  });

  it('el costo del contador exige motivo y no puede ser negativo ni de motivo largo', () => {
    const con = (montoCentavos: number, motivo: string) => () =>
      costoFiscalDeControl({ ...entrada(SOCIEDAD), delContador: { montoCentavos, motivo } });

    expect(con(100, '  ')).toThrow(BajaInvalida);
    expect(con(-1, 'Factura')).toThrow(BajaInvalida);
    expect(con(100, 'x'.repeat(301))).toThrow(BajaInvalida);
    expect(con(0, 'Factura')).not.toThrow();
  });
});
